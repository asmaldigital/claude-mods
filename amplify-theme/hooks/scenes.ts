// Amplify scenes: hand-drawn vector art for the backdrop, in a 1600 by 1000 box.
// Each scene draws once and takes its light and dark colors from CSS variables,
// so one set of shapes serves both themes. The art keeps to the edges; the middle stays calm.
// Every layer is a named group, so the styles in register.tsx can animate it by state.

export type Look = 'core' | 'dubai' | 'mission' | 'dunes'

export const LOOKS: readonly Look[] = ['core', 'dubai', 'mission', 'dunes']

export const LOOK_NAME: Record<Look, string> = {
  core: 'Mission core',
  dubai: 'Dubai skyline',
  mission: 'Mission control',
  dunes: 'Desert dunes',
}

export function isLook(value: unknown): value is Look {
  return typeof value === 'string' && (LOOKS as readonly string[]).includes(value)
}

/** A fixed pseudo-random number in 0..1, the same on every draw. */
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const f = (n: number) => n.toFixed(0)

// ---------------------------------------------------------------- shared
// Colors for every scene, light first, then dark.
export const SCENE_STYLE = `
:root {
  --sky1: #F6F8FB; --sky2: #E2E8F0; --sky3: #FBE9DD;
  --mass: #0F1D33; --mass2: #1E293B; --mass3: #34465F;
  --wall: #F1F4F8; --panel: #183A5E; --panel2: #0F2A47; --line: #B9C7D8;
  --water: #C9DBEA; --sand1: #8A97AC; --sand2: #5E6E86; --sand3: #2F4260; --sand4: #0F1D33;
  --stars: 0; --sun: 1; --moon: 0; --auroraop: 0.32;
}
@media (prefers-color-scheme: dark) {
  :root {
    --sky1: #0A1628; --sky2: #0D1B30; --sky3: #2A1E2A;
    --mass: #2A3E5A; --mass2: #22344E; --mass3: #34496A;
    --wall: #0C192D; --panel: #13263F; --panel2: #0E1E34; --line: #1F3452;
    --water: #071121; --sand1: #26374F; --sand2: #1D2C44; --sand3: #142238; --sand4: #091424;
    --stars: 0.85; --sun: 0; --moon: 1; --auroraop: 0.7;
  }
}
.k1 { stop-color: var(--sky1); } .k2 { stop-color: var(--sky2); } .k3 { stop-color: var(--sky3); }
.mass { fill: var(--mass); } .mass2 { fill: var(--mass2); } .mass3 { fill: var(--mass3); }
.wall { fill: var(--wall); } .panel { fill: var(--panel); } .panel2 { fill: var(--panel2); }
.water { fill: var(--water); }
.d1 { fill: var(--sand1); } .d2 { fill: var(--sand2); } .d3 { fill: var(--sand3); } .d4 { fill: var(--sand4); }
.night { opacity: var(--stars); }
.sunlayer { opacity: var(--sun); }
.moonlayer { opacity: var(--moon); }
.ribbon { opacity: var(--auroraop); }
.wave1 { animation: wave 24s ease-in-out infinite alternate; }
.wave2 { animation: wave 31s ease-in-out infinite alternate-reverse; }
.lamp { animation: blink var(--tempo) ease-in-out infinite; }
.sweep { transform-box: fill-box; transform-origin: 0% 100%; animation: spin var(--sweep) linear infinite; }
.trace { stroke-dasharray: 8 10; animation: trace var(--tempo) linear infinite; }
.floor { animation: glow var(--tempo) ease-in-out infinite; }
@keyframes wave { from { transform: translate(-40px, 0px); } to { transform: translate(60px, 18px); } }
@keyframes blink { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes trace { to { stroke-dashoffset: -72; } }
`

// The aurora ribbon: two waves in the mode color and its partner, used by the sky scenes.
function ribbon(y: number): string {
  return `<g id="aurora" class="ribbon">
<path class="wave1" d="M-100 ${y + 40} C 200 ${y - 60}, 500 ${y + 120}, 800 ${y + 20} S 1400 ${y - 80}, 1700 ${y + 30} L 1700 ${y + 130} C 1400 ${y + 40}, 1100 ${y + 170}, 800 ${y + 110} S 200 ${y + 50}, -100 ${y + 150} Z" fill="url(#rib1)"/>
<path class="wave2" d="M-100 ${y + 150} C 300 ${y + 60}, 600 ${y + 230}, 950 ${y + 140} S 1450 ${y + 70}, 1700 ${y + 160} L 1700 ${y + 210} C 1400 ${y + 130}, 1000 ${y + 260}, 700 ${y + 200} S 200 ${y + 160}, -100 ${y + 220} Z" fill="url(#rib2)"/>
</g>`
}

function stars(count: number, maxY: number, salt: number): string {
  const dots = Array.from({ length: count }, (_, i) => {
    const x = rnd(i, salt) * 1600
    const y = rnd(i, salt + 1) * maxY
    const r = 1 + rnd(i, salt + 2) * 1.6
    const d = (rnd(i, salt + 3) * 5).toFixed(1)

    return `<circle class="star" style="animation-delay:${d}s" cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(1)}"/>`
  }).join('')

  return `<g id="stars" class="night">${dots}</g>`
}

function sky(gradient: string): string {
  return `<rect id="sky" x="0" y="0" width="1600" height="1000" fill="url(#${gradient})"/>`
}

// ---------------------------------------------------------------- Dubai skyline
function towers(fromX: number, toX: number, salt: number, base: number): { mass: string; lights: string } {
  let x = fromX
  let i = 0
  let mass = ''
  let lights = ''

  while (x < toX) {
    const w = 18 + Math.round(rnd(i, salt) * 30)
    // Taller toward the outer edge, lower toward the calm middle.
    const edge = fromX < 800 ? 1 - (x - fromX) / (toX - fromX) : (x - fromX) / (toX - fromX)
    // The left side stays below the live core's text in the top-left corner.
    const tall = fromX < 800 ? 0.55 : 1
    const h = Math.round((70 + rnd(i, salt + 1) * 160 + edge * 170) * tall)
    const cls = rnd(i, salt + 2) > 0.5 ? 'mass' : 'mass2'
    mass += `<rect class="${cls}" x="${x}" y="${base - h}" width="${w}" height="${h}"/>`

    if (rnd(i, salt + 3) > 0.45) {
      const lh = Math.round(h * (0.4 + rnd(i, salt + 4) * 0.45))
      const warm = rnd(i, salt + 5) > 0.78
      const d = (rnd(i, salt + 6) * 4).toFixed(1)
      lights += `<rect class="lamp" style="animation-delay:${d}s" x="${x + Math.round(w / 2) - 2}" y="${base - lh - 8}" width="4" height="${lh}" fill="${warm ? '#FF6B35' : '#06B6D4'}"/>`
    }

    x += w + 4 + Math.round(rnd(i, salt + 7) * 10)
    i += 1
  }

  return { mass, lights }
}

export function dubaiArt(): string {
  const base = 790
  const left = towers(0, 560, 11, base)
  const right = towers(1030, 1600, 29, base)

  // Landmarks: a needle tower on the left, a sail hotel near it, a domed frame on the right.
  const needle = `<path class="mass" d="M466 ${base} L466 ${base - 200} L476 ${base - 270} L480 ${base - 360} L484 ${base - 270} L494 ${base - 200} L494 ${base} Z"/>`
  const sail = `<path d="M372 ${base} L372 ${base - 190} C 425 ${base - 165}, 435 ${base - 75}, 410 ${base} Z" fill="none" stroke="var(--mass)" stroke-width="5"/>
<line x1="360" y1="${base - 168}" x2="420" y2="${base - 168}" stroke="var(--mass)" stroke-width="5"/>`
  const frame = `<rect x="1240" y="${base - 150}" width="62" height="150" fill="none" stroke="var(--mass)" stroke-width="6"/>`
  const dome = `<path class="mass2" d="M1360 ${base} A 70 52 0 0 1 1500 ${base} Z"/>`

  return `${sky('skyA')}
${stars(70, 520, 3)}
<g id="moon" class="moonlayer"><circle cx="1440" cy="150" r="46" fill="#F3E9D2"/><circle cx="1462" cy="138" r="44" fill="var(--sky1)"/></g>
<g id="sun" class="sunlayer"><circle cx="1150" cy="${base - 10}" r="90" fill="url(#sunglow)"/></g>
${ribbon(40)}
<rect id="water" class="water" x="0" y="${base}" width="1600" height="${1000 - base}"/>
<g id="skyline-left">${left.mass}${needle}${sail}</g>
<g id="skyline-right">${right.mass}${frame}${dome}</g>
<g id="lights">${left.lights}${right.lights}</g>`
}

// ---------------------------------------------------------------- Mission control
function radar(cx: number, cy: number): string {
  return `<g class="dial">
<circle cx="${cx}" cy="${cy}" r="106" fill="var(--panel2)" stroke="var(--mass)" stroke-width="6"/>
<circle cx="${cx}" cy="${cy}" r="74" fill="url(#scope)"/>
<circle cx="${cx}" cy="${cy}" r="88" fill="none" stroke="#06B6D4" stroke-opacity="0.6" stroke-width="2"/>
<circle cx="${cx}" cy="${cy}" r="44" fill="none" stroke="#06B6D4" stroke-opacity="0.6" stroke-width="2"/>
<line x1="${cx - 100}" y1="${cy}" x2="${cx + 100}" y2="${cy}" stroke="#06B6D4" stroke-opacity="0.4" stroke-width="2"/>
<line x1="${cx}" y1="${cy - 100}" x2="${cx}" y2="${cy + 100}" stroke="#06B6D4" stroke-opacity="0.4" stroke-width="2"/>
<path class="sweep" d="M${cx} ${cy} L${cx} ${cy - 88} A 88 88 0 0 1 ${cx + 62} ${cy - 62} Z" fill="var(--mode)" fill-opacity="0.45"/>
<path d="M${cx - 30} ${cy - 103} A 106 106 0 0 1 ${cx + 75} ${cy - 75}" fill="none" stroke="var(--mode)" stroke-width="6"/>
</g>`
}

function lamps(x: number, y: number, step: number, n: number, vertical: boolean): string {
  return Array.from({ length: n }, (_, i) => {
    const cx = vertical ? x : x + i * step
    const cy = vertical ? y + i * step : y

    return `<circle class="lamp" style="animation-delay:${(i * 0.4).toFixed(1)}s" cx="${cx}" cy="${cy}" r="7" fill="#FF6B35"/>`
  }).join('')
}

function consoleSide(side: 'left' | 'right'): string {
  // Drawn for the left edge, then mirrored for the right.
  const art = `<path d="M0 150 C 120 140, 190 160, 230 190 L 300 820 L 0 820 Z" fill="var(--wall)" stroke="var(--line)" stroke-width="3"/>
<rect x="72" y="80" width="170" height="48" rx="24" fill="#06B6D4" fill-opacity="0.75"/>
${radar(130, 290)}
${lamps(258, 268, 28, 3, true)}
<rect class="panel" x="6" y="420" width="290" height="150" rx="18" stroke="var(--mass)" stroke-width="5"/>
<polyline class="trace" points="40,530 90,490 130,515 180,460 230,480 270,445" fill="none" stroke="#14B8A6" stroke-width="4"/>
<rect class="panel2" x="6" y="590" width="200" height="86" rx="14"/>
<ellipse cx="110" cy="633" rx="70" ry="20" fill="none" stroke="#06B6D4" stroke-width="2"/>
<circle cx="110" cy="633" r="16" fill="#06B6D4" fill-opacity="0.85"/>
<rect class="panel" x="220" y="590" width="190" height="94" rx="14"/>
<rect x="240" y="612" width="70" height="7" rx="3" fill="#06B6D4"/>
<rect x="240" y="632" width="70" height="7" rx="3" fill="#06B6D4"/>
<rect x="240" y="652" width="70" height="7" rx="3" fill="#06B6D4"/>
${lamps(330, 616, 26, 3, false)}
<path class="mass2" d="M0 740 C 120 700, 250 700, 290 790 L 300 840 L 0 840 Z"/>`

  return side === 'left'
    ? `<g id="consoles-left">${art}</g>`
    : `<g id="consoles-right" transform="translate(1600 0) scale(-1 1)">${art}</g>`
}

export function missionArt(): string {
  return `${sky('wallA')}
<g id="ceiling">
<path d="M-50 60 Q 800 -40 1650 60" fill="none" stroke="var(--line)" stroke-width="10"/>
<path d="M-50 210 Q 800 -60 1650 210" fill="none" stroke="#14B8A6" stroke-opacity="0.5" stroke-width="4"/>
<path d="M150 20 Q 800 170 1450 20" fill="none" stroke="var(--mode)" stroke-opacity="0.8" stroke-width="7"/>
</g>
<g id="floor">
<ellipse class="floor" cx="800" cy="1000" rx="620" ry="150" fill="url(#pool)"/>
<ellipse cx="800" cy="905" rx="560" ry="70" fill="none" stroke="var(--line)" stroke-width="4"/>
<ellipse cx="800" cy="960" rx="720" ry="105" fill="none" stroke="var(--line)" stroke-width="4"/>
</g>
${consoleSide('left')}
${consoleSide('right')}`
}

// ---------------------------------------------------------------- Desert dunes
export function dunesArt(): string {
  return `${sky('skyD')}
${stars(90, 560, 7)}
<g id="haze" class="ribbon">
<path class="wave1" d="M-100 60 C 300 0, 700 140, 1100 70 S 1600 20, 1700 60 L 1700 230 C 1300 160, 900 290, 500 220 S 0 210, -100 250 Z" fill="url(#rib1)"/>
</g>
<g id="glow"><ellipse cx="800" cy="660" rx="900" ry="70" fill="url(#horizon)"/></g>
<g id="sun">
<circle class="sunlayer" cx="1510" cy="640" r="104" fill="#FF6B35"/>
<rect class="moonlayer" x="1400" y="644" width="200" height="5" fill="#FF6B35"/>
</g>
<g id="dunes-back">
<path class="d1" d="M0 545 C 160 545, 260 610, 420 640 C 600 670, 900 700, 1100 650 C 1280 610, 1450 600, 1600 595 L 1600 1000 L 0 1000 Z"/>
<path class="d2" d="M0 650 C 220 640, 380 700, 560 760 C 760 820, 1000 790, 1200 740 C 1380 700, 1500 690, 1600 690 L 1600 1000 L 0 1000 Z"/>
</g>
<g id="dunes-front">
<path class="d3" d="M0 700 C 180 690, 300 720, 420 790 C 560 850, 900 840, 1150 820 C 1350 800, 1480 760, 1600 740 L 1600 1000 L 0 1000 Z"/>
<path class="d4" d="M0 820 C 400 800, 800 880, 1200 860 C 1400 850, 1520 830, 1600 820 L 1600 1000 L 0 1000 Z"/>
</g>`
}

/** Gradients the scenes share. Mode colors arrive as arguments so the sky follows Claude. */
export function sceneDefs(mode: string, partner: string): string {
  return `<linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="k1"/><stop offset="0.75" class="k2"/></linearGradient>
<linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="k1"/><stop offset="0.45" class="k2"/><stop offset="0.66" class="k3"/></linearGradient>
<linearGradient id="wallA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="k2"/><stop offset="0.4" class="k1"/><stop offset="1" class="k2"/></linearGradient>
<linearGradient id="rib1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${partner}" stop-opacity="0.2"/><stop offset="0.5" stop-color="${mode}"/><stop offset="1" stop-color="${partner}" stop-opacity="0.4"/></linearGradient>
<linearGradient id="rib2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mode}" stop-opacity="0.5"/><stop offset="1" stop-color="${partner}" stop-opacity="0.15"/></linearGradient>
<radialGradient id="sunglow"><stop offset="0" stop-color="#FF6B35" stop-opacity="0.85"/><stop offset="1" stop-color="#FF6B35" stop-opacity="0"/></radialGradient>
<radialGradient id="scope"><stop offset="0" stop-color="#14B8A6" stop-opacity="0.9"/><stop offset="1" stop-color="#0E4D5C"/></radialGradient>
<radialGradient id="pool"><stop offset="0" stop-color="${mode}" stop-opacity="0.55"/><stop offset="1" stop-color="${mode}" stop-opacity="0"/></radialGradient>
<radialGradient id="horizon"><stop offset="0" stop-color="${mode}" stop-opacity="0.5"/><stop offset="0.6" stop-color="#FF6B35" stop-opacity="0.18"/><stop offset="1" stop-color="#FF6B35" stop-opacity="0"/></radialGradient>`
}

export function art(look: Look): string {
  if (look === 'dubai') return dubaiArt()
  if (look === 'mission') return missionArt()
  if (look === 'dunes') return dunesArt()
  return ''
}

// ---------------------------------------------------------------- celebration
// Fireworks over the calm middle and two shooting stars, played when Claude finishes a piece of work.
export function celebration(): string {
  const burst = (cx: number, cy: number, color: string, delay: number) => {
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (Math.PI / 6) * i
      return `<line x1="${f(cx + 14 * Math.cos(a))}" y1="${f(cy + 14 * Math.sin(a))}" x2="${f(cx + 70 * Math.cos(a))}" y2="${f(cy + 70 * Math.sin(a))}"/>`
    }).join('')

    return `<g class="firework" style="animation-delay:${delay}s" stroke="${color}" stroke-width="5" stroke-linecap="round">${rays}<circle cx="${cx}" cy="${cy}" r="6" fill="${color}" stroke="none"/></g>`
  }

  return `<g id="celebration">
${burst(640, 230, '#FF6B35', 0)}
${burst(860, 170, '#06B6D4', 0.5)}
${burst(1010, 290, '#14B8A6', 1)}
<line class="shoot" x1="300" y1="80" x2="420" y2="120" stroke="#E6FBFF" stroke-width="3" stroke-linecap="round"/>
<line class="shoot s2" x1="1150" y1="60" x2="1270" y2="100" stroke="#E6FBFF" stroke-width="3" stroke-linecap="round"/>
</g>`
}

export const CELEBRATION_STYLE = `
.firework { opacity: 0; transform-box: fill-box; transform-origin: center; animation: pop 1.6s ease-out 3 both; }
.shoot { opacity: 0; animation: shoot 1.8s ease-in 2 both; }
.shoot.s2 { animation-delay: 0.9s; }
@keyframes pop { 0% { opacity: 0; transform: scale(0.2); } 20% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
@keyframes shoot { 0% { opacity: 0; transform: translate(0px, 0px); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(380px, 130px); } }
`
