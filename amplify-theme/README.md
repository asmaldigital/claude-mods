# Amplify theme for Claude

Simplify AI. Amplify Growth.

Amplify is a theme for the Claude desktop and mobile apps, built from the Asmal Digital palette: Deep Navy, Electric Cyan, Teal and Asmal Orange.

## What you get

- **Light mode:** cool, low-glare grays tinted with navy, and navy text that stays sharp through long sessions.
- **Dark mode:** a Deep Navy version of the same look, not a flipped copy of light mode.
- **Colors that mean something:** orange marks the main actions, cyan marks AI, teal marks progress and success. Red still means danger and gold still means warning.
- **A living backdrop:** cyan, teal and orange glows drift across the top, and a tower of 8 blocks rises in the corner, away from the chat and the message box. If you have reduced motion turned on in your system settings, the animation stops and the scene rests still.
- **The momentum game:** every real move you make (an edit, a new file, a command) earns a point. Every 5 points lights a block cyan, and a pulse of light climbs the tower. Light all 8 and the top block bursts orange: you are AMPLIFIED and move up a level. Your level and today's moves sit in the status line, and they carry over between sessions.
- **Mission control (top left):** a glowing core that shows what Claude is doing right now. Teal and still means YOUR MOVE. Cyan with spinning orbits means CLAUDE IS BUILDING. Orange with a pulsing beacon means NEEDS YOUR OK: Claude is waiting for your approval or your answer. The whole glow across the top of the screen changes to the same color.
- **Context ring:** a ring around the core fills as the chat's context window fills: teal while there is room, amber from 60 percent, red from 80. A thinner inner ring shows your usage limit when your plan reports one.
- **No extra tokens:** the theme and the game never talk to the model. Everything is drawn by the app.
- **`/look`:** pick a backdrop. `/look` lists them; `/look dubai`, `/look mission`, `/look dunes` or `/look core` switches. Each scene follows your light or dark setting, and its sky, lights and dials take on the state color. Your pick is remembered.
- **Finish celebration:** when Claude finishes a turn that did real work, fireworks and shooting stars play over the backdrop for a few seconds. Plain replies get none, and reduced motion turns it off.
- **`/amplify-focus`:** type it to switch the backdrop off for deep work. The colors stay. Type it again to bring the backdrop back. Your choice is remembered.

## Where it shows

The desktop app and the mobile app. The terminal and editor versions of Claude Code don't show themes.

## Install

In a terminal session of Claude Code, type:

```
/plugin install amplify-theme --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install amplify-theme --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.

## Credits

`hooks/make-colors.js` is Anthropic's colour and contrast helper from the Claude Code mod toolkit, included unchanged as the toolkit asks. It is Anthropic's work and is not covered by this mod's MIT licence. Everything else in this folder is covered by it.
