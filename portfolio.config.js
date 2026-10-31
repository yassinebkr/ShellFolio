/**
 * ShellFolio's visitor-facing navigation and optional custom responses.
 *
 * Edit these data structures to personalize the terminal without changing
 * the HTML layout or browser event controller. Every label and response
 * becomes public when deployed with GitHub Pages.
 */
export const quickActions = Object.freeze([
  { label: 'Start', command: './launch-interactive.sh' },
  { label: 'Projects', command: 'projects' },
  { label: 'Workspace', command: 'ls -l ~/workspace' },
  { label: 'Skills', command: 'skills' },
  { label: 'LoRa project', command: 'inspect lora' },
  { label: 'About', command: 'about' },
  { label: 'Contact', command: 'contact' }
]);

/** Each preset becomes a read-only command handled by engine.js. */
export const presetResponses = Object.freeze({
  contact: Object.freeze({
    description: 'Public contact information',
    lines: Object.freeze([
      'Contact',
      'GitHub: https://github.com/yassinebkr',
      'Explore my public repositories and get in touch through GitHub.'
    ])
  })
});

/** These menu actions are implemented in app.js, not decorative placeholders. */
export const menuGroups = Object.freeze([
  { label: 'File', actions: [
    { label: 'Restart introduction', id: 'restart' },
    { label: 'List workspace', id: 'workspace' }
  ] },
  { label: 'Edit', actions: [
    { label: 'Copy terminal output', id: 'copy' }
  ] },
  { label: 'View', actions: [
    { label: 'Increase font size', id: 'font-up' },
    { label: 'Decrease font size', id: 'font-down' },
    { label: 'Reset font size', id: 'font-reset' }
  ] },
  { label: 'Terminal', actions: [
    { label: 'Replay introduction', id: 'intro' },
    { label: 'Clear output', id: 'clear' }
  ] },
  { label: 'Tabs', actions: [
    { label: 'Open new browser tab', id: 'new-tab' }
  ] },
  { label: 'Help', actions: [
    { label: 'Command reference', id: 'help' },
    { label: 'Customization guide', id: 'guide' }
  ] }
]);
