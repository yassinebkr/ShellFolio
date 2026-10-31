# Customize ShellFolio

The site can be personalized without changing its renderer or running a
server. Start with **`portfolio.config.js`**.

## Quick-start map

| What to change | File |
| --- | --- |
| Clickable shortcuts | `portfolio.config.js` → `quickActions` |
| New text responses | `portfolio.config.js` → `presetResponses` |
| Virtual projects and filesystem | `engine.js` |
| Intro text and progress steps | `launch-script.js` |
| Animation timing in README | `tools/demo_timing.py` |
| Window sizing and shortcut styling | `style.css` |
| README demo commands | `tools/make_demo.py` |

## 1. Choose visitor shortcuts

Edit the `quickActions` array:

```js
export const quickActions = Object.freeze([
  { label: 'Run', command: './launch-interactive.sh' },
  { label: 'Clean', command: 'clean' },
  { label: 'Projects', command: 'projects' },
  { label: 'Contact', command: 'contact' }
]);
```

The shortcuts appear in a compact **text strip below the terminal**, remain
visible while its output scrolls, and execute the same virtual commands as
keyboard input. Avoid duplicate destinations and overly long labels.

## 2. Add predefined responses

Add a command key under `presetResponses`:

```js
export const presetResponses = Object.freeze({
  contact: {
    description: 'How to get in touch',
    lines: [
      'Contact',
      'GitHub: https://github.com/your-account'
    ]
  }
});
```

Then add `{ label: 'Contact', command: 'contact' }` to `quickActions`.

- Each key becomes a read-only terminal command with completion support.
- Response text is escaped; it does not run Bash, JavaScript or HTTP.
- Review every public claim, URL and contact detail before publishing.

## 3. Set the introductory experience

Edit `launch-script.js` to change the simulated introduction.

| Step | Output |
| --- | --- |
| `line` | Print a complete line |
| `type` | Reveal a line progressively |
| `progress` | Update a temporary ASCII loading indicator |

Finish with a clear invitation to type **`help`** or use the shortcuts below.
The normal URL starts the intro; `?view=listing` skips it.

**Interaction:** Esc finishes the script; Ctrl+C interrupts it when nothing
is selected. Shortcuts remain available during playback. Selected text can
still be copied normally.

## 4. Set the timings

There are **two different animation mechanisms**:

| Where | Timing |
| --- | --- |
| Clickable website shortcuts | Full command appears immediately, then a 280 ms pause |
| GitHub README SVG | Empty prompt appears quickly; writing begins after a small pause |

For the README SVG, edit `tools/demo_timing.py`:

```python
COMMAND_PACING_MS = {
    "cd": {"execution": 80, "pause_after": 190},
    "ls": {"execution": 130, "pause_after": 200},
    "inspect": {"execution": 220, "pause_after": 220},
}
```

All values are **milliseconds**, purely visual, not real execution times.

The result appears after `execution`. A blank prompt appears **60 ms**
later; the next command starts typing after `pause_after`. The number of
output lines affects only vertical layout, **never** these delays.

## 5. Update the README SVG

The website and SVG share shortcut labels from `portfolio.config.js`, but
only the website's buttons are interactive.

```bash
npm run demo
git diff -- assets/terminal-demo.svg
```

The preview uses unboxed XFCE menu labels, 21 px terminal rows and a dynamic
height. It plays **once**, retains its final frame and never erases the
commands backward. Do not manually edit the generated SVG.

## 6. Test and publish

```bash
npm test
python3 -m unittest discover -s tests -p 'test_demo_timing.py'
node --check app.js
npm run demo
python3 -m http.server 8000
```

Inspect `http://localhost:8000/` at desktop and mobile widths, then verify
the intro, Run/Clean, Tab completion, copy/paste and shortcut interruptions.

GitHub Pages publishes `main` / `/(root)`. Every file in the public static
repository is accessible to visitors: **never commit secrets or private
project information**.

## Related work

The [GitHub profile SVG generator](https://github.com/yassinebkr/test) is
maintained separately. The original terminal-profile experiment was inspired
by [AienTech](https://github.com/AienTech/aientech).
