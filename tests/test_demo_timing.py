"""Behavioral tests for semantic README replay timing."""

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from demo_timing import plan_timeline


class DemoTimingTests(unittest.TestCase):
    def test_short_shell_commands_return_prompt_quickly(self):
        cmds = ["ls -l ~/workspace", "cd workspace/projects", "ls", "inspect lora"]
        run = plan_timeline(cmds)
        self.assertEqual(len(run.commands), len(cmds))
        for previous, following in zip(run.commands, run.commands[1:]):
            self.assertLessEqual(following.start - previous.reveal, 0.18)
        self.assertLessEqual(run.final_prompt_at - run.commands[-1].reveal, 0.18)
        self.assertLess(run.duration, 7)

    def test_execution_time_depends_on_command_not_output_rows(self):
        a = plan_timeline(["ls", "inspect lora"])
        b = plan_timeline(["ls", "inspect lora"])
        self.assertEqual(a, b)
        ls, inspect = a.commands
        self.assertLess(ls.reveal - ls.stop, inspect.reveal - inspect.stop)
        self.assertGreater(inspect.stop - inspect.start, ls.stop - ls.start)

    def test_silent_cd_has_no_artificial_wait(self):
        run = plan_timeline(["cd workspace/projects", "ls"])
        self.assertLessEqual(run.commands[1].start - run.commands[0].reveal, 0.12)

    def test_invalid_script_inputs(self):
        for commands in ([], [""]):
            with self.subTest(commands=commands):
                with self.assertRaises(ValueError):
                    plan_timeline(commands)


if __name__ == "__main__":
    unittest.main()
