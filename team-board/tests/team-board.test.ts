import type { AgentInfo, On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { applyPlan, isDue, mergeCards, progressBar, REFRESH_EVERY_MS } from '../hooks/register'

const PLAN = [
  { content: 'Research', status: 'in_progress' as const },
  { content: 'Build', status: 'pending' as const },
  { content: 'Test', status: 'pending' as const },
]

test('a-whole-plan-replaces-the-old-one', () => {
  expect(applyPlan([], { items: PLAN })).toEqual(PLAN)
  expect(applyPlan([], { todos: [{ content: 'A', status: 'completed', activeForm: 'Doing A' }] })).toEqual([
    { content: 'A', status: 'completed' },
  ])
})

test('advance-done-and-start-move-the-plan', () => {
  const advanced = applyPlan(PLAN, { advance: true })
  expect(advanced.map(s => s.status)).toEqual(['completed', 'in_progress', 'pending'])

  const jumped = applyPlan(PLAN, { done: [1, 2], start: 3 })
  expect(jumped.map(s => s.status)).toEqual(['completed', 'completed', 'in_progress'])
})

test('progress-bar-fills-with-done-steps', () => {
  expect(progressBar(applyPlan(PLAN, { advance: true }), 3)).toBe('▰▱▱')
  expect(progressBar([], 3)).toBe('')
})

test('agents-become-cards-and-finished-ones-stay', () => {
  const agent = {
    id: 'a1',
    description: 'Research competitors',
    label: 'Research competitors',
    type: 'Explore',
    status: 'running',
    tokenCount: 12300,
    cost: { usd: 0.42 },
  } as unknown as AgentInfo

  const first = mergeCards([], [agent])
  expect(first[0]?.label).toBe('Research competitors')
  expect(first[0]?.usd).toBe(0.42)

  const kept = mergeCards([{ ...first[0]!, tools: 4, lastTool: 'Grep' }], [])
  expect(kept[0]?.tools).toBe(4)

  const done = mergeCards(kept, [{ ...agent, status: 'completed' } as AgentInfo])
  expect(done[0]?.status).toBe('completed')
  expect(done[0]?.tools).toBe(4)
})

function engine(on: On) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
}

test('command-opens-the-board', async ($, on) => {
  engine(on)

  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'team-board', args: '' } as never)

  expect(r.text).toContain('Team Board opened')
})

test('cards-use-the-task-not-the-made-up-name', () => {
  const agent = {
    id: 'a2',
    name: 'swift-otter',
    description: 'Count skills',
    label: 'swift-otter',
    type: 'Explore',
    status: 'running',
    tokenCount: 10,
  } as unknown as AgentInfo
  expect(mergeCards([], [agent])[0]?.label).toBe('Count skills')
})

test('agent-listing-is-throttled', () => {
  expect(isDue(5000, 4500)).toBe(false)
  expect(isDue(5000, 5000 - REFRESH_EVERY_MS)).toBe(true)
  expect(isDue(0, -Infinity)).toBe(true)
})
