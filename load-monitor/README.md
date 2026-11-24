# Load for Claude

See how hard your Mac is working without opening Activity Monitor.

## What you get

- **A small band above the message box** with three live bars: CPU, RAM and GPU, each with its percentage. Teal means there is room, amber from 60%, red from 85%.
- **A spike warning.** When CPU jumps suddenly, a red line names the process behind it, so you know whether it is Claude's work, a build, or something else on your Mac.
- **Refreshes every 4 seconds** while it shows, and stops reading the moment you hide it.

## Commands

- `/load` shows or hides the band. The Hide button on the band does the same. Your choice is remembered for new chats.

## Good to know

- It uses no tokens. It reads the Mac's own numbers with small built-in commands (ps, vm_stat, sysctl and ioreg), with no AI.
- Made for macOS. Where a reading is not available, its bar shows n/a.

## Install

In a terminal session of Claude Code, type:

```
/plugin install load-monitor --marketplace asmaldigital/claude-mods
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It loads in the desktop app's Code tab too.

From a shell:

```bash
claude plugin install load-monitor --marketplace asmaldigital/claude-mods
```

In the desktop app, where `/plugin` does not run: click + next to the message box, then Plugins, Add marketplace with `asmaldigital/claude-mods`, then Add plugin.
