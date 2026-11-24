import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { blankDeep, namePattern, redact, redactDeep, standIn, workspaceName } from '../hooks/register'

// Made-up names only.
const NAMES = ['zephyr plumbing', 'quillon holdings', 'brightmere dental', 'zoe muller', "o'brien & sons"]

const noDigits = (text: string) => !/\d/.test(text)

test('hides-emails-phones-and-keys', () => {
  const out = redact(
    'Email jane@example.com or call +1 555 0123 4567. Key sk-ant-abcdefghijklmnop123. AIzaSyA1234567890abcdefghijklmnopqrstu github_pat_11ABCDEFG0123456789_abcdefghij xoxb-123456789012-abcdefghij Bearer abcdefghijklmnop12345 password: hunter2secret postgres://user:pa55word@db.example.com',
    [],
  )
  for (const leak of ['jane@example.com', '0123 4567', 'abcdefghijklmnop', 'AIzaSy', 'github_pat', 'xoxb-', 'hunter2', 'pa55word', 'user:']) {
    expect(out).not.toContain(leak)
  }
})

test('hides-amounts-in-any-grouping', () => {
  for (const amount of [
    'R 1 250 000',
    'AED 45 000',
    '€1.250.000',
    '1 250 000 rand',
    '$1.2 million',
    '100€',
    'CHF 4,000',
    'Rs. 5000',
    '0.5 BTC',
    '40k',
    '~15k MRR',
    'salary 85000',
    'fee: 12,500',
  ].map(a => redact(`The deal is ${a} today`, [])).filter(o => !noDigits(o))) {
    expect(amount).toBe('')
  }
})

test('hides-client-names-in-many-forms', () => {
  const text =
    "Zephyr Plumbing, zephyr-plumbing, **Zephyr** Plumbing, Zephyr&nbsp;Plumbing, zephyr%20plumbing, Zoë Müller, O'Brien and Sons, brand/client--quillon-holdings/notes.md"
  const out = redact(text, NAMES).toLowerCase()
  for (const leak of ['zephyr', 'muller', 'brien', 'quillon']) expect(out).not.toContain(leak)
  expect(namePattern('ab')).toBe(undefined)
})

test('keeps-ordinary-words-and-dates', () => {
  const text = 'Version 2.1.326 shipped on 2026-11-18 with 8 tests passing.'
  expect(redact(text, NAMES)).toBe(text)
})

test('long-text-is-hidden-whole-and-fast', () => {
  const blob = 'a.'.repeat(60_000)
  const started = Date.now()
  expect(redact(blob, NAMES)).toContain('hidden while screen share is on')
  const nearLimit = `${'ab.'.repeat(16_000)}@x`
  redact(nearLimit, NAMES)
  expect(Date.now() - started).toBeLessThan(1500)
})

test('workspace-folders-become-names', () => {
  expect(workspaceName('client--zephyr-plumbing')).toBe('zephyr plumbing')
  expect(workspaceName('biz--example-studio')).toBe('example studio')
  expect(workspaceName('_default')).toBe(undefined)
})

test('tool-output-keeps-its-shape', () => {
  const out = redactDeep({ stdout: 'mail jane@example.com', stderr: '', interrupted: false, n: 3 }, []) as {
    stdout: string
    interrupted: boolean
    n: number
  }
  expect(out.stdout).toBe('mail █████')
  expect(out.interrupted).toBe(false)
  expect(out.n).toBe(3)
  expect(blankDeep({ a: 'secret', b: '', c: 2 })).toEqual({ a: '█████', b: '', c: 2 })
})

test('fake-mode-gives-each-client-the-same-made-up-name', () => {
  const out = redact(
    'Zephyr Plumbing called. Later zephyr-plumbing paid $12,500. Email jane@example.com, call +1 555 0123 4567.',
    NAMES,
    'fake',
  )
  expect(out.toLowerCase()).not.toContain('zephyr')
  expect(out).not.toContain('12,500')
  expect(out).not.toContain('jane@')
  expect(out).not.toContain('█')
  const fake = standIn('name', 'zephyr plumbing', 'fake')
  expect(out.split(fake).length - 1).toBe(2)
  expect(out).toContain('@example.com')
})

test('fake-mode-still-bars-keys', () => {
  expect(redact('key sk-ant-abcdefghijklmnop123', [], 'fake')).toContain('█████')
})

function engine(on: On) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.status', () => ({ value: undefined }) as never)
  on('fs.list', () => ({ value: [{ name: 'client--zephyr-plumbing', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }) as never)
  const stored = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)

    return { value: undefined }
  })
}

test('commands-turn-it-on-and-off-without-showing-names', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const short = await $.command.run({ command: 'screen-share', args: 'add Al' } as never)
  const added = await $.command.run({ command: 'screen-share', args: 'add Quillon Holdings' } as never)
  const offList = await $.command.run({ command: 'screen-share', args: 'list' } as never)
  const first = await $.command.run({ command: 'screen-share', args: '' } as never)
  const onList = await $.command.run({ command: 'screen-share', args: 'list' } as never)
  const fake = await $.command.run({ command: 'screen-share', args: 'fake' } as never)
  const second = await $.command.run({ command: 'screen-share', args: '' } as never)

  expect(short.text).toContain('too short')
  expect(added.text).not.toContain('Quillon')
  expect(offList.text).toContain('zephyr plumbing')
  expect(offList.text).toContain('Quillon Holdings')
  expect(first.text).toContain('ON')
  expect(onList.text).not.toContain('zephyr')
  expect(fake.text).toContain('made-up')
  expect(second.text).toContain('OFF')
})

test('made-up-details-are-the-default-and-bars-are-remembered', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const first = await $.command.run({ command: 'screen-share', args: '' } as never)
  const bars = await $.command.run({ command: 'screen-share', args: 'bars' } as never)
  await $.command.run({ command: 'screen-share', args: '' } as never)
  const again = await $.command.run({ command: 'screen-share', args: '' } as never)

  expect(first.text).toContain('made-up')
  expect(bars.text).toContain('grey bars')
  expect(again.text).toContain('grey bars')
})
