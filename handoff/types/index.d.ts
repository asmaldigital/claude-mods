export type Saved = {
  /** The folder the chat worked in: a handoff is offered only there. */
  cwd: string
  /** The session that wrote it, so it is not offered back to itself on a new start. */
  sessionId: string
  /** When it was written, in milliseconds. */
  at: number
  text: string
}

export type Desk = {
  /** Context window fill, 0 to 100, or -1 before the first reading. */
  context: number
  /** True once this chat prepared a handoff. */
  isPrepared: boolean
  /** The folder of a handoff waiting for the Pick up button, or null. Its text stays in the store. */
  offer: string | null
  /** True when the person closed the band for this chat. */
  isDismissed: boolean
}

declare module 'claude-code' {
  interface PluginState {
    handoff: { desk: Shaped<Desk> }
  }
}
