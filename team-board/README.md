# Team Board for Claude

See what your AI team is doing while Claude works, instead of waiting and wondering.

## What you get

- **A progress band above the message box.** When Claude works through a plan, a bar fills as each step is ticked off and the band names the step it is on now. It also counts the helper agents still working.
- **A side panel with a card for every subagent.** Each helper Claude starts gets its own colored card: what it was asked to do, whether it is still working, how many tool calls it has made and which one it used last, plus its tokens and estimated cost.
- **The whole chat's estimated cost** at the bottom of the panel. These figures are estimates from the app, not your bill.

The panel opens by itself the first time Claude starts a subagent. Type `/team-board`, or press the Team Board button in the band, to open it any time.

## Good to know

- It uses no tokens: it only watches and draws, nothing is sent to the model.
- It works in the Claude desktop and mobile apps. Finished agents stay on the board until you start a new chat.

## Install

In a terminal session of Claude Code, type:

```
/plugin install team-board --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install team-board --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.
