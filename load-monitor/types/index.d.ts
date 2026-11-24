export type Load = {
  /** True while the band shows and the readings refresh. */
  isOn: boolean
  /** Use, 0 to 100, or -1 when this Mac does not report it. */
  cpu: number
  ram: number
  gpu: number
  /** A line naming the process behind a CPU spike, or '' when there is none. */
  spike: string
}

declare module 'claude-code' {
  interface PluginState {
    'load-monitor': { load: Shaped<Load> }
  }
}
