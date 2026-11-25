# Claude mods by Asmal Digital

Six free mods for the Claude app and Claude Code. Each one changes how Claude looks or works, and none of them spends extra tokens unless its README says so.

| Mod | What it does | Install |
|---|---|---|
| [Amplify theme](./amplify-theme) | Amplify: a navy, cyan and orange look for the Claude desktop and mobile apps that turns your work into a momentum game, plus an /amplify-focus switch. | `/plugin install amplify-theme --marketplace asmaldigital/claude-mods` |
| [Handoff](./handoff) | Handoff: when a chat gets long, packs the goal, plan, files, skills, links and last reply into a handoff prompt, copies it, and offers a Pick up button in your next fresh chat. No AI, no tokens. | `/plugin install handoff --marketplace asmaldigital/claude-mods` |
| [Jargon Buster](./jargon-buster) | Jargon Buster: type /jargon-buster and Claude re-explains its last reply in plain, beginner language, or answers one question you add, without redoing any work. | `/plugin install jargon-buster --marketplace asmaldigital/claude-mods` |
| [Load](./load-monitor) | Load: a small band above the message box with live CPU, RAM and GPU bars for this Mac, and a warning that names the process when CPU spikes. No AI, no tokens. Type /load to show or hide it. | `/plugin install load-monitor --marketplace asmaldigital/claude-mods` |
| [Screen share mode](./screen-share-mode) | Screen share mode: type /screen-share before a call or recording. Emails, phone numbers and amounts are hidden on screen, and so are the client names you add with /screen-share add. Claude still sees the real chat. | `/plugin install screen-share-mode --marketplace asmaldigital/claude-mods` |
| [Team Board](./team-board) | Team Board: a progress bar above the message box for the plan Claude is working through, and a side panel with a live card for every subagent: what it is doing, its tool calls, tokens and estimated cost. | `/plugin install team-board --marketplace asmaldigital/claude-mods` |

## How to install

In a terminal session of Claude Code, type the install line from the table, answer `y` to add the marketplace, then press Enter to install it for your user. Mods installed this way also load in the desktop app's Code tab.

From a shell, use `claude plugin install <mod> --marketplace asmaldigital/claude-mods`.

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.

You need a recent version of Claude Code or the Claude desktop app with mod support. Load reads your computer's CPU, RAM and GPU and is made for macOS.

## Licence

Each mod is MIT licensed; see the LICENSE file in its folder. One file is not ours: `amplify-theme/hooks/make-colors.js` is Anthropic's colour and contrast helper from the Claude Code mod toolkit, included unchanged and not covered by our licence.
