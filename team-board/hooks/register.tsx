import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { Board, Card, Step, StepStatus } from '../types'

// Team Board. Watches the plan and the subagents and draws them. No AI, so no tokens.

const PANE = 'team-board'
const EMPTY: Board = { plan: [], cards: [] }

const board = atom({ plugin: 'team-board', key: 'board' } as const, EMPTY, { shape: 'board-1' })

// Each subagent gets its own color, in turn.
const PALETTE = ['#06B6D4', '#14B8A6', '#FF6B35', '#EAB308', '#8B5CF6', '#3B82F6']

const PLAN_TOOLS = new Set(['TodoWrite', 'mcp__ccd_turn__update_plan'])

function isStatus(value: unknown): value is StepStatus {
  return value === 'pending' || value === 'in_progress' || value === 'completed'
}

function steps(list: unknown): Step[] | undefined {
  if (!Array.isArray(list)) return undefined

  return list.flatMap(item => {
    const it = item as { content?: unknown; status?: unknown }
    return typeof it?.content === 'string' && isStatus(it.status) ? [{ content: it.content, status: it.status }] : []
  })
}

/** Applies one plan update (a whole list, or advance, done and start) to the plan. */
export function applyPlan(plan: readonly Step[], input: unknown): Step[] {
  const i = (input ?? {}) as { todos?: unknown; items?: unknown; advance?: unknown; done?: unknown; start?: unknown }
  const whole = steps(i.todos) ?? steps(i.items)
  if (whole !== undefined) return whole

  let next = plan.map(s => ({ ...s }))

  if (i.advance === true) {
    const at = next.findIndex(s => s.status === 'in_progress')
    if (at >= 0) next[at] = { ...next[at]!, status: 'completed' }
    const after = next.findIndex(s => s.status === 'pending')
    if (after >= 0) next[after] = { ...next[after]!, status: 'in_progress' }
  }

  if (Array.isArray(i.done)) {
    for (const n of i.done) {
      if (typeof n === 'number' && next[n - 1] !== undefined) next[n - 1] = { ...next[n - 1]!, status: 'completed' }
    }
  }

  if (typeof i.start === 'number' && next[i.start - 1] !== undefined) {
    next = next.map(s => (s.status === 'in_progress' ? { ...s, status: 'pending' } : s))
    next[i.start - 1] = { ...next[i.start - 1]!, status: 'in_progress' }
  }

  return next
}

export function progressBar(plan: readonly Step[], width = 10): string {
  if (plan.length === 0) return ''
  const done = plan.filter(s => s.status === 'completed').length
  const filled = Math.round((done / plan.length) * width)

  return `${'▰'.repeat(filled)}${'▱'.repeat(width - filled)}`
}

function isLive(status: string): boolean {
  return status === 'running' || status === 'pending' || status === 'waiting'
}

/** Merges the app's agent list into the cards, keeping finished agents on the board. */
export function mergeCards(cards: readonly Card[], agents: readonly AgentInfo[]): Card[] {
  const byId = new Map(cards.map(c => [c.id, c]))
  let fresh = cards.length

  for (const a of agents) {
    const had = byId.get(a.id)
    byId.set(a.id, {
      id: a.id,
      // The task it was given reads better than the name the app makes up for it.
      label: a.description || a.name || a.label,
      type: a.type,
      status: a.status,
      color: had?.color ?? PALETTE[fresh++ % PALETTE.length]!,
      tools: had?.tools ?? 0,
      lastTool: had?.lastTool ?? '',
      tokens: a.tokenCount,
      usd: a.cost?.usd ?? had?.usd ?? -1,
    })
  }

  return [...byId.values()]
}

function money(usd: number): string {
  return usd < 0 ? '' : `~$${usd < 1 ? usd.toFixed(3) : usd.toFixed(2)}`
}

function tokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// At most one agent listing a second, however many calls the agents make.
export const REFRESH_EVERY_MS = 1000
let lastRefresh = -Infinity

/** Whether enough time has passed since the last listing. */
export function isDue(now: number, last: number): boolean {
  return now - last >= REFRESH_EVERY_MS
}

async function refresh($: EngineInterface, isForced = false) {
  const now = await $.clock.now()
  if (!isForced && !isDue(now, lastRefresh)) return
  lastRefresh = now
  const agents = await $.agent.list()
  await update($, board, b => ({ ...b, cards: mergeCards(b.cards, agents) }))
}

async function quietly(work: () => Promise<unknown>) {
  try {
    await work()
  } catch {
    // The board never gets in the way of the work.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'team-board', description: 'Open the Team Board: your plan and every subagent, live' })
    } catch (error) {
      $.ui.toast(`Team Board: /team-board not added. ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'team-board' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Team Board' })

    return {
      text: opened.isPlaced ? 'Team Board opened.' : 'Team Board is ready; this view has no side panel.',
      isTextDisplayOnly: true,
    }
  })

  // A new subagent: add its card and open the board the first time.
  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)

    await quietly(async () => {
      const hadCards = (await read($, board)).cards.length > 0
      await refresh($, true)
      if (!hadCards) await $.ui.open({ id: PANE, title: 'Team Board' })
    })

    return spawned
  }).catch(($, e, next) => next(e))

  // Plan updates from the main chat, and tool counts per subagent.
  // All of it happens after the call has run and off its path, so no call waits on the board.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const isOk = ran.deny === undefined && ran.isError !== true

    if (e.agentId === undefined && PLAN_TOOLS.has(e.tool) && isOk) {
      void quietly(() => update($, board, b => ({ ...b, plan: applyPlan(b.plan, e) })))
    }

    if (e.agentId !== undefined) {
      const id = e.agentId
      void quietly(async () => {
        await refresh($)
        await update($, board, b => ({
          ...b,
          cards: b.cards.map(c => (c.id === id ? { ...c, tools: c.tools + 1, lastTool: e.tool } : c)),
        }))
      })
    }

    return ran
  }).catch(($, e, next) => next(e))

  // After /clear the same process carries on as a new chat: start the board empty.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await quietly(() => update($, board, () => EMPTY))

    return next(e)
  }).catch(($, e, next) => next(e))

  // A subagent finished, or the main reply did: bring the cards up to date.
  on('turn.complete', async ($, e, next) => {
    await quietly(() => refresh($, true))

    return next(e)
  }).catch(($, e, next) => next(e))

  // A new request after a finished plan clears it from the band.
  on('prompt.submit', async ($, e, next) => {
    await quietly(() =>
      update($, board, b =>
        b.plan.length > 0 && b.plan.every(s => s.status === 'completed') ? { ...b, plan: [] } : b,
      ),
    )

    return next(e)
  }).catch(($, e, next) => next(e))

  // The band above the message box.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const b = await read($, board)
    const running = b.cards.filter(c => isLive(c.status)).length
    const isPlanOpen = b.plan.some(s => s.status !== 'completed')

    if (!isPlanOpen && running === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const done = b.plan.filter(s => s.status === 'completed').length
    const now = b.plan.find(s => s.status === 'in_progress')

    return (
      <Box>
        {b.plan.length > 0 && (
          <Text color="#06B6D4" bold>
            {progressBar(b.plan)} {done}/{b.plan.length}{' '}
          </Text>
        )}
        {now !== undefined && <Text>Now: {now.content} </Text>}
        {running > 0 && (
          <Text color="#FF6B35" bold>
            {' '}
            {running} {running === 1 ? 'agent' : 'agents'} working{' '}
          </Text>
        )}
        {b.cards.length > 0 && (
          <Button key="open" label="Team Board" onPress={() => $.ui.open({ id: PANE, title: 'Team Board' })} />
        )}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // The side panel: the plan, then one card per subagent.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const b = await read($, board)
    let total = -1

    try {
      total = (await $.session.usage()).cost?.usd ?? -1
    } catch {
      total = -1
    }

    const mark = (s: Step) => (s.status === 'completed' ? '✓' : s.status === 'in_progress' ? '▸' : '○')

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text weight="bold" size="heading">
            Plan {b.plan.length > 0 ? `${progressBar(b.plan)} ${b.plan.filter(s => s.status === 'completed').length}/${b.plan.length}` : ''}
          </Text>
          {b.plan.length === 0 && <Text dimColor>No plan yet.</Text>}
          {b.plan.map(s => (
            <Text dimColor={s.status === 'completed'} bold={s.status === 'in_progress'}>
              {mark(s)} {s.content}
            </Text>
          ))}
        </Box>

        <Text weight="bold" size="heading">
          Agents ({b.cards.length})
        </Text>
        {b.cards.length === 0 && <Text dimColor>No subagents in this chat yet.</Text>}
        {[...b.cards].reverse().map(c => (
          <Box key={c.id} flexDirection="column" borderStyle="round" borderColor={c.color} paddingX={1}>
            <Text color={c.color} bold>
              {c.label}
            </Text>
            <Text dimColor>
              {c.type} · {isLive(c.status) ? 'working' : c.status}
            </Text>
            <Text>
              {c.tools} tool calls{c.lastTool !== '' ? ` · last: ${c.lastTool}` : ''}
            </Text>
            <Text dimColor>
              {tokens(c.tokens)} tokens {money(c.usd)}
            </Text>
          </Box>
        ))}

        {total >= 0 && <Text dimColor>Whole chat so far: {money(total)} (an estimate, not the bill)</Text>}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
