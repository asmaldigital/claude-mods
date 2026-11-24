import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeColors, ThemeSetArgs } from 'claude-code'

import type { Live, Mode, Momentum, Stage } from '../types'
import { makeColors } from './make-colors.js'
import {
  art,
  celebration,
  CELEBRATION_STYLE,
  isLook,
  LOOK_NAME,
  LOOKS,
  SCENE_STYLE,
  sceneDefs,
  type Look,
} from './scenes'

// Amplify. Simplify AI. Amplify Growth.
// Low-glare grays tinted with Deep Navy so long sessions stay easy on the eyes.
// Orange leads, cyan marks AI, teal marks progress. Danger, success and warning keep their meaning.
const { theme, problems } = makeColors({
  label: 'Amplify',
  roles: {
    accent: '#FF6B35',
    pro: '#06B6D4',
    success: '#14B8A6',
    warning: '#EAB308',
    danger: '#E11D48',
  },
  light: {
    gray: {
      anchors: {
        'surface-0': '#E6EBF2',
        'surface-1': '#EEF2F7',
        'surface-2': '#F6F8FB',
        'surface-3': '#F6F8FB',
        'text-primary': '#0A1628',
        'text-secondary': '#2B3A52',
        'text-muted': '#4A5A72',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0A1628',
        'surface-1': '#0F1D33',
        'surface-2': '#14243D',
        'surface-3': '#16263F',
        'text-primary': '#EEF3F9',
        'text-secondary': '#C5D0DD',
        'text-muted': '#9AA9BC',
      },
    },
  },
})

const COLORS: ThemeColors = theme

const CYAN = '#06B6D4'
const TEAL = '#14B8A6'
const ORANGE = '#FF6B35'
const AMBER = '#EAB308'
const RED = '#E11D48'

// ---------------------------------------------------------------- momentum game
// Every real move earns a point, every 5 points lights a block, 8 lit blocks complete a level.
const POINTS_PER_BLOCK = 5
const BLOCKS = 8
const COUNTED = new Set(['Edit', 'Write', 'Bash', 'NotebookEdit'])

const START: Momentum = { points: 0, lit: 0, level: 0, today: 0, day: '' }

const momentum = atom({ plugin: 'amplify-theme', key: 'momentum' } as const, START, {
  shape: 'momentum-1',
})

/** Today's date on the person's own clock, so the daily count resets at their midnight. */
export function today(at: Date = new Date()): string {
  const mm = String(at.getMonth() + 1).padStart(2, '0')
  const dd = String(at.getDate()).padStart(2, '0')
  return `${at.getFullYear()}-${mm}-${dd}`
}

/** One move: the pure step, so the rules are easy to test. */
export function step(m: Momentum, day: string): { next: Momentum; isLevelUp: boolean } {
  const fresh = m.day === day ? m : { ...m, today: 0, day }
  let { points, lit, level } = fresh
  let isLevelUp = false

  points += 1
  if (points >= POINTS_PER_BLOCK) {
    points = 0
    lit = lit >= BLOCKS ? 1 : lit + 1
    if (lit === BLOCKS) {
      level += 1
      isLevelUp = true
    }
  }

  return { next: { points, lit, level, today: fresh.today + 1, day }, isLevelUp }
}

// ---------------------------------------------------------------- live state
// What Claude is doing, and how full the context window is. Drawn as color.
const QUIET: Live = { mode: 'ready', context: -1, limit: -1, warned: 0 }

const live = atom({ plugin: 'amplify-theme', key: 'live' } as const, QUIET, { shape: 'live-1' })

const MODE_COLOR: Record<Mode, string> = { ready: TEAL, working: CYAN, 'needs-you': ORANGE }
const MODE_WORD: Record<Mode, string> = {
  ready: 'YOUR MOVE',
  working: 'CLAUDE IS BUILDING',
  'needs-you': 'NEEDS YOUR OK',
}

/** Teal while there is room, amber from 60 percent, red from 80. */
export function fuelColor(percent: number): string {
  if (percent >= 80) return RED
  if (percent >= 60) return AMBER
  return TEAL
}

// ---------------------------------------------------------------- stage
// Which backdrop is showing, and the finish celebration.
const STAGE_START: Stage = { look: 'core', party: 0 }

const stage = atom({ plugin: 'amplify-theme', key: 'stage' } as const, STAGE_START, { shape: 'stage-1' })

// How long the fireworks stay on screen after Claude finishes.
export const PARTY_MS = 6000

/** Reads the look someone typed after /look: a name, a number, or a word from its title. */
export function parseLook(args: string): Look | undefined {
  const word = args.trim().toLowerCase()
  if (word === '') return undefined
  if (isLook(word)) return word
  const n = Number(word)
  if (Number.isInteger(n) && n >= 1 && n <= LOOKS.length) return LOOKS[n - 1]

  return LOOKS.find(l => LOOK_NAME[l].toLowerCase().includes(word))
}

/** Tools that stop and wait for the person by design. */
const ASKS_PERSON = new Set(['AskUserQuestion', 'ExitPlanMode'])

function bar(m: Momentum): string {
  return `${'▮'.repeat(m.lit)}${'▯'.repeat(BLOCKS - m.lit)}`
}

export function statusLine(m: Momentum, l: Live): string {
  // The status line keeps to mode and momentum; the context reading is drawn as the ring.
  return `Amplify  ● ${MODE_WORD[l.mode]}  Lv ${m.level + 1} ${bar(m)}  ${m.today} moves today`
}

// ---------------------------------------------------------------- the scene
// Tower blocks in climbing order, in the tower's own 440 by 380 box.
const TOWER: readonly (readonly [number, number])[] = [
  [130, 300],
  [192, 300],
  [192, 238],
  [254, 300],
  [254, 238],
  [316, 300],
  [316, 238],
  [316, 176],
]

// A fixed star field, the same on every draw.
const STARS = Array.from({ length: 46 }, (_, i) => {
  const x = (i * 337 + 91) % 1600
  const y = (i * 211 + 37) % 620
  const r = 0.9 + ((i * 7) % 5) * 0.35
  const d = ((i * 13) % 50) / 10

  return `<circle class="star" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${r.toFixed(2)}"/>`
}).join('\n')

const HEX = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2

  return `${(210 + 50 * Math.cos(a)).toFixed(1)},${(190 + 50 * Math.sin(a)).toFixed(1)}`
}).join(' ')

const RING = 2 * Math.PI * 120
const INNER = 2 * Math.PI * 100

function tower(m: Momentum): string {
  const isFull = m.lit >= BLOCKS
  const blocks = TOWER.map(([x, y], i) => {
    const isLit = i < m.lit
    const isTop = i === BLOCKS - 1
    const cls = !isLit ? 'off' : isTop ? (isFull ? 'top full' : 'on') : 'on'
    const delay = (i * 0.35).toFixed(2)

    return `<rect class="${cls}" style="animation-delay:${delay}s" x="${x}" y="${y}" width="54" height="54" rx="9"/>`
  }).join('\n')

  const burst = isFull
    ? `<circle class="burst" cx="343" cy="203" r="44"/>
<circle class="burst b2" cx="343" cy="203" r="44"/>
<rect class="spark" x="392" y="140" width="16" height="16" rx="3"/>
<rect class="spark s2" x="300" y="128" width="11" height="11" rx="2"/>`
    : `<rect class="spark" x="392" y="150" width="14" height="14" rx="3"/>`

  const pulse = m.lit > 0 ? `<rect class="pulse" x="333" y="300" width="20" height="20" rx="4"/>` : ''

  return `${blocks}\n${burst}\n${pulse}\n<text class="label" x="316" y="380" text-anchor="middle">LEVEL ${m.level + 1}</text>`
}

function core(l: Live): string {
  const mode = MODE_COLOR[l.mode]
  const fuel = l.context >= 0 ? l.context : 0
  const fuelArc = `<circle class="arc" cx="210" cy="190" r="120" stroke="${fuelColor(fuel)}" stroke-dasharray="${((RING * fuel) / 100).toFixed(1)} ${RING.toFixed(1)}" transform="rotate(-90 210 190)"/>`
  const limitArc =
    l.limit >= 0
      ? `<circle class="arc thin" cx="210" cy="190" r="100" stroke="${fuelColor(l.limit)}" stroke-dasharray="${((INNER * l.limit) / 100).toFixed(1)} ${INNER.toFixed(1)}" transform="rotate(-90 210 190)"/>`
      : ''
  const spin = l.mode === 'working' ? 'orbit spin' : 'orbit'
  const beacon =
    l.mode === 'needs-you'
      ? `<circle class="beacon" cx="210" cy="190" r="56" stroke="${ORANGE}"/>
<circle class="beacon b2" cx="210" cy="190" r="56" stroke="${ORANGE}"/>`
      : ''
  const reading = l.context >= 0 ? `CONTEXT ${l.context}%` : 'CONTEXT'
  const limitText = l.limit >= 0 ? `   LIMIT ${l.limit}%` : ''

  return `<circle class="track" cx="210" cy="190" r="120"/>
<circle class="track thin" cx="210" cy="190" r="100"/>
${fuelArc}
${limitArc}
${beacon}
<g class="${spin}">
<ellipse cx="210" cy="190" rx="86" ry="28" fill="none" stroke="${mode}" stroke-opacity="0.55" stroke-width="2"/>
<circle cx="296" cy="190" r="7" fill="${mode}"/>
</g>
<g class="${spin} o2">
<ellipse cx="210" cy="190" rx="86" ry="28" fill="none" stroke="${mode}" stroke-opacity="0.35" stroke-width="2" transform="rotate(60 210 190)"/>
</g>
<polygon class="core" points="${HEX}" fill="${mode}"/>
<polygon points="${HEX}" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="2"/>
<text class="mode" x="210" y="352" text-anchor="middle" fill="${mode}">${MODE_WORD[l.mode]}</text>
<text class="label" x="210" y="384" text-anchor="middle">${reading}${limitText}</text>`
}

export function scene(m: Momentum, l: Live, s: Stage = STAGE_START): string {
  const mode = MODE_COLOR[l.mode]
  const second = l.mode === 'needs-you' ? ORANGE : l.mode === 'working' ? CYAN : TEAL
  const third = l.mode === 'needs-you' ? CYAN : ORANGE
  const tempo = l.mode === 'needs-you' ? '2.8s' : l.mode === 'working' ? '4s' : '7s'
  // The radar sweeps fast while Claude works, slowly while it is your move.
  const sweep = l.mode === 'working' ? '3s' : l.mode === 'needs-you' ? '6s' : '12s'
  const isArt = s.look !== 'core'
  const party = s.party > 0 ? celebration() : ''

  // An art scene keeps the live core small in the top-left (clear of the consoles in mission control);
  // the core look keeps it large with the tower.
  const hud = isArt
    ? `<svg x="${s.look === 'mission' ? 330 : 0}" y="0" width="560" height="520" viewBox="0 0 420 400" preserveAspectRatio="xMinYMin meet">
${core(l)}
</svg>`
    : `<svg x="0" y="0" width="1600" height="1000" viewBox="0 0 420 400" preserveAspectRatio="xMinYMin meet">
${core(l)}
</svg>
<svg x="0" y="0" width="1600" height="1000" viewBox="0 0 440 400" preserveAspectRatio="xMaxYMin meet">
${tower(m)}
</svg>`

  const ground = isArt
    ? art(s.look)
    : `<rect class="ground" x="0" y="0" width="1600" height="1000"/>
<g class="aurora">
<ellipse class="a1" cx="260" cy="-40" rx="560" ry="260" fill="url(#g2)"/>
<ellipse class="a2" cx="900" cy="-90" rx="620" ry="240" fill="url(#gm)"/>
<ellipse class="a3" cx="1450" cy="40" rx="420" ry="260" fill="url(#g3)"/>
<ellipse class="wash" cx="800" cy="-60" rx="980" ry="300" fill="url(#gm)"/>
</g>
${STARS}
<rect x="0" y="0" width="1600" height="1000" fill="url(#grid)"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
:root { --ground: #E6EBF2; --dot: #0A1628; --dotop: 0.07; --glow: 0.42; --off: #0A1628; --ink: #2B3A52; --star: #0A1628;
  --mode: ${mode}; --tempo: ${tempo}; --sweep: ${sweep}; }
@media (prefers-color-scheme: dark) {
  :root { --ground: #0A1628; --dot: #E2E8F0; --dotop: 0.06; --glow: 0.6; --off: #E2E8F0; --ink: #C5D0DD; --star: #E2E8F0; }
}
${isArt ? SCENE_STYLE : ''}
${party !== '' ? CELEBRATION_STYLE : ''}
.ground { fill: var(--ground); }
.dot { fill: var(--dot); opacity: var(--dotop); }
.star { fill: var(--star); opacity: 0.25; animation: twinkle 5s ease-in-out infinite; }
.aurora { opacity: var(--glow); }
.wash { opacity: 0.5; animation: glow ${tempo} ease-in-out infinite; }
.a1 { animation: drift1 22s ease-in-out infinite alternate; }
.a2 { animation: drift2 28s ease-in-out infinite alternate; }
.a3 { animation: drift3 19s ease-in-out infinite alternate; }
.off { fill: var(--off); fill-opacity: 0.05; stroke: ${CYAN}; stroke-opacity: 0.35; stroke-width: 1.5; }
.on { fill: ${CYAN}; opacity: 0.78; animation: breathe 4.5s ease-in-out infinite; }
.full { fill: ${ORANGE}; opacity: 0.95; animation: breathe 2.2s ease-in-out infinite; }
.burst { fill: none; stroke: ${ORANGE}; stroke-width: 3; opacity: 0; transform-box: fill-box; transform-origin: center; animation: ring 3s ease-out infinite; }
.b2 { animation-delay: 1.4s; }
.spark { fill: ${ORANGE}; opacity: 0.8; animation: twinkle 3.2s ease-in-out infinite; }
.s2 { animation-delay: 1.1s; }
.pulse { fill: #E6FBFF; opacity: 0; animation: climb 3.6s ease-in infinite; }
.track { fill: none; stroke: var(--off); stroke-opacity: 0.1; stroke-width: 14; }
.arc { fill: none; stroke-width: 14; stroke-linecap: round; }
.thin { stroke-width: 6; }
.orbit { transform-box: view-box; transform-origin: 210px 190px; }
.spin { animation: spin 9s linear infinite; }
.o2.spin { animation-duration: 14s; animation-direction: reverse; }
.core { opacity: 0.9; animation: breathe ${tempo} ease-in-out infinite; }
.beacon { fill: none; stroke-width: 4; opacity: 0; transform-box: fill-box; transform-origin: center; animation: ring 2.8s ease-out infinite; }
.mode { font-family: system-ui, sans-serif; font-size: 26px; font-weight: 800; letter-spacing: 3px; }
.label { fill: var(--ink); font-family: system-ui, sans-serif; font-size: 17px; font-weight: 700; letter-spacing: 2px; opacity: 0.8; }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
  .pulse, .burst, .beacon { opacity: 0; }
  .star { opacity: 0.35; }
  .wash { opacity: 0.5; }
}
@keyframes drift1 { from { transform: translate(0px, 0px); } to { transform: translate(140px, 40px); } }
@keyframes drift2 { from { transform: translate(0px, 0px); } to { transform: translate(-160px, 30px); } }
@keyframes drift3 { from { transform: translate(0px, 0px); } to { transform: translate(-90px, -30px); } }
@keyframes glow { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
@keyframes breathe { 0%, 100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes ring { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(2.4); } }
@keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
@keyframes climb { 0% { opacity: 0; transform: translate(0px, 0px); } 20% { opacity: 0.9; } 100% { opacity: 0; transform: translate(0px, -170px); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
<defs>
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
<circle class="dot" cx="2" cy="2" r="1.4"/>
</pattern>
<radialGradient id="gm"><stop offset="0" stop-color="${mode}" stop-opacity="0.95"/><stop offset="1" stop-color="${mode}" stop-opacity="0"/></radialGradient>
<radialGradient id="g2"><stop offset="0" stop-color="${second}" stop-opacity="0.8"/><stop offset="1" stop-color="${second}" stop-opacity="0"/></radialGradient>
<radialGradient id="g3"><stop offset="0" stop-color="${third}" stop-opacity="0.7"/><stop offset="1" stop-color="${third}" stop-opacity="0"/></radialGradient>
${isArt ? sceneDefs(mode, second === mode ? third : second) : ''}
</defs>
${ground}
${hud}
${party}
</svg>`
}

// ---------------------------------------------------------------- looks
const SCENE_LOOK: ThemeSetArgs = {
  colors: COLORS,
  backdrop: { scene: 'amplify', glass: { blur: 22, opacity: 0.68 } },
}

// Focus mode: same colors, the scene replaced by the plain page color.
const FOCUS_LOOK: ThemeSetArgs = {
  colors: COLORS,
  backdrop: { color: 'surface-0' },
}

const COLORS_ONLY: ThemeSetArgs = { colors: COLORS }

const FOCUS_KEY = 'focus'
const LOOK_KEY = 'look'
const MOMENTUM_KEY = 'momentum'
const TOAST_KEY = 'toasted-on'

// Colors always land. If this app version refuses the backdrop, keep the colors and say why once.
async function apply($: EngineInterface, focus: boolean) {
  let set
  try {
    set = await $.theme.set(focus ? FOCUS_LOOK : SCENE_LOOK)
  } catch (error) {
    $.ui.toast(`Amplify: backdrop not shown here, colors applied. ${String(error)}`)
    set = await $.theme.set(COLORS_ONLY)
  }

  if (!set.isDrawn) {
    $.ui.status(set.reason)
  }
}

function isMomentum(value: unknown): value is Momentum {
  const m = value as Momentum | null
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof m.points === 'number' &&
    typeof m.lit === 'number' &&
    typeof m.level === 'number' &&
    typeof m.today === 'number' &&
    typeof m.day === 'string'
  )
}

async function showStatus($: EngineInterface) {
  $.ui.status(statusLine(await read($, momentum), await read($, live)))
}

async function setMode($: EngineInterface, mode: Mode) {
  if ((await read($, live)).mode === mode) return

  await update($, live, l => ({ ...l, mode }))
  await showStatus($)
}

async function addMove($: EngineInterface) {
  const { next: m, isLevelUp } = step(await read($, momentum), today())

  await update($, momentum, () => m)
  await $.store.set(MOMENTUM_KEY, m)
  await showStatus($)

  if (isLevelUp) {
    $.ui.toast(`AMPLIFIED. Level ${m.level} complete, ${m.today} moves today. Now keep that momentum going.`)
  }
}

// Whether the main chat ran any tool this turn: a plain reply gets no fireworks.
let didWork = false

// Fireworks for a few seconds, then gone. A newer celebration outlives an older timer.
async function celebrate($: EngineInterface) {
  const at = await $.clock.now()
  await update($, stage, s => ({ ...s, party: at }))
  $.clock.after(PARTY_MS, () =>
    quietly(async () => {
      await update($, stage, s => (s.party === at ? { ...s, party: 0 } : s))
    }),
  )
}

function lookList(current: Look): string {
  return LOOKS.map((l, i) => `${i + 1}. ${l}: ${LOOK_NAME[l]}${l === current ? ' (showing)' : ''}`).join('\n')
}

// Live signals never block or change the work: each one only updates the picture.
async function quietly(work: () => Promise<void>) {
  try {
    await work()
  } catch {
    // A drawing hiccup never gets in the way of the work.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Each step stands alone, so one failing never stops the others (or /amplify-focus).
    await quietly(async () => {
      const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
      if (unpainted !== undefined) $.ui.toast(unpainted)
    })

    await quietly(async () => {
      const saved = await $.store.get(MOMENTUM_KEY)
      const loaded = isMomentum(saved) ? saved : START
      const m = loaded.day === today() ? loaded : { ...loaded, today: 0, day: today() }
      await update($, momentum, () => m)
    })

    await quietly(async () => {
      const saved = await $.store.get(LOOK_KEY)
      await update($, stage, () => ({ look: isLook(saved) ? saved : 'core', party: 0 }))
    })

    // The theme goes on first, so nothing below can keep it from showing.
    await quietly(async () => apply($, (await $.store.get(FOCUS_KEY)) === true))
    await quietly(() => showStatus($))

    // The kickoff toast, once a day rather than every chat.
    await quietly(async () => {
      if ((await $.store.get(TOAST_KEY)) === today()) return
      await $.store.set(TOAST_KEY, today())
      const m = await read($, momentum)
      $.ui.toast(`Now let's build. Level ${m.level + 1}, every move lights a block.`)
    })

    try {
      await $.command.register({
        name: 'amplify-focus',
        description: 'Amplify theme: switch the backdrop off for deep work, or back on',
      })
    } catch (error) {
      $.ui.toast(`Amplify: /amplify-focus not added. ${String(error)}`)
    }

    try {
      await $.command.register({
        name: 'look',
        description: 'Amplify theme: pick a backdrop (core, dubai, mission, dunes), or list them',
      })
    } catch (error) {
      $.ui.toast(`Amplify: /look not added. ${String(error)}`)
    }

    return next(e)
  })

  // Claude starts working: cyan, orbits spin.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      didWork = false
      await quietly(() => setMode($, 'working'))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // Claude finished: teal, your move, and fireworks when the turn did real work.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await quietly(() => setMode($, 'ready'))
      if (didWork) await quietly(() => celebrate($))
      didWork = false
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // A call waiting for your approval: orange beacon.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)

    if (verdict.decision === 'ask' && e.tool_use_id !== undefined && e.approver === 'person') {
      await quietly(() => setMode($, 'needs-you'))
    }

    return verdict
  }).catch(($, e, next) => next(e))

  // Counts finished moves, and lights orange while Claude asks you a question.
  on('tool.call', async ($, e, next) => {
    const isMain = e.agentId === undefined
    const isAsking = isMain && ASKS_PERSON.has(e.tool)

    if (isAsking) await quietly(() => setMode($, 'needs-you'))
    if (isMain) didWork = true

    const ran = await next(e)

    // Once a main-chat call finishes (approved or answered), Claude is building again.
    // A subagent's late call never relights the core after the turn has ended.
    if (isMain) await quietly(() => setMode($, 'working'))

    if (COUNTED.has(e.tool) && ran.deny === undefined && ran.isError !== true) {
      await quietly(() => addMove($))
    }

    return ran
  }).catch(($, e, next) => next(e))

  // Context window and usage limits: the fuel gauge.
  on('session.measure', async ($, e, next) => {
    await quietly(async () => {
      const { tokens, window } = e.context
      const percent =
        e.context.percent ?? (tokens !== undefined && window > 0 ? Math.round((tokens / window) * 100) : -1)
      const limit = e.rateLimits.reduce((top, w) => Math.max(top, Math.round(w.percentUsed)), -1)
      // Drawn as the ring only. Redraw only when a reading the ring shows has moved.
      const isRelevant = e.changed.includes('context') || e.changed.includes('rateLimits')
      const l = await read($, live)
      if (!isRelevant || (l.context === percent && l.limit === limit)) return
      await update($, live, x => ({ ...x, context: percent, limit }))
    })

    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'amplify-focus' }, async $ => {
    try {
      const focus = (await $.store.get(FOCUS_KEY)) !== true

      await $.store.set(FOCUS_KEY, focus)
      await apply($, focus)

      return {
        text: focus
          ? 'Focus on. Backdrop off, colors, status line and momentum stay. Run /amplify-focus again to bring it back.'
          : 'Focus off. Amplify backdrop is back.',
        isTextDisplayOnly: true,
      }
    } catch (error) {
      return { text: `Amplify could not switch focus mode: ${String(error)}`, isTextDisplayOnly: true }
    }
  })

  on('command.run', { command: 'look' }, async ($, e) => {
    try {
      const current = (await read($, stage)).look
      const args = typeof e.args === 'string' ? e.args : ''

      if (args.trim() === '') {
        return { text: `Backdrops:\n${lookList(current)}\n\nType /look dubai (or a number) to switch.`, isTextDisplayOnly: true }
      }

      const look = parseLook(args)
      if (look === undefined) {
        return { text: `No backdrop called "${args.trim()}".\n${lookList(current)}`, isTextDisplayOnly: true }
      }

      await $.store.set(LOOK_KEY, look)
      await update($, stage, s => ({ ...s, look }))
      const isFocus = (await $.store.get(FOCUS_KEY)) === true

      return {
        text: isFocus
          ? `${LOOK_NAME[look]} picked. Focus mode is on, so it shows when you run /amplify-focus again.`
          : `${LOOK_NAME[look]} is on. It follows your light or dark setting.`,
        isTextDisplayOnly: true,
      }
    } catch (error) {
      return { text: `Amplify could not switch the backdrop: ${String(error)}`, isTextDisplayOnly: true }
    }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== 'amplify') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)
    const m = await read($, momentum)
    const l = await read($, live)
    const s = await read($, stage)

    return (
      <Svg
        source={scene(m, l, s)}
        alt={`Amplify ${LOOK_NAME[s.look]}: ${MODE_WORD[l.mode].toLowerCase()}`}
        isInteractive={false}
      />
    )
  })
}
