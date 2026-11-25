# Screen share mode for Claude

Turn it on before a screen share, a sales call, a training or a recording, and private details in your chats show as made-up stand-ins on screen, or as grey bars if you prefer. Claude still reads your real chat, so its work is unaffected.

It is a helper, not a guarantee. It hides the names you give it and the kinds of details listed below. Always glance over your screen before you share it.

## Before your call

1. Add the names you expect to come up: `/screen-share add Acme Plumbing`. Add each client, company and person by their full name. **It does not know your client names until you add them.** If you turn it on with no names added, the band says so in red, and client names still show.
2. Type `/screen-share` to turn it on. An orange band above the message box shows while it is on, with a Turn off button.
3. Scroll back through the chat you will show and check it.

(If the folder you open in Claude has a `brand` folder with one folder per client named `client--name` or `biz--name`, those names are added for you as well.)

## What it hides

- **Names you added**, in any capitals, with or without accents, with dashes, markdown bold, `&` or "and" between the words, and inside file paths.
- **Email addresses**, including encoded ones.
- **Phone numbers** with 9 or more digits, short ones written like 555-0100, and extensions.
- **Money amounts**, shown as $X,XXX so nobody reads a wrong price off the screen, with a currency sign or code on either side ($, €, £, R, Rs, AED, USD, ZAR, CHF, BTC and others), amounts in thousands or millions, amounts like 40k, and numbers after words like fee, price, salary or budget.
- **Keys, tokens and passwords** that look like the common formats, `password: ...` style lines, and passwords inside web addresses.
- Any single piece of text longer than 50,000 characters is hidden whole.

It covers your messages, Claude's replies, tool calls and their results, grouped tool rows, command output, notices, the working line, question dialogs and subagent rows. While it is on, the Team Board band is left out, since its plan step often names a client. If any part fails to process while sharing is on, that part is blanked rather than shown.

## What it cannot hide

- A first name or surname on its own, nicknames and initials (add those as their own names if you need them).
- What you type in the message box before you send it.
- Pop-up toasts, chat titles in the sidebar, the window title, file previews, side panels (the Team Board panel included: close it before you share), other mods' bands and panels, and other apps.
- Anything it has no pattern for, such as a phone number written in words.

## Commands

- `/screen-share` turns it on or off. Your choice is remembered for new chats.
- By default it shows made-up stand-ins: each client gets the same invented name every time, emails and phone numbers become example ones and amounts show as $X,XXX. Keys always show as bars.
- `/screen-share bars` switches to grey bars instead, and `/screen-share fake` switches back to made-up details. Your pick is remembered.
- `/screen-share add NAME` hides another name.
- `/screen-share remove NAME` stops hiding a name you added.
- `/screen-share list` shows the names it hides. While sharing is on it only shows how many, so the list never appears on a shared screen.

## Good to know

- It uses no tokens: nothing is sent to the model.
- While it is on, accented letters in the chat show without their accents.
- It may also hide some harmless numbers, such as long IDs.

## Install

In a terminal session of Claude Code, type:

```
/plugin install screen-share-mode --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install screen-share-mode --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.
