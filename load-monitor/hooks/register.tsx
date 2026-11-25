import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Load } from '../types'

// Load. Live CPU, RAM and GPU bars for this Mac above the message box.
// It runs small system commands every few seconds. No AI, so no tokens.

const EVERY_MS = 4000
const ON_KEY = 'on'

const TEAL = '#14B8A6'
const AMBER = '#EAB308'
const RED = '#E11D48'

const IDLE: Load = { isOn: false, cpu: -1, ram: -1, gpu: -1, spike: '' }

const load = atom({ plugin: 'load-monitor', key: 'load' } as const, IDLE, { shape: 'load-1' })

// ---------------------------------------------------------------- parsing (pure)

export type Proc = { cpu: number; name: string }

/** `ps -A -o %cpu=,%mem=,comm=`: one process a line. */
export function parsePs(out: string): Proc[] {
  return out.split('\n').flatMap(line => {
    const m = /^\s*([\d.]+)\s+[\d.]+\s+(.+?)\s*$/.exec(line)
    if (m === null) return []
    const path = m[2]!
    const name = path.split('/').pop() ?? path

    return [{ cpu: Number(m[1]), name }]
  })
}

/** Whole-machine CPU use: ps counts each core as 100%, so divide by the cores. */
export function cpuPercent(procs: readonly Proc[], cores: number): number {
  if (cores <= 0) return -1
  const total = procs.reduce((sum, p) => sum + p.cpu, 0)

  return Math.min(100, Math.round(total / cores))
}

export function topProcess(procs: readonly Proc[]): Proc | undefined {
  return [...procs].sort((a, b) => b.cpu - a.cpu)[0]
}

/** `vm_stat`: memory in use is active, wired and compressed pages over all memory. */
export function ramPercent(vmStat: string, totalBytes: number): number {
  const page = Number(/page size of (\d+) bytes/.exec(vmStat)?.[1] ?? NaN)
  const pages = (label: string) => Number(new RegExp(`${label}:\\s+(\\d+)`).exec(vmStat)?.[1] ?? 0)
  const used = pages('Pages active') + pages('Pages wired down') + pages('Pages occupied by compressor')

  if (!Number.isFinite(page) || totalBytes <= 0 || used === 0) return -1

  return Math.min(100, Math.round(((used * page) / totalBytes) * 100))
}

/** `ioreg -r -d 1 -c IOAccelerator`: the GPU's own "Device Utilization %". */
export function gpuPercent(ioreg: string): number {
  const all = [...ioreg.matchAll(/"Device Utilization %"\s*=\s*(\d+)/g)].map(m => Number(m[1]))

  return all.length === 0 ? -1 : Math.min(100, Math.max(...all))
}

/** A spike: CPU jumps by 25 points or more to 60% or more, or sits at 85% or more. */
export function isSpike(before: number, now: number): boolean {
  if (now < 0) return false

  return now >= 85 || (before >= 0 && now - before >= 25 && now >= 60)
}

export function color(percent: number): string {
  if (percent >= 85) return RED
  if (percent >= 60) return AMBER
  return TEAL
}

export function bar(percent: number, width = 8): string {
  if (percent < 0) return '-'.repeat(width)
  const filled = Math.round((percent / 100) * width)

  return `${'▰'.repeat(filled)}${'▱'.repeat(width - filled)}`
}

// ---------------------------------------------------------------- reading the Mac

let cores = 0
let memory = 0
let timer: Timer | undefined
let isBusy = false
let isCollapsed = false
let failures = 0

// Full paths, so a program of the same name earlier on PATH is never run instead.
const PS = '/bin/ps'
const VM_STAT = '/usr/bin/vm_stat'
const IOREG = '/usr/sbin/ioreg'
const SYSCTL = '/usr/sbin/sysctl'

// After this many readings in a row with nothing to show, Load stops asking.
export const MAX_FAILURES = 3

async function run($: EngineInterface, argv: readonly string[]): Promise<string> {
  try {
    const r = await $.process.run(argv, { timeoutMs: 3000 })
    return r.exitCode === 0 ? r.stdout : ''
  } catch {
    return ''
  }
}

async function sizeUp($: EngineInterface) {
  if (cores > 0 && memory > 0) return
  const out = (await run($, [SYSCTL, '-n', 'hw.ncpu', 'hw.memsize'])).trim().split(/\s+/)
  cores = Number(out[0] ?? 0) || 0
  memory = Number(out[1] ?? 0) || 0
}

async function poll($: EngineInterface) {
  // Nothing on screen while the band is collapsed, so nothing to read.
  if (isBusy || isCollapsed) return
  isBusy = true

  try {
    await sizeUp($)
    const [ps, vm, gpu] = await Promise.all([
      run($, [PS, '-A', '-o', '%cpu=,%mem=,comm=']),
      run($, [VM_STAT]),
      run($, [IOREG, '-r', '-d', '1', '-c', 'IOAccelerator']),
    ])
    if (ps.trim() === '' && vm.trim() === '') {
      failures += 1
      if (failures >= MAX_FAILURES) {
        stop()
        await update($, load, l => ({ ...l, isOn: false, spike: '' }))
        $.ui.toast('Load stopped: this computer does not report CPU and memory the way Load reads them. Type /load to try again.')
      }
      return
    }
    failures = 0

    const procs = parsePs(ps)
    const cpu = procs.length > 0 ? cpuPercent(procs, cores) : -1
    const before = (await read($, load)).cpu
    const top = topProcess(procs)
    const spike = isSpike(before, cpu) && top !== undefined ? `CPU spike: ${top.name} is using ${Math.round(top.cpu)}% of a core` : ''

    await update($, load, l => ({
      ...l,
      cpu,
      ram: ramPercent(vm, memory),
      gpu: gpuPercent(gpu),
      spike: spike !== '' ? spike : cpu >= 0 && cpu < 60 ? '' : l.spike,
    }))
  } catch {
    // A missed reading never gets in the way of the chat.
  } finally {
    isBusy = false
  }
}

function start($: EngineInterface) {
  if (timer !== undefined) return
  failures = 0
  void poll($)
  timer = $.clock.every(EVERY_MS, () => void poll($))
}

function stop() {
  timer?.cancel()
  timer = undefined
}

async function setOn($: EngineInterface, isOn: boolean) {
  await $.store.set(ON_KEY, isOn)
  await update($, load, l => ({ ...l, isOn, spike: isOn ? l.spike : '' }))
  if (isOn) start($)
  else stop()
}

/** Whether this session runs on the person's own Mac, where the readings mean something. */
export function isDefaultOn(info: { platform?: string; isHosted?: boolean }): boolean {
  return info.platform === 'macos' && info.isHosted !== true
}

async function isLocalMac($: EngineInterface): Promise<boolean> {
  try {
    return isDefaultOn(await $.session.info())
  } catch {
    return false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      // Shown by default on a Mac you sit at; /load or Hide turns it off, remembered across chats.
      const saved = await $.store.get(ON_KEY)
      const isOn = typeof saved === 'boolean' ? saved : await isLocalMac($)
      await update($, load, l => ({ ...l, isOn }))
      if (isOn) start($)

      await $.command.register({ name: 'load', description: 'Show or hide live CPU, RAM and GPU bars for this Mac' })
    } catch (error) {
      $.ui.toast(`Load did not start: ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'load' }, async $ => {
    try {
      const isOn = !(await read($, load)).isOn
      await setOn($, isOn)

      return {
        text: isOn ? 'Load is on: CPU, RAM and GPU bars above the message box.' : 'Load is off. Type /load to bring it back.',
        isTextDisplayOnly: true,
      }
    } catch (error) {
      return { text: `Load: ${String(error)}`, isTextDisplayOnly: true }
    }
  })

  // The chat is over: stop the timer. A /clear keeps the same chat going, so the bars keep running.
  on('session.end', ($, e, next) => {
    if (e.reason !== 'clear') stop()

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isCollapsed = e.props.isCollapsed
    const l = await read($, load)
    if (!l.isOn || e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const gauge = (label: string, percent: number) => (
      <Text color={percent < 0 ? 'text-muted' : color(percent)}>
        {label} {bar(percent)} {percent < 0 ? 'n/a' : `${percent}%`}{'  '}
      </Text>
    )

    return (
      <Box flexDirection="column">
        <Box>
          {gauge('CPU', l.cpu)}
          {gauge('RAM', l.ram)}
          {gauge('GPU', l.gpu)}
          <Button key="hide" label="Hide" onPress={() => setOn($, false)} />
        </Box>
        {l.spike !== '' && (
          <Text color={RED} bold>
            {l.spike}
          </Text>
        )}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
