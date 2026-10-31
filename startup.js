/**
 * Select the initial read-only terminal scene.
 *
 * On GitHub profile links (?run=launch), the animated SVG has already shown
 * neofetch and ls. Reconstruct that listing before running the Bash demo so
 * the interactive page continues from the image's last frame.
 *
 * Direct visits still start the demo as before. A diagnostic listing route
 * overrides both, and unknown query values never execute shell input.
 */
export function initialScene(queryString = '') {
  const params = new URLSearchParams(queryString);
  if (params.get('view') === 'listing') return 'listing';
  if (params.get('run') === 'launch') return 'profile';
  return 'launch';
}
