# ShellFolio

A **customizable terminal portfolio for GitHub Pages** with a Debian/XFCE-inspired
interface, a virtual filesystem, shell-style commands, and configurable
shortcuts.

The [live example](https://yassinebkr.github.io/ShellFolio/) presents my
electronics, embedded Linux and software projects. Fork this repository to
present your own work.

**[Open the interactive demo](https://yassinebkr.github.io/ShellFolio/)**

## Explore

- **Start:** an animated `./launch-interactive.sh` introduction appears on arrival.
- **Navigate:** try `help`, `projects`, `skills`, `ls`, or `inspect lora`.
- **Shortcuts:** Run, Clean and project navigation stay below the terminal.
- **Keyboard:** Tab/→ completes commands; ↑/↓ navigates history.
- **Copy:** select and copy output using the browser's standard controls.

Selecting a shortcut prints the full command immediately, then shows its
result after a brief pause.

## Customize

| Change | File |
| --- | --- |
| Shortcut labels and preset responses | [`portfolio.config.js`](portfolio.config.js) |
| Projects, commands, virtual filesystem | [`engine.js`](engine.js) |
| Introductory sequence | [`launch-script.js`](launch-script.js) |
| Window and colors | [`style.css`](style.css) |

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
