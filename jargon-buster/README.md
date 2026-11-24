# Jargon Buster for Claude

Claude often reports back in technical words. Jargon Buster puts it in plain language so anyone can follow what was done.

## How to use it

- Type `/jargon-buster` after any reply. Claude explains that reply again in everyday words: what it did, why, and what it means for you. It does not redo or change any work.
- Type `/jargon-buster` followed by a question, for example `/jargon-buster what is an endpoint`, and Claude answers just that, in plain words, about your chat.

## Good to know

- It sends one normal message to Claude in the same chat, so it uses a little of your plan, like any message. There is no extra AI model behind it.
- It works in the Claude desktop and mobile apps, and in the terminal.

## Install

In a terminal session of Claude Code, type:

```
/plugin install jargon-buster --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install jargon-buster --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.
