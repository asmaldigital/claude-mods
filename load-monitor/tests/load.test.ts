import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { bar, color, cpuPercent, gpuPercent, isSpike, parsePs, ramPercent, topProcess } from '../hooks/register'
import { isDefaultOn, MAX_FAILURES } from '../hooks/register'

const PS = ` 35.8  4.4 /Applications/Claude.app/Contents/Frameworks/Claude Helper (Renderer).app/Contents/MacOS/Claude Helper (Renderer)
 20.6  0.4 /System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer
 18.9  0.0 /usr/sbin/securityd
  0.0  0.1 /sbin/launchd`

const VM = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                     3689.
Pages active:                                 181223.
Pages inactive:                               171540.
Pages wired down:                             319740.
Pages occupied by compressor:                 489252.`

test('ps-lines-become-processes', () => {
  const procs = parsePs(PS)
  expect(procs.length).toBe(4)
  expect(procs[0]?.name).toBe('Claude Helper (Renderer)')
  expect(topProcess(procs)?.cpu).toBe(35.8)
  expect(cpuPercent(procs, 11)).toBe(7)
  expect(cpuPercent(procs, 0)).toBe(-1)
})

test('vm-stat-becomes-ram-use', () => {
  expect(ramPercent(VM, 19327352832)).toBe(84)
  expect(ramPercent('nothing here', 19327352832)).toBe(-1)
})

test('ioreg-becomes-gpu-use', () => {
  expect(gpuPercent('"PerformanceStatistics" = {"Device Utilization %"=48,"Renderer Utilization %"=40}')).toBe(48)
  expect(gpuPercent('')).toBe(-1)
})

test('spikes-colors-and-bars', () => {
  expect(isSpike(20, 70)).toBe(true)
  expect(isSpike(50, 70)).toBe(false)
  expect(isSpike(-1, 90)).toBe(true)
  expect(isSpike(10, -1)).toBe(false)
  expect(color(30)).toBe('#14B8A6')
  expect(color(70)).toBe('#EAB308')
  expect(color(90)).toBe('#E11D48')
  expect(bar(50, 4)).toBe('▰▰▱▱')
  expect(bar(-1, 4)).toBe('----')
})

function engine(on: On) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never)
  on('clock.every', () => ({ value: undefined }) as never)
  // As if the person had turned Load on before: the test machine is not a local Mac.
  const stored = new Map<string, unknown>([['on', true]])
  on('store.get', (_, e) => ({ value: stored.get(e.key) }))
  on('store.set', (_, e) => {
    stored.set(e.key, e.value)

    return { value: undefined }
  })
}

test('load-command-hides-and-shows', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const off = await $.command.run({ command: 'load', args: '' } as never)
  const back = await $.command.run({ command: 'load', args: '' } as never)

  expect(off.text).toContain('Load is off')
  expect(back.text).toContain('Load is on')
})

test('on-by-default-only-on-a-local-mac', () => {
  expect(isDefaultOn({ platform: 'macos', isHosted: false })).toBe(true)
  expect(isDefaultOn({ platform: 'macos' })).toBe(true)
  expect(isDefaultOn({ platform: 'macos', isHosted: true })).toBe(false)
  expect(isDefaultOn({ platform: 'linux' })).toBe(false)
  expect(isDefaultOn({ platform: 'windows' })).toBe(false)
  expect(MAX_FAILURES).toBe(3)
})
