# ShellFolio: architecture and development

## Scope

ShellFolio is a client-side, read-only terminal simulator presenting a curated engineering portfolio. Its command interpreter models a virtual filesystem and responds with structured, styled segments. The browser builds corresponding DOM text nodes and vetted external links.

- `index.html`: XFCE-inspired application structure and accessible input
- `style.css`: window chrome, typography, layout and responsive breakpoints
- `app.js`: input events, command history, output rendering, completion hints
- `engine.js`: parser, virtual filesystem, commands and completion candidates
- `assets/terminal-demo.svg`: animated command replay for this repository's README
- `tools/make_demo.py`: Python demonstration generator invoking the **same** Node.js command interpreter as the browser
- `tests/engine.test.mjs`: deterministic unit tests for navigation, commands and completions
- `.github/workflows/verify.yml`: CI checks for JavaScript, SVG reproducibility and static assets


## Architecture diagrams

### Browser runtime

```mermaid
flowchart TB
    Visitor["Visitor: keyboard, shortcuts, selection"] --> UI["app.js — DOM controller"]
    HTML["index.html + style.css — XFCE window and layout"] --> UI
    Start["startup.js — initial scene"] --> UI
    Config["portfolio.config.js — quick actions and preset responses"] --> UI
    Config --> Engine["engine.js — read-only shell and virtual filesystem"]
    UI -->|"execute(command)"| Engine
    Engine -->|"structured output / timeline"| UI
    Timeline["launch-script.js — scripted introduction steps"] --> Engine
    UI --> Screen["DOM output + input + persistent shortcuts"]
    Screen --> Visitor
```

The browser has no real shell, server-side interpreter or command execution
privileges. The DOM renderer converts the interpreter's structured responses
into text nodes and approved links. The profile SVG generator is a different
project and is not part of this runtime.

### Command lifecycle

The command path is intentionally small. A shortcut differs from manual input
only in its initial echo and short delay; both use the same interpreter.

```mermaid
flowchart TD
    A["Command input"] --> B{"Shortcut?"}
    B -->|No| E["Execute in virtual shell"]
    B -->|Yes| C["Show full command"]
    C --> D["Pause 280 ms"]
    D --> E
    E --> F{"Result"}
    F -->|Lines| G["Append output"]
    F -->|Script| H["Stream steps"]
    F -->|Clean| I["Clear display"]
```

For scripts, the active shell prompt remains hidden until playback finishes
or is interrupted. **Text selection and copying are native browser actions**,
not additional interpreter commands. Terminal output must not steal focus or
scroll underneath an active selection. Ctrl+C copies selected text; without
a selection, it interrupts an active script or pending shortcut.

### README SVG build and verification

```mermaid
flowchart LR
    Engine["engine.js"] --> Node["Node subprocess: replay example commands"]
    Config["portfolio.config.js"] --> Node
    Node --> Generator["tools/make_demo.py"]
    Generator --> SVG["assets/terminal-demo.svg — animated preview"]
    SVG --> README["Public README image"]
    Generator --> CI["GitHub Actions regeneration check"]
    SVG --> CI
    CI -->|"exact match required"| Result["Verified static artifact"]
```

Quick-action names and terminal response rows are not copied into a second
manual content source. The SVG is a non-interactive illustration, while the
website exposes actual buttons with the same configured commands.

## Commands and interactions

Commands include `help`, `ls -l`, `cd`, `pwd`, `cat`, `tree`, `skills`, `projects`, `inspect`, `history`, and `clear`. The `Tab` and `→` keys accept a unique inline completion; when candidates are ambiguous, `Tab` lists them. The up/down arrows navigate command history. Output uses text nodes and a curated link allowlist.

The XFCE menu labels and window controls remain non-interactive visual chrome. The Run and Clean quick actions are interactive; Clean resets the entire visible terminal. The active prompt remains hidden throughout script playback and returns only after completion or interruption. The quick-action rail is a discreet strip of text commands, not a stack of boxed cards.

### Shortcut staging

Quick-action buttons call `runQuickAction()` rather than invoking
`submitCommand()` synchronously. The application inserts the complete shell
command as a DOM entry **immediately**, hides the active prompt, then waits
280 ms before calling the production interpreter. It appends structured
response nodes to that **same entry**, preserving the command on screen
rather than rebuilding the terminal.

For Run, the normal virtual-launch timeline begins after the pause. Clean
clears the output buffer after the pause. When another shortcut is clicked,
the pending controller is aborted and its command is marked `^C`; any
running launch is also interrupted. Reduced-motion preferences skip the
artificial pause. Typed commands submitted by pressing Enter retain their
existing immediate execution semantics.

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

## SVG replay layout contract

`tools/make_demo.py` invokes the same virtual command interpreter as the
website and turns its structured responses into a self-contained, CSS-animated
SVG. Its demonstration currently replays `ls -l ~/workspace`,
`cd workspace/projects`, `ls`, and `inspect lora`.

The generator must preserve these display conventions:

- The XFCE **menu labels** (`File`, `Edit`, `View`, `Terminal`,
  `Tabs`, `Help`) are plain text on the gray menu bar, **not outlined
  buttons**. The application and SVG use the same non-interactive chrome.
- Prompt placement is calculated from the **actual number of lines returned
  by the interpreter**: one 21px text row for the command itself, then one
  for each output line. The next command starts immediately below the last
  output line. Silent commands such as `cd` add no empty separator row.
- Only **explicit empty lines in the interpreter output** count as blank
  rows. Do not add artificial paragraph spacing between shell commands.
- The final idle prompt uses the same accumulated baseline. Its cursor
  follows the displayed prompt text.
- Shortcut labels come directly from `portfolio.config.js` and remain
  visual-only in the embedded README image. The live HTML buttons are
  interactive.

The animation timetable is computed by `tools/demo_timing.py` from **command semantics**, not output line counts. Each command's simulated execution latency is short (`ls` and `cd` are near-instantaneous; `inspect` has a slightly longer beat), and the next prompt appears within roughly 0.1–0.2 seconds after the result. Typing duration depends on command length, with an upper cap. Only vertical positions depend on actual output row counts. The schedule is tested independently with `tests/test_demo_timing.py`.\n\nThe SVG now calculates its **height and shortcut rail position from the real transcript**. A 21px row height matches the site more closely, with no artificial blank lines between commands. The animation plays **once**, retains the completed transcript, and never rewinds typing from right to left. Only the cursor continues blinking. The shortcut strip is always inside the SVG viewport.

Regenerate the asset using `npm run demo` and inspect the updated README
image before committing. GitHub Actions regenerates the SVG and checks for an
exact match with the tracked `assets/terminal-demo.svg`.


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
receive output without animation. During playback, another shortcut cancels the active script and starts a new
command, avoiding overlapping sessions. Browser text selection and native
copying must remain available throughout the session.
