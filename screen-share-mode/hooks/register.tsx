import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Shield, Style } from '../types'

// Screen share mode. While it is on, private details in the chat draw as grey bars.
// Only the drawing changes: the saved chat and what Claude reads stay exactly as they were.
// It is best effort: it hides the names it knows and the patterns below, nothing more.

const BAR = '█████'

// Made-up stand-ins by default; grey bars when someone picks them.
const OFF: Shield = { isOn: false, names: [], style: 'fake' }

const shield = atom({ plugin: 'screen-share-mode', key: 'shield' } as const, OFF, { shape: 'shield-2' })

const ON_KEY = 'on'
const NAMES_KEY = 'names'
const STYLE_KEY = 'style'

type Kind = 'key' | 'email' | 'money' | 'phone'

// Every pattern is bounded, so a long run of text cannot stall the drawing.
const CUR = '(?:USD|ZAR|AED|EUR|GBP|CAD|AUD|SAR|INR|CHF|JPY|CNY|NZD|SGD|BTC|ETH|Rs\\.?)'
const NUM = '\\d{1,3}(?:[ ,.\\u00a0]\\d{3}){1,6}(?:[.,]\\d{1,4})?|\\d{1,15}(?:[.,]\\d{1,4})?'
const SCALE = '(?:\\s?(?:k|K|m|M|bn|mn|million|billion|thousand)\\b)?'
const LABEL =
  '(?:salary|salaries|fee|fees|price|prices|cost|costs|budget|revenue|mrr|arr|deal|deals|invoice|total|amount|paid|pay|value|retainer|quote)'

// Each pattern is one kind of private detail.
const PATTERNS: readonly (readonly [Kind, RegExp])[] = [
  // Keys, tokens and passwords.
  ['key', /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----[\s\S]{0,8000}?(?:-----END [A-Z ]{0,40}PRIVATE KEY-----|$)/g],
  ['key', /\b(?:sk|pk|rk)[-_](?:live|test|proj|ant)?[-_]?[A-Za-z0-9_-]{12,200}/g],
  ['key', /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{1,200}/g],
  ['key', /\bgh[pousr]_[A-Za-z0-9]{20,200}/g],
  ['key', /\bgithub_pat_[A-Za-z0-9_]{20,200}/g],
  ['key', /\bglpat-[A-Za-z0-9_-]{16,200}/g],
  ['key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['key', /\bAIza[0-9A-Za-z_-]{30,60}/g],
  ['key', /\bSG\.[A-Za-z0-9_-]{16,80}\.[A-Za-z0-9_-]{16,80}/g],
  ['key', /\bxox[abposr]-[A-Za-z0-9-]{10,200}/g],
  ['key', /\b(?:npm|hf)_[A-Za-z0-9]{30,200}/g],
  ['key', /\bre_[A-Za-z0-9_]{20,200}/g],
  ['key', /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{10,200}/g],
  ['key', /\beyJ[\w-]{10,2000}\.[\w-]{10,2000}\.[\w-]{0,2000}/g],
  ['key', /\bBearer\s+[A-Za-z0-9._~+/=-]{12,2000}/g],
  [
    'key',
    /(?<=\b(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|secret[_-]?access[_-]?key|client[_-]?secret|auth[_-]?token)["']?\s{0,3}[:=]\s{0,3}["']?)[^\s"',;]{4,500}/gi,
  ],
  ['key', /(?<=:\/\/)[^/\s:@]{1,64}:[^@\s/]{1,128}(?=@)/g],
  ['key', /\b[a-fA-F0-9]{32,512}\b/g],
  // Email addresses, including encoded and spelled-out ones.
  ['email', /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]{1,64}@[\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63}){0,8}/gu],
  ['email', /[\p{L}\p{N}._+-]{1,64}%40[\p{L}\p{N}.-]{1,253}/gu],
  ['email', /\b[\w.+-]{1,64}\s?[[(]at[\])]\s?[\w-]{1,63}(?:\s?[[(]dot[\])]\s?[\w-]{1,63}){1,4}/gi],
  // Money: a currency sign or code beside a number, either side, and labelled amounts.
  ['money', new RegExp(`(?:[$€£¥₹]|\\bR(?=\\s?\\d)|\\b${CUR}\\s?)\\s?(?:${NUM})${SCALE}`, 'g')],
  ['money', new RegExp(`\\b(?:${NUM})\\s?(?:[€£$]|${CUR}|dollars|rand|dirhams|euros|pounds|rupees)(?![\\p{L}])`, 'giu')],
  ['money', /\b\d{1,6}(?:[.,]\d{1,3})?\s?(?:million|billion|thousand)\b/gi],
  ['money', /~?\b\d{1,6}(?:[.,]\d{1,2})?\s?[kK]\b/g],
  ['money', new RegExp(`(?<=\\b${LABEL}\\b[:\\s~]{0,3}(?:of\\s)?)\\d[\\d,. ]{0,18}\\d(?:/-)?`, 'gi')],
  // Phone numbers: 9 or more digits with the usual separators, short local numbers and extensions.
  ['phone', /(?!\d{4}-\d{2}-\d{2})(?:\+|\b)\d(?:[\s().-]{0,3}\d){8,14}(?:\s?(?:ext|x)\.?\s?\d{1,5})?\b/g],
  ['phone', /\b\d{3}[-.]\d{4}\b/g],
]

// Made-up names for fake mode, plainly invented.
const FAKE_NAMES = [
  'Client Alpha', 'Client Bravo', 'Client Charlie', 'Client Delta', 'Client Echo', 'Client Foxtrot',
  'Client Golf', 'Client Hotel', 'Client India', 'Client Juliet', 'Client Kilo', 'Client Lima',
  'Client Mike', 'Client November', 'Client Oscar', 'Client Papa', 'Client Quebec', 'Client Romeo',
  'Client Sierra', 'Client Tango', 'Client Uniform', 'Client Victor', 'Client Whiskey', 'Client Xray',
  'Client Yankee', 'Client Zulu',
]

/** A small stable hash, so the same value always gets the same stand-in. */
function hash(text: string): number {
  let h = 2166136261
  for (const ch of text.toLowerCase()) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** The stand-in for one detail: a grey bar, or a made-up value that stays the same. */
export function standIn(kind: Kind | 'name', value: string, style: Style): string {
  if (style === 'bars' || kind === 'key') return BAR
  const n = hash(value)
  if (kind === 'name') return FAKE_NAMES[n % FAKE_NAMES.length]!
  if (kind === 'email') return `contact${n % 900 + 100}@example.com`
  if (kind === 'phone') return `+1 555 01${String(n % 100).padStart(2, '0')}`
  // Amounts are masked, not made up, so nobody reads a believable wrong price off the screen.
  return value.replace(/\d/g, 'X')
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Accents off, so "Zoë Müller" and "Zoe Muller" read the same. */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '')
}

// Between the words of a name: spaces, dashes, dots, markdown marks, simple HTML and URL spaces.
const GAP = "(?:[\\s\\-_.’'*~`\\u200b\\u200c\\u200d]|&nbsp;|%20|<[^>]{0,40}>){1,12}"

/** A name as a pattern: any case, any separator between words, accents ignored, "Adam's" matches "adams". */
export function namePattern(name: string): RegExp | undefined {
  const words = fold(name)
    .toLowerCase()
    .split(/[\s\-_]+/)
    .map(w => (w === '&' || w === 'and' ? '&' : w.replace(/[^\p{L}\p{N}]/gu, '')))
    .filter(w => w.length > 0)

  const letters = words.filter(w => w !== '&').join('')
  if (letters.length < 3) return undefined

  const parts = words.map(w => {
    if (w === '&') return '(?:&|&amp;|and)'
    const chars = [...w]
    const plural = chars.length > 2 && w.endsWith('s')
    const stem = (plural ? chars.slice(0, -1) : chars).map(escape).join("['’]?")
    return plural ? `${stem}['’]?s` : stem
  })

  return new RegExp(`(?<![\\p{L}\\p{N}])${parts.join(GAP)}(?![\\p{L}\\p{N}])`, 'giu')
}

/** A workspace folder such as brand/client--acme-plumbing becomes "acme plumbing". */
export function workspaceName(folder: string): string | undefined {
  const match = /^(?:client|biz)--(.+)$/.exec(folder)

  return match?.[1]?.replace(/-/g, ' ')
}

// Past this length a piece of text is hidden whole rather than searched.
const LONGEST = 50_000

/** Hides every private detail in one piece of text. */
export function redact(text: string, names: readonly string[], style: Style = 'bars'): string {
  if (text.length > LONGEST) return `[${text.length} characters hidden while screen share is on]`

  // Accented text is matched, and drawn, without its accents while sharing.
  let out = /[^\u0000-\u007f]/.test(text) ? fold(text) : text

  // Longest names first, so a longer client name goes before a shorter one inside it.
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    const pattern = namePattern(name)
    if (pattern !== undefined) out = out.replace(pattern, () => standIn('name', name, style))
  }

  for (const [kind, pattern] of PATTERNS) {
    out = out.replace(pattern, found => standIn(kind, found, style))
  }

  return out
}

/** The same, through any value: strings change, the shape stays. */
export function redactDeep(value: unknown, names: readonly string[], style: Style = 'bars'): unknown {
  if (typeof value === 'string') return redact(value, names, style)
  if (Array.isArray(value)) return value.map(v => redactDeep(v, names, style))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v, names, style)]))
  }

  return value
}

/** Every string blanked, for a row whose hook failed while sharing is on. */
export function blankDeep(value: unknown): unknown {
  if (typeof value === 'string') return value === '' ? '' : BAR
  if (Array.isArray(value)) return value.map(blankDeep)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankDeep(v)]))
  }

  return value
}

function unique(list: readonly string[]): string[] {
  const seen = new Set<string>()

  return list.filter(n => {
    const key = n.trim().toLowerCase()
    if (key === '' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function workspaceNames($: EngineInterface, cwd: string): Promise<string[]> {
  try {
    const entries = await $.fs.list(`${cwd}/brand`)

    return entries
      .filter(e => e.kind === 'dir')
      .map(e => workspaceName(e.name))
      .filter((n): n is string => n !== undefined)
  } catch {
    return []
  }
}

async function addedNames($: EngineInterface): Promise<string[]> {
  const saved = await $.store.get(NAMES_KEY)

  return Array.isArray(saved) ? saved.filter((n): n is string => typeof n === 'string') : []
}

async function announce($: EngineInterface, isOn: boolean) {
  $.ui.status(isOn ? 'SCREEN SHARE ON: private details hidden' : undefined)
}

/** Said whenever it turns on with no names: emails, phones and amounts are hidden, client names are not. */
function noNamesWarning(names: readonly string[]): string {
  return names.length > 0
    ? ''
    : '\n\nWARNING: no client names added yet, so client names WILL still show on screen. Add each one first, for example: /screen-share add Acme Plumbing'
}

const HELP = [
  '/screen-share            turn screen share mode on or off (made-up details unless you picked bars)',
  '/screen-share fake       turn it on with made-up names, emails, phone numbers and amounts',
  '/screen-share bars       turn it on with grey bars instead',
  '/screen-share add NAME   hide another name (a client, a person, a company)',
  '/screen-share remove NAME',
  '/screen-share list       show the names it hides',
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const names = unique([...(await workspaceNames($, e.cwd)), ...(await addedNames($))])
      const isOn = (await $.store.get(ON_KEY)) === true
      const style: Style = (await $.store.get(STYLE_KEY)) === 'bars' ? 'bars' : 'fake'

      await update($, shield, () => ({ isOn, names, style }))
      await announce($, isOn)

      await $.command.register({
        name: 'screen-share',
        description: 'Hide client names, emails, phone numbers, amounts and keys on screen (add, remove, list)',
      })
    } catch (error) {
      $.ui.toast(`Screen share mode did not start: ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'screen-share' }, async ($, e) => {
    try {
      const [verb = '', ...rest] = e.args.trim().split(/\s+/)
      const name = rest.join(' ').trim()
      const s = await read($, shield)

      if (verb === '') {
        const isOn = !s.isOn
        await $.store.set(ON_KEY, isOn)
        await update($, shield, x => ({ ...x, isOn }))
        await announce($, isOn)

        return {
          text: isOn
            ? (s.style === 'fake'
                ? `Screen share mode ON with made-up details. ${s.names.length} names become invented client names, emails and phone numbers become example ones and amounts show as $X,XXX. Keys show as bars. Claude still sees everything. Type /screen-share again to turn it off, or /screen-share bars for grey bars.`
                : `Screen share mode ON. ${s.names.length} names, plus emails, phone numbers, amounts and keys, now show as grey bars. Claude still sees everything. Type /screen-share again to turn it off, or /screen-share fake for made-up details.`) +
              noNamesWarning(s.names)
            : 'Screen share mode OFF. Everything shows again.',
          isTextDisplayOnly: true,
        }
      }

      if (verb === 'fake' || verb === 'bars') {
        const style: Style = verb
        await $.store.set(STYLE_KEY, style)
        await $.store.set(ON_KEY, true)
        await update($, shield, x => ({ ...x, isOn: true, style }))
        await announce($, true)

        return {
          text:
            style === 'fake'
              ? 'Screen share mode ON with made-up details. Each client gets the same invented name every time, emails and phone numbers become example ones and amounts show as $X,XXX. Keys still show as bars. Claude still sees the real data.' +
                noNamesWarning((await read($, shield)).names)
              : 'Screen share mode ON with grey bars.' + noNamesWarning((await read($, shield)).names),
          isTextDisplayOnly: true,
        }
      }

      if (verb === 'add' && name !== '') {
        if (namePattern(name) === undefined) {
          return { text: 'That name is too short to hide safely. Add at least 3 letters.', isTextDisplayOnly: true }
        }
        const names = unique([...s.names, name])
        await $.store.set(NAMES_KEY, unique([...(await addedNames($)), name]))
        await update($, shield, x => ({ ...x, names }))

        return { text: `Added. ${names.length} names are now hidden while screen share mode is on.`, isTextDisplayOnly: true }
      }

      if (verb === 'remove' && name !== '') {
        const drop = (list: readonly string[]) => list.filter(n => n.toLowerCase() !== name.toLowerCase())
        await $.store.set(NAMES_KEY, drop(await addedNames($)))
        await update($, shield, x => ({ ...x, names: drop(x.names) }))

        return { text: 'Removed.', isTextDisplayOnly: true }
      }

      if (verb === 'list') {
        if (s.isOn) {
          return {
            text: `Screen share mode is ON, hiding ${s.names.length} names. Turn it off to see the list, so it never shows on a shared screen.`,
            isTextDisplayOnly: true,
          }
        }
        const list = [...s.names].sort().join('\n')

        return {
          text: `Screen share mode is ${s.isOn ? 'ON' : 'OFF'}. Names it hides (${s.names.length}):\n${list}`,
          isTextDisplayOnly: true,
        }
      }

      return { text: HELP, isTextDisplayOnly: true }
    } catch (error) {
      return { text: `Screen share mode: ${String(error)}`, isTextDisplayOnly: true }
    }
  })

  // The drawing only. Each site rewrites its text props; if a hook fails while sharing
  // is on, the row draws blanked rather than as it was (it fails closed, not open).
  const SITES = [
    ['UserMessage', ['text']],
    ['AssistantMessage', ['text']],
    ['ToolUse', ['input', 'output']],
    ['ToolResult', ['output']],
    ['ToolGroup', ['calls']],
    ['CommandOutput', ['text']],
    ['InfoNotice', ['text']],
    ['Spinner', ['message']],
    ['ToolProgress', ['hint']],
    ['AskUserQuestion', ['questions']],
  ] as const

  for (const [component, keys] of SITES) {
    const rewrite = (props: Record<string, unknown>, change: (v: unknown) => unknown) =>
      Object.fromEntries(Object.entries(props).map(([k, v]) => [k, (keys as readonly string[]).includes(k) ? change(v) : v]))

    on('ui.render', { component } as { component: 'UserMessage' }, async ($, e, next) => {
      const s = await read($, shield)
      if (!s.isOn) return next(e)

      const props = rewrite(e.props as Record<string, unknown>, v => redactDeep(v, s.names, s.style))
      return next({ ...e, props } as typeof e)
    }).catch(async ($, e, next) => {
      const isOn = await read($, shield)
        .then(s => s.isOn)
        .catch(() => true)
      if (!isOn) return next(e)

      const props = rewrite(e.props as Record<string, unknown>, blankDeep)
      return next({ ...e, props } as typeof e)
    })
  }

  // Subagent rows (the desktop app's background tasks list): their label, and their task when it holds a detail.
  on('ui.render', { component: 'AgentRow' }, async ($, e, next) => {
    const s = await read($, shield)
    if (!s.isOn) return next(e)

    const label = e.props.label === undefined ? undefined : redact(e.props.label, s.names, s.style)
    const task = redact(e.props.description, s.names, s.style)
    const props = { ...e.props, ...(label === undefined ? {} : { label }), ...(task !== e.props.description ? { body: task } : {}) }

    return next({ ...e, props })
  }).catch(async ($, e, next) => {
    const isOn = await read($, shield)
      .then(s => s.isOn)
      .catch(() => true)

    return isOn ? next({ ...e, props: { ...e.props, isHidden: true } }) : next(e)
  })

  // Team Board's band shows the current plan step, which often names a client: leave it out while sharing.
  on('ui.render', { component: 'AbovePromptList' }, async ($, e, next) => {
    const s = await read($, shield)
    if (!s.isOn) return next(e)

    return next({ ...e, props: { ...e.props, rows: e.props.rows.filter(r => r.plugin !== 'team-board') } })
  }).catch(($, e, next) => next(e))

  // New workspace folders are picked up between turns, not only at the start.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      try {
        const cwd = await $.session.cwd()
        const names = unique([...(await workspaceNames($, cwd)), ...(await addedNames($))])
        const s = await read($, shield)
        if (names.length !== s.names.length) await update($, shield, x => ({ ...x, names }))
      } catch {
        // Keep the names already known.
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // A clear band above the message box while it is on, with a button to turn it off.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, shield)
    if (!s.isOn || e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text bold color="warning">
          SCREEN SHARE ON{' '}
        </Text>
        {s.names.length === 0 ? (
          <Text bold color="error">
            no client names added, they still show (/screen-share add NAME){' '}
          </Text>
        ) : (
          <Text dimColor>
            {s.style === 'fake' ? 'showing made-up names and numbers ' : 'names, emails, phone numbers, amounts and keys hidden '}
          </Text>
        )}
        <Button
          key="off"
          label="Turn off"
          onPress={async () => {
            await $.store.set(ON_KEY, false)
            await update($, shield, x => ({ ...x, isOn: false }))
            await announce($, false)
          }}
        />
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
