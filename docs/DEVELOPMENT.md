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

The XFCE menu row and window controls are visual elements. Input and behavior are concentrated in the shell prompt, mirroring the central terminal workflow.

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
