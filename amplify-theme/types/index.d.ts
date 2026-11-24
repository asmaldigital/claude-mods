export type Momentum = {
  /** Points toward the next lit block. */
  points: number
  /** Blocks lit in the tower, 0 to 8. */
  lit: number
  /** Levels completed. */
  level: number
  /** Moves made today, and which day that is. */
  today: number
  day: string
}

/** What Claude is doing right now: your move, building, or waiting on you. */
export type Mode = 'ready' | 'working' | 'needs-you'

export type Live = {
  mode: Mode
  /** Context window fill, 0 to 100, or -1 before the first reading. */
  context: number
  /** The fullest usage-limit window, 0 to 100, or -1 when none is reported. */
  limit: number
  /** The highest context warning already shown this session: 0, 70 or 90. */
  warned: number
}

/** The backdrop chosen with /look, and when the last finish celebration started (0 for none). */
export type Stage = {
  look: 'core' | 'dubai' | 'mission' | 'dunes'
  party: number
}

declare module 'claude-code' {
  interface PluginState {
    'amplify-theme': { momentum: Shaped<Momentum>; live: Shaped<Live>; stage: Shaped<Stage> }
  }
}
