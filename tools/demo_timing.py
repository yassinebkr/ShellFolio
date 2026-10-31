"""Command-aware animation schedule for ShellFolio's README SVG.

Command latency and post-result pauses are independent of the number of output
lines. The prompt is shown shortly after a result, *before* typing starts.
Output rows influence geometry only, in make_demo.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from typing import Sequence

INITIAL_DELAY_MS = 350
INITIAL_PROMPT_PAUSE_MS = 160
PROMPT_AFTER_OUTPUT_MS = 60
TYPE_CHAR_MS = 42
MIN_TYPE_MS = 160
MAX_TYPE_MS = 850
FINAL_HOLD_MS = 850

# Visual pacing in milliseconds; not measured execution or filesystem latency.
# pause_after is measured from the appearance of output to the first typed
# character of the following command. The empty prompt appears sooner.
COMMAND_PACING_MS = {
    "cd": {"execution": 80, "pause_after": 190},
    "ls": {"execution": 130, "pause_after": 200},
    "inspect": {"execution": 220, "pause_after": 220},
}
DEFAULT_PACING_MS = {"execution": 160, "pause_after": 200}


@dataclass(frozen=True)
class CommandCue:
    prompt_at: float
    start: float
    stop: float
    reveal: float


@dataclass(frozen=True)
class ReplaySchedule:
    commands: tuple[CommandCue, ...]
    final_prompt_at: float
    duration: int


def plan_timeline(commands: Sequence[str]) -> ReplaySchedule:
    """Plan events from command semantics, never from the response line count."""
    if not commands:
        raise ValueError("At least one command is needed")

    cues: list[CommandCue] = []
    prompt_ms = INITIAL_DELAY_MS
    type_ms = prompt_ms + INITIAL_PROMPT_PAUSE_MS

    for index, command in enumerate(commands):
        if not command.strip():
            raise ValueError("Empty commands are not valid demo events")

        command_name = command.split(maxsplit=1)[0]
        pacing = COMMAND_PACING_MS.get(command_name, DEFAULT_PACING_MS)
        duration_ms = max(MIN_TYPE_MS, min(MAX_TYPE_MS, len(command) * TYPE_CHAR_MS))
        stop_ms = type_ms + duration_ms
        reveal_ms = stop_ms + pacing["execution"]
        cues.append(
            CommandCue(
                prompt_at=prompt_ms / 1000,
                start=type_ms / 1000,
                stop=stop_ms / 1000,
                reveal=reveal_ms / 1000,
            )
        )

        # Show the next blank prompt first; only then type its command.
        prompt_ms = reveal_ms + PROMPT_AFTER_OUTPUT_MS
        type_ms = reveal_ms + pacing["pause_after"]

    # The last idle prompt also appears promptly, without a long empty wait.
    final_prompt_at = (cues[-1].reveal * 1000 + PROMPT_AFTER_OUTPUT_MS) / 1000
    duration = ceil((final_prompt_at * 1000 + FINAL_HOLD_MS) / 1000)
    return ReplaySchedule(tuple(cues), final_prompt_at, duration)
