# Customize ShellFolio

Fork the repository and replace the sample projects with your own. Most
visitor-facing labels and responses live in `portfolio.config.js`.

## What to edit

| Feature | File |
| --- | --- |
| Shortcut buttons | `portfolio.config.js` → `quickActions` |
| Custom commands and responses | `portfolio.config.js` → `presetResponses` |
| Projects and virtual folders | `engine.js` |
| Introductory content | `launch-script.js` |
| Terminal appearance | `style.css` |
| Source repository link | `portfolio.config.js` → `repositoryLink` |
| Initial route | `startup.js` |

## 1. Choose the shortcuts

```js
export const quickActions = Object.freeze([
  { label: 'Run', command: './launch-interactive.sh' },
  { label: 'Clean', command: 'clean' },
  { label: 'Projects', command: 'projects' },
  { label: 'Contact', command: 'contact' }
]);
```

The labels remain visible under the terminal. Every shortcut calls the same
virtual command interpreter as typed input. A separate **ShellFolio on GitHub**
link opens the source repository; change `repositoryLink` when forking.

## 2. Add your own responses

In `portfolio.config.js`:

```js
export const presetResponses = Object.freeze({
  contact: {
    description: 'Contact information',
    lines: [
      'Contact',
      'GitHub: https://github.com/your-account'
    ]
  }
});
```

Then register `{ label: 'Contact', command: 'contact' }` as a shortcut.

Preset commands return escaped text and cannot execute scripts or system
commands. Review public-facing contact information before publishing.

## 3. Set up the introduction

Edit `launch-script.js`:

| Step | Effect |
| --- | --- |
| `line` | Print a complete line |
| `type` | Reveal a line progressively |
| `progress` | Update an ASCII activity indicator |

Finish by inviting visitors to type `help` or use the shortcuts.

## 4. Test the interactions

| Action | Expected behavior |
| --- | --- |
| Click a shortcut | Full command appears; result follows after 280 ms |
| Click Run | Replay the introduction |
| Click Clean | Clear visible terminal output |
| Select output | Normal browser selection and copy |
| Press Escape | Complete the active introduction |
| Press Ctrl+C | Copy selected text or interrupt active playback |
| Enable reduced motion | Avoid unnecessary animation delays |

The File/Edit/View/Terminal/Tabs/Help menu labels are decorative.

## 5. Test and publish

```bash
npm test
node --check app.js
python3 -m http.server 8000
```

Inspect `http://localhost:8000/`, including narrow screens and keyboard
navigation. GitHub Pages serves the `main` branch from the root directory.

**All static configuration is public.** Keep passwords, private addresses and
unpublished project details out of the repository.
