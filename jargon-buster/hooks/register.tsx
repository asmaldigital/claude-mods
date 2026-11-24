import type { Register } from 'claude-code'

// Jargon Buster. Asks Claude, in this same chat, to say it again in plain language.
// It sends one normal message, so it uses a little plan usage, like any message.

const RULES = [
  'Write for someone who has never written code or used technical tools.',
  'Use short sentences and everyday words.',
  'Where a technical word has to stay, explain it in a few plain words the first time it appears.',
  'Do not redo or change any work, and do not run any tools. Only explain.',
  'Do not use em dashes.',
].join(' ')

/** The message sent to Claude for a command's arguments. */
export function plainPrompt(args: string): string {
  const question = args.trim()

  if (question === '') {
    return `Explain your last reply again in plain language: what you did, why, and what it means for me. Keep it to a short paragraph or a few bullet points. ${RULES}`
  }

  return `Answer this question in plain language, in the context of this chat: ${question} Keep it short. ${RULES}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'jargon-buster',
        description: 'Re-explain the last reply in plain language, or ask what a term means',
      })
    } catch (error) {
      $.ui.toast(`Jargon Buster: /jargon-buster not added. ${String(error)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'jargon-buster' }, async ($, e) => {
    try {
      const text = plainPrompt(e.args)

      // A prompt cannot be sent while this command still holds the chat, so it goes
      // just after the command returns. If the app refuses even that, the request
      // lands in the message box for one press of Enter.
      void (async () => {
        try {
          await $.clock.sleep(50)
          await $.prompt.submit({ text })
        } catch {
          try {
            await $.prompt.fill({ text, mode: 'replace' })
            $.ui.toast('Jargon Buster: press Enter to send the plain-language request.')
          } catch {
            // Nothing more to try; the command's own line already showed.
          }
        }
      })()

      return {
        text: e.args.trim() === '' ? 'Putting that in plain language...' : `Answering in plain language: ${e.args.trim()}`,
        isTextDisplayOnly: true,
      }
    } catch (error) {
      return { text: `Jargon Buster could not ask Claude: ${String(error)}`, isTextDisplayOnly: true }
    }
  })
}
