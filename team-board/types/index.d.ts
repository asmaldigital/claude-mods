export type StepStatus = 'pending' | 'in_progress' | 'completed'

export type Step = { content: string; status: StepStatus }

export type Card = {
  id: string
  label: string
  type: string
  status: string
  color: string
  tools: number
  lastTool: string
  tokens: number
  /** Estimated cost in US dollars, or -1 when the app has no figure. */
  usd: number
}

export type Board = { plan: Step[]; cards: Card[] }

declare module 'claude-code' {
  interface PluginState {
    'team-board': { board: Shaped<Board> }
  }
}
