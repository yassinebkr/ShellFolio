#!/usr/bin/env python3
"""Render an animated SVG replay from the actual ShellFolio command engine.

The command transcript comes from engine.js via a short Node.js subprocess,
so the public README demonstration stays aligned with implemented behavior.
Its SMIL-free CSS animations play once and retain a finished terminal image.
"""

from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path

from demo_timing import plan_timeline

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "engine.js"
OUT = ROOT / "assets/terminal-demo.svg"
COMMANDS = ["ls -l ~/workspace", "cd workspace/projects", "ls", "inspect lora"]
PROMPT = "yassine@debian"
FONT_SIZE = 14
CHAR_W = 8.42
BODY_X = 26



def svg_escape(text: str) -> str:
    """Encode user-visible strings as inert SVG character data."""
    return html.escape(str(text), quote=True)


def get_transcript() -> list[dict]:
    """Execute each simulated command using the production virtual shell."""
    node = """
import {TerminalEngine} from './engine.js';
const shell = new TerminalEngine();
const commands = JSON.parse(process.argv[1]);
const transcript = commands.map(command => {
  const location = shell.location;
  const response = shell.execute(command);
  return {command, location, rows: response.lines};
});
console.log(JSON.stringify(transcript));
"""
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", node, json.dumps(COMMANDS)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
        timeout=15,
    )
    transcript = json.loads(completed.stdout)
    assert len(transcript) == len(COMMANDS)
    assert "45 km" in json.dumps(transcript)
    return transcript


def get_quick_actions() -> list[dict]:
    """Read the website's visitor shortcuts from its own JS configuration.

    This avoids maintaining a separate list of shortcut labels for the SVG
    preview. The visual buttons in a GitHub README image stay inert.
    """
    program = (
        "import { quickActions } from './portfolio.config.js'; "
        "console.log(JSON.stringify(quickActions));"
    )
    completed = subprocess.run(
        ["node", "--input-type=module", "-e", program],
        cwd=ROOT, capture_output=True, text=True, check=True, timeout=15,
    )
    actions = json.loads(completed.stdout)
    if not isinstance(actions, list) or not 1 <= len(actions) <= 12:
        raise ValueError("Expected between one and twelve visitor shortcuts")
    if any(
        not isinstance(item, dict)
        or not isinstance(item.get("label"), str)
        or not item["label"].strip()
        or not isinstance(item.get("command"), str)
        for item in actions
    ):
        raise ValueError("Visitor shortcuts must have labels and commands")
    return actions


def render_quick_actions(actions: list[dict], top: int) -> str:
    """Mirror the site's restrained text shortcut strip, without fake buttons.

    The visual labels originate in portfolio.config.js. In the README image
    they are not clickable; they are actual buttons on the live web page.
    """
    elements = [
        '<g id="quick-actions-preview">',
        f'<rect x="1" y="{top}" width="1078" height="56" fill="#080909"/>',
        f'<path d="M1 {top}H1079" stroke="#282c30"/>',
        f'<text x="26" y="{top + 34}" fill="#777f87" '
        'style="font-family:DejaVu Sans Mono,monospace;'
        'font-size:11px">shortcuts</text>',
    ]
    x = 125.0
    for index, action in enumerate(actions):
        label = action["label"].lower()
        width = 7.2 * len(label)
        if x + width > 1060:
            raise ValueError("Shortcut labels do not fit the SVG preview")
        color = "#bedcc2" if index == 0 else "#a0abb3"
        elements.append(
            f'<text x="{x:.1f}" y="{top + 34}" fill="{color}" '
            'style="font-family:DejaVu Sans Mono,monospace;'
            f'font-size:12px">{svg_escape(label)}</text>'
        )
        x += width + 17
    elements.append("</g>")
    return "\n".join(elements)


def line_svg(y: int, parts: list[dict]) -> str:
    """Preserve the virtual shell's structured styling in SVG tspans."""
    colors = {
        "cyan": "#79dbe1", "blue": "#a1aafa", "dir": "#a1aafa",
        "green": "#82e58f", "pink": "#ff497c", "yellow": "#e1bd79",
        "muted": "#a6a6a6",
    }
    spans = []
    for part in parts:
        style = part.get("style", "")
        color = next((hexcode for class_name, hexcode in colors.items() if class_name in style.split()), "#dbdbdb")
        weight = ' font-weight="700"' if "bold" in style or "dir" in style else ""
        spans.append(f'<tspan fill="{color}"{weight}>{svg_escape(part["text"])}</tspan>')
    return f'<text x="{BODY_X}" y="{y}" xml:space="preserve">{"".join(spans)}</text>'


def prompt_svg(command: str, location: str, y: int, index: int, start: int, stop: int) -> str:
    """Animate a shell command using a clipping rectangle on a fixed-width grid."""
    prompt = f"{PROMPT}:{location}$ "
    command_x = BODY_X + len(prompt) * CHAR_W
    width = (len(command) + 0.4) * CHAR_W
    first = start / DURATION * 100
    second = stop / DURATION * 100
    # The clipping rectangle makes the typed command grow in monospace cells.
    css.append(f'@keyframes typing{index} {{ 0%, {first:.2f}% {{ width:0; }} {second:.2f}%, 100% {{ width:{width:.2f}px; }} }}')
    css.append(f'.typing{index} {{animation:typing{index} {DURATION}s steps({len(command)},end) 1 both;}}')
    prefix = (
        f'<text x="{BODY_X}" y="{y}"><tspan fill="#65ed74">{PROMPT}</tspan>'
        f'<tspan fill="#8fbaff">:{svg_escape(location)}</tspan><tspan fill="#dadada">$ </tspan></text>'
    )
    return (
        prefix
        + f'<defs><clipPath id="command{index}"><rect x="{command_x:.2f}" y="{y-18}" width="0" height="24" class="typing{index}"/></clipPath></defs>'
        + f'<text x="{command_x:.2f}" y="{y}" fill="#dbdbdb" clip-path="url(#command{index})">{svg_escape(command)}</text>'
    )


def visibility_animation(name: str, seconds: float) -> None:
    """Reveal the transcript once, retaining the final output without reverse wiping."""
    pc = seconds / DURATION * 100
    css.append(f'@keyframes {name} {{0%, {max(0,pc-0.1):.2f}% {{opacity:0;}} {pc:.2f}%, 100% {{opacity:1;}}}}')
    css.append(f'.{name} {{opacity:0;animation:{name} {DURATION}s steps(1,end) 1 both;}}')


transcript = get_transcript()
css: list[str] = [
    'text{font-family:"DejaVu Sans Mono","Liberation Mono",monospace;font-size:14px}',
    '@keyframes cursorBlink {0%,49%{opacity:1}50%,100%{opacity:0}}',
    '.cursor{animation:cursorBlink 1.1s steps(1,end) infinite}',
]
visuals: list[str] = []
# The schedule is computed from command semantics, never from the output's
# number of lines. ls/cd return promptly; inspect has a slightly longer beat.
# Output row counts are used only to position subsequent prompts vertically.
schedule = plan_timeline([entry["command"] for entry in transcript])
DURATION = schedule.duration
timings = [(cue.prompt_at, cue.start, cue.stop, cue.reveal) for cue in schedule.commands]
LINE_HEIGHT = 21
next_baseline = 101
sequences = []
row_baselines = []
for entry, (prompt_at, start, stop, reveal) in zip(transcript, timings):
    sequences.append((next_baseline, prompt_at, start, stop, reveal))
    row_baselines.append(next_baseline + LINE_HEIGHT)
    next_baseline += (1 + len(entry["rows"])) * LINE_HEIGHT

# Both the bottom rail and SVG viewport follow the final prompt, eliminating
# the empty expanse that previously hid the shortcut links in GitHub's preview.
rail_top = next_baseline + 29
canvas_height = rail_top + 56
for i, (entry, (baseline, prompt_at, start, end, reveal)) in enumerate(zip(transcript, sequences)):
    class_name = f'sequence{i}'
    visibility_animation(class_name, prompt_at)
    visuals.append(f'<g class="{class_name}">{prompt_svg(entry["command"],entry["location"],baseline,i,start,end)}</g>')
    if entry["rows"]:
        name = f'result{i}'
        visibility_animation(name, reveal)
        lines = "".join(line_svg(row_baselines[i] + offset * LINE_HEIGHT, line["parts"]) for offset, line in enumerate(entry["rows"]))
        visuals.append(f'<g class="{name}">{lines}</g>')

visibility_animation("lastPrompt", schedule.final_prompt_at)
last_location = transcript[-1]["location"]
last_x = BODY_X + len(f"{PROMPT}:{last_location}$ ") * CHAR_W
visuals.append(
    '<g class="lastPrompt">'
    f'<text x="{BODY_X}" y="{next_baseline}"><tspan fill="#65ed74">{PROMPT}</tspan>'
    f'<tspan fill="#8fbaff">:{svg_escape(last_location)}</tspan>'
    '<tspan fill="#dadada">$ </tspan></text>'
    f'<rect x="{last_x:.2f}" y="{next_baseline - 15}" width="9" height="17" fill="#dedede" class="cursor"/>'
    '</g>'
)

# Reduced-motion users can inspect the complete command transcript statically.
css.append('@media(prefers-reduced-motion:reduce){.sequence0,.sequence1,.sequence2,.sequence3,.result0,.result2,.result3,.lastPrompt{opacity:1;animation:none}.typing0,.typing1,.typing2,.typing3{animation:none;width:999px}.cursor{animation:none}}')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="{canvas_height}" viewBox="0 0 1080 {canvas_height}" role="img" aria-labelledby="title description">
<title id="title">ShellFolio — interactive terminal demonstration</title>
<desc id="description">Animated replay generated from the ShellFolio virtual command engine: list directories, navigate to projects, list files, and inspect the validated LoRa field test.</desc>
<style>{''.join(css)}</style>
<rect x="0.5" y="0.5" width="1079" height="{canvas_height - 1}" rx="5" fill="#050505" stroke="#575757"/>
<path d="M5 1H1075Q1079 1 1079 5V37H1V5Q1 1 5 1Z" fill="#353535"/>
<rect x="14" y="11" width="18" height="17" rx="2" fill="#202428" stroke="#b2b9c1"/>
<path d="M19 15L23 19L19 23M25 23H29" stroke="#f0f0f0" stroke-width="1.3" fill="none"/>
<text x="540" y="25" fill="#e7e7e7" text-anchor="middle" style="font-family:Arial,sans-serif;font-size:13px">Terminal - yassine@debian: ~</text>
<path d="M1006 20h12" stroke="#ddd"/><rect x="1033" y="17" width="8" height="8" fill="none" stroke="#ddd"/>
<path d="M1058 17l8 8m0-8l-8 8" stroke="#ddd"/>
<rect x="1" y="37" width="1078" height="29" fill="#2c2c2c"/>
<text x="16" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">File</text>
<text x="60" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">Edit</text>
<text x="103" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">View</text>
<text x="154" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">Terminal</text>
<text x="229" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">Tabs</text>
<text x="276" y="56" fill="#e0e0e0" style="font-family:Arial,sans-serif;font-size:13px">Help</text>
<path d="M1 66H1079" stroke="#4a4a4a"/>
{''.join(visuals)}
{render_quick_actions(get_quick_actions(), rail_top)}
</svg>'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(svg, encoding="utf-8")
print(f'Wrote {OUT} ({len(svg)} characters), {sum(len(t["rows"]) for t in transcript)} rows, {DURATION}s schedule from {len(COMMANDS)} commands')
