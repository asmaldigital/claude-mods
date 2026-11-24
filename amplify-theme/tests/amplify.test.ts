import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { fuelColor, parseLook, scene, statusLine, step, today } from '../hooks/register'
import { LOOKS } from '../hooks/scenes'

// Stand-ins for the engine beneath the plugin.
function engine(on: On, status: string[] = []) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.status', (_, e) => {
    status.push(JSON.stringify(e))

    return { value: undefined } as never
  })
  const stored = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)

    return { value: undefined }
  })
}

test('start-applies-amplify-colors', async ($, on) => {
  engine(on)
  const sets: string[] = []
  on('theme.set', (_, e) => {
    sets.push(JSON.stringify(e))

    return { value: { isDrawn: true, requestId: 't1' } }
  })

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })

  expect(sets.some(s => s.includes('"label":"Amplify"'))).toBe(true)
})

test('focus-toggles-and-remembers', async ($, on) => {
  engine(on)
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't2' } }))

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const first = await $.command.run({ command: 'amplify-focus' } as never)
  const second = await $.command.run({ command: 'amplify-focus' } as never)

  expect(first.text).toContain('Focus on')
  expect(second.text).toContain('Focus off')
})


test('five-moves-light-a-block-and-eight-blocks-level-up', () => {
  let m = { points: 0, lit: 0, level: 0, today: 0, day: '2026-11-18' }
  for (let i = 0; i < 5; i++) m = step(m, '2026-11-18').next
  expect(m.lit).toBe(1)
  expect(m.today).toBe(5)

  let ups = 0
  for (let i = 0; i < 35; i++) {
    const r = step(m, '2026-11-18')
    m = r.next
    if (r.isLevelUp) ups += 1
  }
  expect(m.lit).toBe(8)
  expect(m.level).toBe(1)
  expect(ups).toBe(1)

  m = step(m, '2026-11-19').next
  expect(m.today).toBe(1)
})

test('real-moves-update-the-status-line', async ($, on) => {
  const lines: string[] = []
  engine(on, lines)
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't3' } }))
  on('tool.call', () => ({ result: { stdout: 'hi', stderr: '', interrupted: false } }) as never)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  for (let i = 0; i < 5; i++) await $.tool.call({ tool: 'Bash', command: 'echo hi' } as never)

  expect(lines.some(l => l.includes('▮'))).toBe(true)
  expect(lines.some(l => l.includes('5 moves today'))).toBe(true)
})

const M = { points: 0, lit: 3, level: 1, today: 17, day: '2026-11-18' }

test('state-colors-change-with-what-claude-is-doing', () => {
  const base = { context: 40, limit: -1, warned: 0 }
  expect(scene(M, { ...base, mode: 'ready' })).toContain('YOUR MOVE')
  expect(scene(M, { ...base, mode: 'working' })).toContain('CLAUDE IS BUILDING')
  const asking = scene(M, { ...base, mode: 'needs-you' })
  expect(asking).toContain('NEEDS YOUR OK')
  expect(asking).toContain('class="beacon"')
  expect(scene(M, { ...base, mode: 'working' })).toContain('orbit spin')
  expect(scene(M, { ...base, mode: 'ready' }).length).toBeLessThan(131072)
})

test('fuel-ring-turns-amber-then-red', () => {
  expect(fuelColor(30)).toBe('#14B8A6')
  expect(fuelColor(65)).toBe('#EAB308')
  expect(fuelColor(85)).toBe('#E11D48')
})

test('status-line-says-mode-and-leaves-context-to-the-gauge', () => {
  const line = statusLine(M, { mode: 'needs-you', context: 34, limit: -1, warned: 0 })
  expect(line).toContain('NEEDS YOUR OK')
  expect(line).not.toContain('Context')
  expect(line).toContain('Lv 2')
})

test('context-reading-stays-out-of-the-status-line', async ($, on) => {
  const lines: string[] = []
  engine(on, lines)
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't4' } }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { window: 200000, tokens: 190000, percent: 95 },
    rateLimits: [],
    changed: ['context'],
  } as never)

  expect(lines.length > 0).toBe(true)
  expect(lines.some(l => l.includes('Context'))).toBe(false)
})

test('today-uses-the-local-clock', () => {
  const late = new Date(2026, 10, 18, 23, 30)
  expect(today(late)).toBe('2026-11-18')
})

test('scene-holds-still-for-reduced-motion', () => {
  const svg = scene(M, { mode: 'working', context: 40, limit: -1, warned: 0 })
  expect(svg).toContain('prefers-reduced-motion: reduce')
})

test('a-subagent-call-does-not-relight-the-core', async ($, on) => {
  const lines: string[] = []
  engine(on, lines)
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 't5' } }))
  on('tool.call', () => ({ result: { stdout: 'hi', stderr: '', interrupted: false } }) as never)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'echo hi', agentId: 'sub1' } as never)

  expect(lines.some(l => l.includes('CLAUDE IS BUILDING'))).toBe(false)
})

const SM = { points: 0, lit: 3, level: 1, today: 9, day: '2026-11-18' }
const LV = { mode: 'working' as const, context: 42, limit: 20, warned: 0 }

test('look-names-numbers-and-words-pick-a-backdrop', () => {
  expect(parseLook('dubai')).toBe('dubai')
  expect(parseLook(' 3 ')).toBe('mission')
  expect(parseLook('Dunes')).toBe('dunes')
  expect(parseLook('skyline')).toBe('dubai')
  expect(parseLook('')).toBe(undefined)
  expect(parseLook('nowhere')).toBe(undefined)
})

test('every-backdrop-stays-vector-and-under-the-size-limit', () => {
  for (const look of LOOKS) {
    for (const party of [0, 1]) {
      const svg = scene(SM, LV, { look, party })
      expect(svg.length < 131072).toBe(true)
      expect(svg.includes('<image')).toBe(false)
      expect(svg.includes('<script')).toBe(false)
    }
  }
})

test('fireworks-show-only-during-a-celebration', () => {
  expect(scene(SM, LV, { look: 'dubai', party: 0 }).includes('id="celebration"')).toBe(false)
  expect(scene(SM, LV, { look: 'dubai', party: 5 }).includes('id="celebration"')).toBe(true)
  expect(scene(SM, LV, { look: 'core', party: 5 }).includes('id="celebration"')).toBe(true)
})

test('art-scenes-follow-the-mode-color', () => {
  expect(scene(SM, LV, { look: 'mission', party: 0 }).includes('--mode: #06B6D4')).toBe(true)
  const asking = scene(SM, { ...LV, mode: 'needs-you' }, { look: 'mission', party: 0 })
  expect(asking.includes('--mode: #FF6B35')).toBe(true)
})
