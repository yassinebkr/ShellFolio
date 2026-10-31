# ShellFolio

A **customizable terminal portfolio for GitHub Pages** with a Debian/XFCE-inspired
interface, a virtual filesystem, shell-style commands, and configurable
shortcuts.

The [live example](https://yassinebkr.github.io/ShellFolio/) presents my
electronics, embedded Linux and software projects. Fork this repository to
present your own work.

**The animated SVG below is a preview, not an interactive terminal. Click it to try the live demo.**

[![Animated ShellFolio terminal showing virtual commands and shortcuts](assets/terminal-demo.svg)](https://yassinebkr.github.io/ShellFolio/)

## Explore

- **Start:** an animated `./launch-interactive.sh` introduction appears on arrival.
- **Navigate:** try `help`, `projects`, `skills`, `ls`, or `inspect lora`.
- **Shortcuts:** Run, Clean and project navigation stay below the terminal.
- **Keyboard:** type without clicking after the intro; Tab/→ completes commands and ↑/↓ navigates history.
- **Copy:** select and copy output using the browser's standard controls.

Selecting a shortcut prints the full command immediately, then shows its
result after a brief pause. A **ShellFolio on GitHub** link in the bottom bar
opens the source repository.

## Customize

| Change | File |
| --- | --- |
| Shortcut labels and preset responses | [`portfolio.config.js`](portfolio.config.js) |
| Projects, commands, virtual filesystem | [`engine.js`](engine.js) |
| Introductory sequence | [`launch-script.js`](launch-script.js) |
| Window and colors | [`style.css`](style.css) |
| Source repository link | [`portfolio.config.js`](portfolio.config.js) → `repositoryLink` |

See the [customization guide](docs/CUSTOMIZATION.md) for examples and setup.

## Develop

```bash
python3 -m http.server 8000
# Open http://localhost:8000/
```

```bash
npm test
node --check app.js
```

GitHub Pages serves the project from `main` at the repository root.

[Architecture and development](docs/DEVELOPMENT.md) ·
[Customize ShellFolio](docs/CUSTOMIZATION.md) ·
[Credits](docs/CREDITS.md)
