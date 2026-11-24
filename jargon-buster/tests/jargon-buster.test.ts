import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { plainPrompt } from '../hooks/register'

test('no-args-asks-for-the-last-reply-in-plain-language', () => {
  const p = plainPrompt('')
  expect(p).toContain('Explain your last reply again in plain language')
  expect(p).toContain('do not run any tools')
  expect(p).not.toContain('—')
})

test('a-question-is-answered-on-its-own', () => {
  const p = plainPrompt('  what is an endpoint ')
  expect(p).toContain('what is an endpoint')
  expect(p).not.toContain('last reply')
})

function engine(on: On, sent: string[]) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('clock.sleep', () => ({ value: undefined }) as never)
  on('prompt.submit', (_, e) => {
    sent.push(e.text)

    return {} as never
  })
}

test('command-sends-one-plain-language-prompt', async ($, on) => {
  const sent: string[] = []
  engine(on, sent)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'jargon-buster', args: 'what is a cache' } as never)
  for (let i = 0; i < 50 && sent.length === 0; i++) await Promise.resolve()

  expect(r.text).toContain('what is a cache')
  expect(sent.length).toBe(1)
  expect(sent[0]).toContain('what is a cache')
})
