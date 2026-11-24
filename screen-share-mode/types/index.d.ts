export type Style = 'bars' | 'fake'

export type Shield = {
  /** True while screen share mode hides private details on screen. */
  isOn: boolean
  /** Names to hide: workspace names found in brand/ plus any added by hand. */
  names: string[]
  /** Grey bars, or made-up stand-ins that stay the same for each value. */
  style: Style
}

declare module 'claude-code' {
  interface PluginState {
    'screen-share-mode': { shield: Shaped<Shield> }
  }
}
