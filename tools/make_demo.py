#!/usr/bin/env python3
"""Render an animated SVG replay from the actual ShellFolio command engine.

The command transcript comes from engine.js via a short Node.js subprocess,
so the public README demonstration stays aligned with implemented behavior.
Its SMIL-free CSS animations loop within one self-contained SVG document.
"""

from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "engine.js"
OUT = ROOT / "assets/demo.svg"
COMMANDS = ["ls -l ~/workspace", "cd workspace/projects", "ls", "inspect lora"]
PROMPT = "yassine@debian"
FONT_SIZE = 14
CHAR_W = 8.42
BODY_X = 26
DURATION = 25


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


def render_quick_actions(actions: list[dict]) -> str:
    """Render a static approximation of the persistent quick-action rail."""
    elements = [
        '<g id="quick-actions-preview">',
        '<rect x="1" y="659" width="1078" height="60" fill="#0d1013"/>',
        '<path d="M1 659H1079" stroke="#30343a"/>',
        '<text x="26" y="694" fill="#929da9" '
        'style="font-family:DejaVu Sans Mono,monospace;'
        'font-size:11px;letter-spacing:1px">TRY</text>',
    ]
    x = 66
    for action in actions:
        label = action["label"]
        width = max(56, 18 + 9 * len(label))
        if x + width > 1060:
            raise ValueError("Shortcut labels do not fit the SVG preview")
        elements.append(
            f'<rect x="{x}" y="677" width="{width}" height="28" rx="3" '
            'fill="#1a2025" stroke="#434b54" stroke-width="1"/>'
        )
        elements.append(
            f'<text x="{x + 10}" y="696" fill="#bdcbd8" '
            'style="font-family:DejaVu Sans Mono,monospace;'
            f'font-size:12px">{svg_escape(label)}</text>'
        )
        x += width + 8
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
    css.append(f'@keyframes typing{index} {{ 0%, {first:.2f}% {{ width:0; }} {second:.2f}%, 98% {{ width:{width:.2f}px; }} 100% {{width:0;}} }}')
    css.append(f'.typing{index} {{animation:typing{index} {DURATION}s steps({len(command)},end) infinite;}}')
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
    """A discrete loop restores the initial empty terminal after each replay."""
    pc = seconds / DURATION * 100
    css.append(f'@keyframes {name} {{0%, {max(0,pc-0.1):.2f}% {{opacity:0;}} {pc:.2f}%, 98% {{opacity:1;}} 100% {{opacity:0;}}}}')
    css.append(f'.{name} {{opacity:0;animation:{name} {DURATION}s steps(1,end) infinite;}}')


transcript = get_transcript()
css: list[str] = [
    'text{font-family:"DejaVu Sans Mono","Liberation Mono",monospace;font-size:14px}',
    '@keyframes cursorBlink {0%,49%{opacity:1}50%,100%{opacity:0}}',
    '.cursor{animation:cursorBlink 1.1s steps(1,end) infinite}',
]
visuals: list[str] = []
# Timings are measured in seconds from the start of each 25-second playback.
sequences = [
    # command baseline, start typing, finish typing, reveal output
    (101, 0.4, 2.0, 2.2),
    (313, 6.0, 7.3, 7.4),
    (347, 8.4, 9.3, 9.4),
    (420, 12.1, 13.7, 13.9),
]
row_baselines = [126, 0, 374, 445]
for i, (entry, (baseline, start, end, reveal)) in enumerate(zip(transcript, sequences)):
    class_name = f'sequence{i}'
    visibility_animation(class_name, start)
    visuals.append(f'<g class="{class_name}">{prompt_svg(entry["command"],entry["location"],baseline,i,start,end)}</g>')
    if entry["rows"]:
        name = f'result{i}'
        visibility_animation(name, reveal)
        lines = "".join(line_svg(row_baselines[i] + offset * 24, line["parts"]) for offset, line in enumerate(entry["rows"]))
        visuals.append(f'<g class="{name}">{lines}</g>')

visibility_animation("lastPrompt", 18.0)
last_x = BODY_X + len('yassine@debian:~/workspace/projects$ ') * CHAR_W
visuals.append(
    '<g class="lastPrompt">'
    f'<text x="{BODY_X}" y="631"><tspan fill="#65ed74">{PROMPT}</tspan>'
    '<tspan fill="#8fbaff">:~/workspace/projects</tspan>'
    '<tspan fill="#dadada">$ </tspan></text>'
    f'<rect x="{last_x:.2f}" y="616" width="9" height="17" fill="#dedede" class="cursor"/>'
    '</g>'
)

# Reduced-motion users can inspect the complete command transcript statically.
css.append('@media(prefers-reduced-motion:reduce){.sequence0,.sequence1,.sequence2,.sequence3,.result0,.result2,.result3,.lastPrompt{opacity:1;animation:none}.typing0,.typing1,.typing2,.typing3{animation:none;width:999px}.cursor{animation:none}}')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720" role="img" aria-labelledby="title description">
<title id="title">ShellFolio — interactive terminal demonstration</title>
<desc id="description">Animated replay generated from the ShellFolio virtual command engine: list directories, navigate to projects, list files, and inspect the validated LoRa field test.</desc>
<style>{''.join(css)}</style>
<rect x="0.5" y="0.5" width="1079" height="719" rx="5" fill="#050505" stroke="#575757"/>
<path d="M5 1H1075Q1079 1 1079 5V37H1V5Q1 1 5 1Z" fill="#353535"/>
<rect x="14" y="11" width="18" height="17" rx="2" fill="#202428" stroke="#b2b9c1"/>
<path d="M19 15L23 19L19 23M25 23H29" stroke="#f0f0f0" stroke-width="1.3" fill="none"/>
<text x="540" y="25" fill="#e7e7e7" text-anchor="middle" style="font-family:Arial,sans-serif;font-size:13px">Terminal - yassine@debian: ~</text>
<path d="M1006 20h12" stroke="#ddd"/><rect x="1033" y="17" width="8" height="8" fill="none" stroke="#ddd"/>
<path d="M1058 17l8 8m0-8l-8 8" stroke="#ddd"/>
<rect x="1" y="37" width="1078" height="29" fill="#2c2c2c"/>
<rect x="13" y="41" width="44" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="23" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">File</text>
<rect x="63" y="41" width="43" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="73" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">Edit</text>
<rect x="112" y="41" width="48" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="122" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">View</text>
<rect x="166" y="41" width="83" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="176" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">Terminal</text>
<rect x="255" y="41" width="49" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="265" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">Tabs</text>
<rect x="310" y="41" width="47" height="21" rx="3" fill="#383838" stroke="#646464" stroke-width="0.9"/><text x="320" y="56" fill="#ededed" style="font-family:Arial,sans-serif;font-size:13px">Help</text>
<path d="M1 66H1079" stroke="#4a4a4a"/>
{''.join(visuals)}
{render_quick_actions(get_quick_actions())}
</svg>'''
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(svg, encoding="utf-8")
print(f'Wrote {OUT} ({len(svg)} characters), {sum(len(t["rows"]) for t in transcript)} rows from {len(COMMANDS)} actual commands')
