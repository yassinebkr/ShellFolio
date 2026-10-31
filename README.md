# ShellFolio

**Your portfolio. Your terminal. Your rules.**

An interactive, customizable Linux-style terminal experience for showcasing projects, skills, and experience directly in the browser.

ShellFolio currently provides a read-only virtual filesystem and a curated set of simulated commands, styled after Debian and XFCE Terminal. The browser handles navigation, command history, tab completion and interactive project exploration.

## Live demo

https://yassinebkr.github.io/ShellFolio/

GitHub Pages must be enabled for the public repository at **Settings → Pages → Deploy from a branch → main → /(root)**. The URL becomes active after GitHub completes its first deployment.

## How to explore

Try `help`, `ls -l workspace`, `cd workspace/projects`, `cat README.md`, `tree`, `skills`, `projects`, or `inspect lora`. Use Tab for completion, ↑/↓ for history, and Ctrl+L for clearing terminal output.

The shell is a portfolio simulation: commands operate on documented sample data in the browser and do not execute operating-system programs.

## Architecture

The public repository contains only the deployable static website:

- `index.html` — semantic browser interface
- `style.css` — Debian/XFCE-inspired presentation
- `app.js` — browser interaction and command rendering
- `engine.js` — deterministic read-only virtual shell
- `assets/debian.svg` — Debian artwork

More extensive development tooling, scripts and documentation remain in the private development repository while the project evolves.

## Acknowledgements

**Special thanks to [AienTech](https://github.com/AienTech)** and the beautiful animated terminal in [AienTech/aientech](https://github.com/AienTech/aientech), which inspired the original GitHub README terminal experiment. ShellFolio's interactive web interface and virtual shell were developed independently.

The Debian swirl artwork is derived from [Simple Icons' Debian vector](https://github.com/simple-icons/simple-icons/blob/develop/icons/debian.svg). For branding, copyright and licensing details, see the [Debian logo guidelines](https://www.debian.org/logos/).

## Project status

ShellFolio is an evolving personal portfolio prototype, with a reusable terminal interface as a longer-term goal.
