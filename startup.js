/**
 * Select the initial virtual terminal scene.
 *
 * The guided launcher is the default for both the normal GitHub Pages URL
 * and links from the profile README. The listing remains available for
 * diagnostics through the explicit `?view=listing` query parameter.
 *
 * Unrecognized query values do not trigger arbitrary commands.
 */
export function initialScene(queryString = '') {
  const params = new URLSearchParams(queryString);
  return params.get('view') === 'listing' ? 'listing' : 'launch';
}
