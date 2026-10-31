/**
 * ShellFolio's visitor-facing navigation and optional custom responses.
 *
 * Edit these data structures to personalize the terminal without changing
 * the HTML layout or browser event controller. Every label and response
 * becomes public when deployed with GitHub Pages.
 */
/** Link visible in the terminal footer. Update this when forking ShellFolio. */
export const repositoryLink = Object.freeze({
  text: 'ShellFolio on GitHub ↗',
  url: 'https://github.com/yassinebkr/ShellFolio'
});

export const quickActions = Object.freeze([
  { label: 'Run', command: './launch-interactive.sh' },
  { label: 'Clean', command: 'clean' },
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
