"""Semantic scheduling for a short, one-shot README terminal demonstration.

Output line count affects terminal geometry, never latency. Each command
category has a small simulated execution delay and a separate post-result
gap. A new prompt appears almost immediately after the previous result.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from typing import Sequence

INITIAL_DELAY_MS = 350
TYPE_CHAR_MS = 42
MIN_TYPE_MS = 160
MAX_TYPE_MS = 850
FINAL_HOLD_MS = 850

# Small, plausible visual delays, not real measurements of system performance.
# Values are: simulated execution latency, then delay before the next prompt.
COMMAND_PACING_MS = {
    "cd": (80, 110),
    "ls": (130, 140),
    "inspect": (220, 170),
}
DEFAULT_PACING_MS = (160, 150)


@dataclass(frozen=True)
class CommandCue:
    start: float
    stop: float
    reveal: float


@dataclass(frozen=True)
class ReplaySchedule:
    commands: tuple[CommandCue, ...]
    final_prompt_at: float
    duration: int


def plan_timeline(commands: Sequence[str]) -> ReplaySchedule:
    """Schedule command/response events without inspecting output row counts."""
    if not commands:
        raise ValueError("At least one command is needed")
    current_ms = INITIAL_DELAY_MS
    cues: list[CommandCue] = []
    for command in commands:
        if not command.strip():
            raise ValueError("Empty commands are not valid demo events")
        command_name = command.split(maxsplit=1)[0]
        execution_ms, prompt_gap_ms = COMMAND_PACING_MS.get(
            command_name, DEFAULT_PACING_MS
        )
        typing_ms = max(MIN_TYPE_MS, min(MAX_TYPE_MS, len(command) * TYPE_CHAR_MS))
        start = current_ms
        stop = start + typing_ms
        reveal = stop + execution_ms
        cues.append(CommandCue(start / 1000, stop / 1000, reveal / 1000))
        current_ms = reveal + prompt_gap_ms

    duration = ceil((current_ms + FINAL_HOLD_MS) / 1000)
    return ReplaySchedule(tuple(cues), current_ms / 1000, duration)
