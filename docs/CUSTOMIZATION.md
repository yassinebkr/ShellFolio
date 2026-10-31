# Customizing ShellFolio

ShellFolio is a read-only virtual terminal. You can adapt the content and
interaction paths without implementing a new renderer or running a server.

The configuration entry point is **`portfolio.config.js`**. The application
reads its definitions at startup; `app.js` builds the visitor
shortcuts automatically. The XFCE menu labels are decorative. GitHub Pages serves this as a static site.

## 1. Decide what a visitor should discover

Start from your portfolio's highest-value evidence. Define three to seven
shortcuts that cover an introduction, concrete projects, relevant skills,
and a way to get in touch. Avoid repeating the same destinations under
different labels. Prefer verified measurements to broad claims.

A shortcut has two independent pieces: a human-readable label and a
command the virtual interpreter can execute.

```js
export const quickActions = Object.freeze([
  { label: 'Projects', command: 'projects' },
  { label: 'LoRa project', command: 'inspect lora' },
  { label: 'Contact', command: 'contact' }
]);
```

The suggestions are rendered **under the terminal output**, remain in view
when its history scrolls, and call the same interpreter as a typed command.
They are not placeholders or prewritten HTML output.

## 2. Add your predefined responses

The `presetResponses` object in `portfolio.config.js` defines additional
**read-only simulated commands**. For example:

```js
export const presetResponses = Object.freeze({
  contact: {
    description: 'Public contact information',
    lines: [
      'Contact',
      'GitHub: https://github.com/your-account',
      'Explore my public work and get in touch through GitHub.'
    ]
  },
  availability: {
    description: 'Areas of interest',
    lines: [
      'Current interests: embedded Linux, digital design, RF systems.'
    ]
  }
});
```

Add `{ label: 'Interests', command: 'availability' }` to `quickActions`
to expose that response without asking visitors to type.

Each preset key is registered as a command, appears in shell completion,
and returns its text through the existing safe renderer. Presets accept
no arguments; they never execute JavaScript, Bash, HTTP calls or system
commands. External URLs in ordinary response strings display as text.
Only the interpreter's curated links are clickable.

## 3. Run and Clean

The persistent quick-action rail starts with **Run** and **Clean**. Run replays
the simulated `./launch-interactive.sh`; Clean executes the virtual `clean`
command. `clean`, `clear`, and `reset` empty the entire visible terminal,
including its initial neofetch output, without changing the working directory.

While a script runs, the live Bash prompt is hidden until completion or
interruption. The quick-action rail stays visible. Selecting a quick action
interrupts the current animation; Escape finishes it, and Ctrl+C cancels it.

The File/Edit/View/Terminal/Tabs/Help menu labels and window controls are
**visual-only**, intentionally without click handlers or misleading actions.
The command prompt and quick-action buttons provide real interaction.

## 4. Personalize project evidence and the introductory script

Change the virtual filesystem and the built-in commands in `engine.js`,
including project descriptions, dates, repository links and technical
results. Review measurements carefully and label unverified performance
targets as targets.

Edit `launch-script.js` to change the progressive introduction. It
contains declarative steps: `line`, `type` and `progress`. These
are simulated portfolio operations, not actual hardware diagnostics.
The browser renderer handles pacing, Esc to finish, Ctrl+C to interrupt,
and reduced-motion accessibility.

`startup.js` selects the default introduction. Use `?view=listing`
to enter directly with the workspace listing. `?run=launch` is a
supported explicit launcher link.

## 5. Styling and README demonstration

Use `style.css` for window proportions, fonts, dropdowns and the
persistent visitor-shortcut rail. The visual rendering is intentionally
separate from content configuration.

`assets/demo.svg` is the generated animated preview used in this
repository's README. Do not edit its generated markup by hand:
`tools/make_demo.py` replays commands through the real `engine.js`
and produces the preview. Its menus are visual approximations of the
website, not functional SVG controls.

The related Python SVG generator for the GitHub profile README lives in
a separate repository: https://github.com/yassinebkr/test

## 6. Test and publish

From the ShellFolio repository root:

```bash
npm test
node --check app.js
node --check engine.js
node --check portfolio.config.js
python3 tools/make_demo.py
git diff -- assets/demo.svg
python3 -m http.server 8000
```

Inspect `http://localhost:8000/` in a browser. Check both desktop and
mobile widths. Try Run, Clean, other quick actions, Tab completion, keyboard navigation
and introductory replay. Confirm the XFCE menu chrome is inert.

GitHub Actions validates the source and demo on every push. GitHub Pages
publishes the repository's `main` branch from `/(root)`.

**Privacy:** every value in the static JavaScript configuration is public
once deployed. Do not add passwords, private addresses, secrets, or
unpublished project information.

## Related work and acknowledgements

The original animated GitHub profile terminal was inspired by
[AienTech's terminal work](https://github.com/AienTech/aientech).
ShellFolio's interactive browser shell and customization features are
independently developed.
