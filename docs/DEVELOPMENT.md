# ShellFolio: architecture and development

## Scope

ShellFolio is a client-side, read-only terminal simulator presenting a curated engineering portfolio. Its command interpreter models a virtual filesystem and responds with structured, styled segments. The browser builds corresponding DOM text nodes and vetted external links.

- `index.html`: XFCE-inspired application structure and accessible input
- `style.css`: window chrome, typography, layout and responsive breakpoints
- `app.js`: input events, command history, output rendering, completion hints
- `engine.js`: parser, virtual filesystem, commands and completion candidates
- `assets/demo.svg`: animated command replay for this repository's README
- `tools/make_demo.py`: Python demonstration generator invoking the **same** Node.js command interpreter as the browser
- `tests/engine.test.mjs`: deterministic unit tests for navigation, commands and completions
- `.github/workflows/verify.yml`: CI checks for JavaScript, SVG reproducibility and static assets

## Commands and interactions

Commands include `help`, `ls -l`, `cd`, `pwd`, `cat`, `tree`, `skills`, `projects`, `inspect`, `history`, and `clear`. The `Tab` and `→` keys accept a unique inline completion; when candidates are ambiguous, `Tab` lists them. The up/down arrows navigate command history. Output uses text nodes and a curated link allowlist.

The XFCE menu labels and window controls remain non-interactive visual chrome. The Run and Clean quick actions are interactive; Clean resets the entire visible terminal. The active prompt remains hidden throughout script playback and returns only after completion or interruption.

## Personalization

Quick actions, their labels and optional predefined responses are
configured in `portfolio.config.js`. See the [customization guide](CUSTOMIZATION.md)
for a step-by-step walkthrough rather than editing `app.js` directly.

## Test and replay

```bash
npm test
node --check app.js
node --check engine.js
python3 tools/make_demo.py
```

`tools/make_demo.py` invokes the virtual shell and replays its responses into an animated, self-contained SVG. GitHub Actions confirms the generated SVG matches the version tracked in Git.

## Repository separation

This repository owns every file used to develop, test, document and publish the interactive GitHub Pages site. The complementary profile-README SVG generator is maintained separately at <https://github.com/yassinebkr/test>; it is intended to become a distinct public repository after its name and documentation are finalized.

The two projects can reference each other's published documentation while retaining independent codebases and build pipelines.

## GitHub profile launcher integration

The separate SVG profile README links to `https://yassinebkr.github.io/ShellFolio/?run=launch`.
The normal Pages route and the explicit `run=launch` route both begin with a
typed Bash-style `./launch-interactive.sh` invocation, followed by its
progressive read-only virtual transcript. The explicit `view=listing` route
instead shows the original directory listing. Nothing is fetched or run on the host machine.

Suggested commands are normal buttons below the prompt; clicking one invokes the
same interpreter as pressing Enter. Inline completion and Tab remain supported.

## Responsive bounds

The desktop XFCE window has a finite width/height, with the page canvas as a
neutral surround. The system-information panel uses a fixed label column and
flexible values. Narrow screens shrink the Debian mark and wrap values only
within their value column, not between labels and values.

## Authored launch sequence

`launch-script.js` contains a small declarative timeline for the
`./launch-interactive.sh` command. The command engine exposes both a
completed transcript (for automated tests and non-animated consumers) and
the timeline (for the browser). `app.js` progressively renders each step,
updates ASCII progress indicators in place, and types selected lines at
human-readable speed without injecting HTML.

The deterministic startup route is chosen in `startup.js` and tested directly
in Node. A visitor can replay the script using the suggestion below the
prompt. The script command itself is typed into the shell transcript before
the first loading step, with reduced-motion preferences respected.

All status messages refer to the *virtual* portfolio model. There are no
network fetches, real filesystem probes, or claims about hardware currently
connected to the visitor. The user can interrupt with Ctrl+C, immediately
finish the sequence with Escape, or enable `prefers-reduced-motion` to
receive output without animation. During playback, interactive commands
are temporarily disabled to avoid overlapping sessions.
