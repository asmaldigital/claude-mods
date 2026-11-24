import type { On, SessionMessage } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { buildHandoff, isOffered, replayPlan, scrub, tidy } from '../hooks/register'

const CHAT = [
  { role: 'user', text: 'Build me a theme for my community call', toolUses: [] },
  { role: 'user', text: '<system-reminder>ignore me</system-reminder>', toolUses: [] },
  { role: 'user', text: 'Base directory for this skill: /x/skill', toolUses: [] },
  {
    role: 'assistant',
    text: 'Starting.',
    toolUses: [
      { tool: 'mcp__ccd_turn__update_plan', input: { items: [
        { content: 'Design', status: 'in_progress' },
        { content: 'Build', status: 'pending' },
      ] } },
      { tool: 'Read', input: { file_path: '/a/brand.md' } },
      { tool: 'Skill', input: { skill: 'plugin-authoring' } },
      { tool: 'Write', input: { file_path: '/a/register.tsx' } },
      { tool: 'NotebookEdit', input: { notebook_path: '/a/analysis.ipynb' } },
      { tool: 'Bash', input: { command: 'claude plugin test .', description: 'Run the mod tests' } },
      { tool: 'Bash', input: { command: 'curl -H "Authorization: Bearer abcdefghijklmnopqrstuvwxyz" https://x.test' } },
      { tool: 'mcp__ccd_turn__update_plan', input: { advance: true } },
    ],
  },
  { role: 'user', text: 'Now add screen share mode, see https://youtu.be/abc?si=TOKEN123', toolUses: [] },
  { role: 'assistant', text: 'Screen share mode is built. Key sk-ant-abcdefghijklmnop123 is set.', toolUses: [] },
] as unknown as SessionMessage[]

test('plan-replays-to-where-it-stands', () => {
  const plan = replayPlan([
    { items: [{ content: 'A', status: 'in_progress' }, { content: 'B', status: 'pending' }] },
    { advance: true },
  ])
  expect(plan.map(s => s.status)).toEqual(['completed', 'in_progress'])
})

test('handoff-holds-goal-plan-files-skills-links-and-last-reply', () => {
  const text = buildHandoff(CHAT, '/a')
  expect(text).toContain('Build me a theme for my community call')
  expect(text).toContain('Now add screen share mode')
  expect(text).not.toContain('ignore me')
  expect(text).not.toContain('Base directory')
  expect(text).toContain('[x] Design')
  expect(text).toContain('[>] Build')
  expect(text).toContain('/a/register.tsx')
  expect(text).toContain('/a/analysis.ipynb')
  expect(text).toContain('/a/brand.md')
  expect(text).toContain('plugin-authoring')
  expect(text).toContain('Run the mod tests')
  expect(text).toContain('> - https://youtu.be/abc')
  expect(text).toContain('> Screen share mode is built.')
  expect(text).toContain('Earlier reply, for context only')
})

test('handoff-carries-no-secrets-or-raw-commands', () => {
  const text = buildHandoff(CHAT, '/a')
  expect(text).not.toContain('abcdefghijklmnop')
  expect(text).not.toContain('Bearer')
  expect(text).not.toContain('curl')
  expect(text).not.toContain('TOKEN123')
  expect(text).toContain('[secret removed]')
})

test('scrubber-takes-out-keys-passwords-and-url-logins', () => {
  const out = scrub(
    'db postgres://admin:pa55word@db.example.com/app password: hunter22 github_pat_abcdefghijklmnopqrstuv1234 see https://example.com/x?token=abc#frag',
  )
  expect(out).not.toContain('pa55word')
  expect(out).not.toContain('admin:')
  expect(out).not.toContain('hunter22')
  expect(out).not.toContain('github_pat_')
  expect(out).not.toContain('token=abc')
  expect(out).toContain('https://example.com/x')
})

test('offered-only-in-the-same-folder-while-fresh', () => {
  const saved = { cwd: '/a', sessionId: 's1', at: 1000, text: 'x' }
  expect(isOffered(saved, '/a', 's2', 2000)).toBe(true)
  expect(isOffered(saved, '/a', 's1', 2000)).toBe(false)
  expect(isOffered(saved, '/b', 's2', 2000)).toBe(false)
  expect(isOffered(saved, '/a', 's2', 1000 + 49 * 3600 * 1000)).toBe(false)
  expect(isOffered(undefined, '/a', 's2', 2000)).toBe(false)
  // After /clear the same session may pick up its own handoff, but still only in its folder.
  expect(isOffered(saved, '/a', undefined, 2000)).toBe(true)
  expect(isOffered(saved, '/b', undefined, 2000)).toBe(false)
})

test('store-keeps-one-fresh-handoff-per-folder', () => {
  const now = 100 * 3600 * 1000
  const shelf = tidy(
    {
      '/a': { cwd: '/a', sessionId: 's1', at: now - 1000, text: 'a' },
      '/b': { cwd: '/b', sessionId: 's2', at: now - 1000, text: 'b' },
      '/old': { cwd: '/old', sessionId: 's3', at: now - 49 * 3600 * 1000, text: 'old' },
      '/bad': { nope: true },
    },
    now,
  )
  expect(Object.keys(shelf).sort()).toEqual(['/a', '/b'])
  expect(tidy('not a shelf', now)).toEqual({})
})

function engine(on: On, stored: Map<string, unknown>) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.copy', () => ({ value: { isCopied: true } }) as never)
  on('session.messages', () => ({ value: CHAT }) as never)
  on('session.cwd', () => ({ value: '/a' }) as never)
  on('session.id', () => ({ value: 's1' }) as never)
  on('clock.now', () => ({ value: 5000 }) as never)
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)

    return { value: undefined }
  })
  on('store.delete', (_, e) => {
    stored.delete(e.key)

    return { value: undefined }
  })
}

test('command-prepares-copies-and-files-the-handoff-by-folder', async ($, on) => {
  const stored = new Map<string, unknown>()
  stored.set('handoffs', { '/b': { cwd: '/b', sessionId: 's9', at: 4000, text: 'other project' } })
  engine(on, stored)

  await $.session.start({ cwd: '/a', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'handoff', args: '' } as never)

  expect(r.text).toContain('copied to your clipboard')
  expect(r.text).toContain('[>] Build')
  const shelf = stored.get('handoffs') as Record<string, { text: string }>
  expect(Object.keys(shelf).sort()).toEqual(['/a', '/b'])
  expect(shelf['/b']?.text).toBe('other project')
})
