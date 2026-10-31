/**
 * The scripted introduction is an authored, read-only portfolio walkthrough.
 *
 * "Progress" steps indicate reading the in-memory portfolio model; they do
 * not represent hardware probes, network checks, or executable Bash commands.
 * Keeping timing and content declarative makes animation easy to test, replay,
 * interrupt, and adapt to reduced-motion user preferences.
 */
export const LAUNCH_STEPS = Object.freeze([
  { kind: 'line', text: 'SHELLFOLIO / SESSION START', style: 'cyan bold', delay: 160 },
  { kind: 'progress', label: 'reading virtual profile', duration: 720 },
  { kind: 'type', text: "Hi, I'm Yassine.", speed: 26, delay: 190 },
  { kind: 'line', text: 'I design electronics, work with embedded Linux, and build the software around them.', delay: 190 },
  { kind: 'line', text: '', delay: 200 },
  { kind: 'progress', label: 'indexing portfolio projects', duration: 860 },
  { kind: 'line', text: 'Selected work', style: 'cyan bold', delay: 160 },
  { kind: 'line', text: '  cinemapi5    Raspberry Pi 5 + Sony IMX283 cinema camera', delay: 160 },
  { kind: 'line', text: '  lora         45 km LoRa telemetry link validated in the field', delay: 160 },
  { kind: 'line', text: '  bigbrain     Multi-agent UI and workflow research', delay: 260 },
  { kind: 'line', text: '', delay: 130 },
  { kind: 'progress', label: 'preparing virtual workspace', duration: 600 },
  { kind: 'type', text: 'Type help to list commands, or use the shortcuts below to explore.', style: 'green', speed: 15, delay: 140 }
]);

/**
 * Produce plain-text final output for tests, audit trails and non-animated
 * consumers. Progress indicators settle to [ok] in the completed transcript.
 */
export function resolvedLaunchLines(steps = LAUNCH_STEPS) {
  return steps.map(step =>
    step.kind === 'progress'
      ? { text: '[ok] ' + step.label, style: 'muted' }
      : { text: step.text, style: step.style || '' }
  );
}
