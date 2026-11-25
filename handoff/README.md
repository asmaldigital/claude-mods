# Handoff for Claude

Long chats get worse: the fuller the context window, the more Claude misses details. Handoff moves your work to a fresh chat at the right moment, without losing where you were.

## How it works

- **It speaks up on its own.** Once the chat passes 55% context, a band above the message box offers to prepare a handoff. Press Later to hide it for this chat.
- **Or type `/handoff` any time.** The handoff is shown right there in the chat, so you can read and copy it. If another plugin already uses `/handoff` (Command Center does), the command is `/handoff-chat` instead.
- **It packs everything a fresh chat needs:** where the work started, your latest request, the plan and which steps are done, the files changed, the files read, the skills used, recent commands, the links you shared, and Claude's last reply, marked as earlier context.
- **Secrets stay out.** Keys, tokens, passwords, logins inside links and link query strings are removed before the handoff is saved, copied or shown. Raw commands are left out; only their descriptions go in.
- **Pick up in a new chat.** Open a new chat in the same folder and a band shows "Handoff waiting". Press Pick up and the handoff lands in your message box, ready to send. It is offered for 48 hours, then deleted. Not now deletes it too.
- **Copying.** It tries to copy the handoff to your clipboard, but the app cannot always reach the clipboard. When it can't, the band's Prepare handoff button puts the text in your message box so you can copy it from there, and `/handoff` shows it in the chat.

## Good to know

- It uses no tokens. It reads the chat and writes the handoff itself, with no AI.
- The new chat is told to read the changed files and confirm the next step with you before changing anything.
- Each folder keeps its own handoff. If several clients share one folder, a handoff from one client's chat can be offered in another's, so read it before you send it.
- Check the text before you pass it to someone else. It is built from your chat, so it can hold names or details you would not want to share.
- It works in the Claude desktop and mobile apps.

## Install

In a terminal session of Claude Code, type:

```
/plugin install handoff --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install handoff --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.
