"""Small behavioral checks for the README SVG's animation scheduler."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

from demo_timing import COMMAND_PACING_MS, PROMPT_AFTER_OUTPUT_MS, plan_timeline


class DemoTimingTests(unittest.TestCase):
    def test_prompt_appears_before_next_command_is_typed(self):
        run = plan_timeline(["ls -l ~/workspace", "cd workspace/projects", "ls", "inspect lora"])
        self.assertEqual(len(run.commands), 4)
        for previous, following in zip(run.commands, run.commands[1:]):
            # A new empty prompt appears almost immediately after the output.
            self.assertAlmostEqual(
                following.prompt_at - previous.reveal,
                PROMPT_AFTER_OUTPUT_MS / 1000,
            )
            # The text itself waits a little longer, so it feels human.
            self.assertGreaterEqual(following.start - previous.reveal, 0.18)
            self.assertLessEqual(following.start - previous.reveal, 0.25)
            self.assertLess(following.prompt_at, following.start)

        self.assertAlmostEqual(
            run.final_prompt_at - run.commands[-1].reveal,
            PROMPT_AFTER_OUTPUT_MS / 1000,
        )
        self.assertLessEqual(run.duration, 6)

    def test_command_category_not_output_rows_controls_execution(self):
        first = plan_timeline(["ls", "inspect lora"])
        second = plan_timeline(["ls", "inspect lora"])
        self.assertEqual(first, second)
        ls, inspect = first.commands
        self.assertLess(ls.reveal - ls.stop, inspect.reveal - inspect.stop)
        self.assertGreater(inspect.stop - inspect.start, ls.stop - ls.start)

    def test_cd_and_ls_have_short_independent_post_result_pauses(self):
        run = plan_timeline(["cd workspace/projects", "ls"])
        cd, ls = run.commands
        self.assertAlmostEqual(
            ls.start - cd.reveal,
            COMMAND_PACING_MS["cd"]["pause_after"] / 1000,
        )
        self.assertEqual(COMMAND_PACING_MS["ls"]["pause_after"], 200)

    def test_reject_empty_transcripts_and_commands(self):
        for bad in ([], [""], ["ls", "  "]):
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    plan_timeline(bad)


if __name__ == "__main__":
    unittest.main()
