import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalEngine, resolvePath, tokenize } from '../engine.js';
import { LAUNCH_STEPS, resolvedLaunchLines } from '../launch-script.js';
import { initialScene } from '../startup.js';
import { quickActions, presetResponses, repositoryLink } from '../portfolio.config.js';
import { readFileSync } from 'node:fs';

const stringify = response => response.lines.flatMap(line => line.parts.map(part => part.text)).join('\n');

test('canonical directory traversal stays within the virtual filesystem', () => {
  assert.equal(resolvePath('/home/yassine', 'workspace/../workspace/embedded'), '/home/yassine/workspace/embedded');
  assert.equal(resolvePath('/home/yassine', '../../etc'), '/etc');
  assert.equal(resolvePath('/home/yassine/workspace', '~/'), '/home/yassine');
});
test('quoting and unterminated quotes are handled', () => {
  assert.deepEqual(tokenize('cat "README.md"').tokens, ['cat','README.md']);
  assert.equal(tokenize('cat "unfinished').error, 'shell: unmatched quotation mark');
});
test('engine initialises in the engineering home', () => {
  const shell = new TerminalEngine();
  assert.equal(shell.location, '~');
  assert.match(stringify(shell.execute('ls -l workspace')), /embedded\//);
  assert.match(stringify(shell.execute('ls -l workspace')), /4096/);
});
test('navigation supports a nested project case study', () => {
  const shell = new TerminalEngine();
  assert.equal(stringify(shell.execute('cd workspace/projects/lora')), '');
  assert.equal(shell.location, '~/workspace/projects/lora');
  assert.match(stringify(shell.execute('cat README.md')), /45 km/);
  shell.execute('cd ..');
  assert.equal(shell.location, '~/workspace/projects');
});
test('invalid paths and arguments return visible errors', () => {
  const shell = new TerminalEngine();
  assert.match(stringify(shell.execute('cd ../missing')), /directory unavailable/);
  assert.match(stringify(shell.execute('ls -z')), /unsupported option/);
  assert.match(stringify(shell.execute('inspect nonexistent')), /unknown project/);
  assert.match(stringify(shell.execute('not-a-command sh')), /command unavailable/);
  assert.match(stringify(shell.execute('cat "unfinished')), /unmatched quotation/);
});
test('project claims distinguish validated measurements from targets', () => {
  const shell = new TerminalEngine();
  assert.match(stringify(shell.execute('inspect lora')), /45 km.*validated/i);
  assert.match(stringify(shell.execute('inspect cinemapi5')), /target.*validation/i);
});
test('links are limited to known destinations', () => {
  const shell = new TerminalEngine();
  const valid = shell.execute('open cinemapi5');
  assert.equal(valid.lines[0].parts[0].href, 'https://github.com/yassinebkr/cinematepi5');
  assert.match(stringify(shell.execute('open https://evil.example/')), /available destinations/);
});
test('command history and autocompletion work', () => {
  const shell = new TerminalEngine();
  assert.equal(shell.complete('ins'), 'inspect');
  assert.equal(shell.complete('inspect lo'), 'inspect lora');
  assert.equal(shell.complete('cd wor'), 'cd workspace/');
  shell.execute('pwd'); shell.execute('help');
  assert.match(stringify(shell.execute('history')), /pwd/);
});
test('clear preserves cwd and closes previous output', () => {
  const shell = new TerminalEngine();
  shell.execute('cd workspace');
  const out = shell.execute('clear');
  assert.equal(out.clear, true);
  assert.equal(out.cwd, '/home/yassine/workspace');
});
test('tree remains bounded with a documented workspace', () => {
  const shell = new TerminalEngine();
  const all = stringify(shell.execute('tree workspace'));
  assert.match(all, /projects\//);
  assert.match(all, /cinemapi5\//);
  assert.ok(all.length < 4000);
});

test('live completions handle commands, project names, options and paths', () => {
  const shell = new TerminalEngine();
  assert.deepEqual(shell.suggest('pr'), { replacement: 'projects', matches: ['projects'] });
  assert.deepEqual(shell.suggest('cd wor'), { replacement: 'cd workspace/', matches: ['workspace/'] });
  assert.deepEqual(shell.suggest('ls -l wor'), { replacement: 'ls -l workspace/', matches: ['workspace/'] });
  assert.deepEqual(shell.suggest('inspect lo'), { replacement: 'inspect lora', matches: ['lora'] });
  assert.deepEqual(shell.suggest('open cin'), { replacement: 'open cinemapi5', matches: ['cinemapi5'] });
  assert.deepEqual(shell.suggest('c').matches, ['cd', 'cat', 'clear', 'contact']);
  assert.equal(shell.suggest('unknown').matches.length, 0);
  assert.deepEqual(shell.suggest('').matches, []);
  shell.execute('cd workspace/projects');
  assert.equal(shell.suggest('cd lo').replacement, 'cd lora/');
});

test('README launcher is a safe virtual command and appears in completion', () => {
  const shell = new TerminalEngine();
  const text = stringify(shell.execute('./launch-interactive.sh'));
  assert.match(text, /SESSION START/);
  assert.match(text, /Sony IMX283/);
  assert.match(text, /45 km LoRa/);
  assert.equal(shell.suggest('./launch').replacement, './launch-interactive.sh');
  assert.match(stringify(shell.execute('./launch-interactive.sh --exec')), /unexpected arguments/);
  assert.match(stringify(shell.execute('./unknown.sh')), /command unavailable/);
});

test('launcher shares a declarative, sequential transcript with the browser', () => {
  const shell = new TerminalEngine();
  const response = shell.execute('./launch-interactive.sh');
  assert.equal(response.timeline, LAUNCH_STEPS);
  assert.deepEqual(response.lines.map(l => l.parts[0].text), resolvedLaunchLines().map(l => l.text));
  assert.ok(LAUNCH_STEPS.filter(s => s.kind === 'progress').length >= 2);
  assert.ok(LAUNCH_STEPS.some(s => s.kind === 'type'));
  assert.ok(LAUNCH_STEPS.every(s => ['line', 'progress', 'type'].includes(s.kind)));
  assert.match(stringify(response), /45 km.*validated/i);
  assert.ok(!JSON.stringify(LAUNCH_STEPS).includes('<script'));
});

test('every normal entry point starts the visible script instead of the old listing', () => {
  assert.equal(initialScene(''), 'launch');
  assert.equal(initialScene('?run=launch'), 'launch');
  assert.equal(initialScene('?foo=bar'), 'launch');
  assert.equal(initialScene('?view=listing'), 'listing');
  assert.equal(initialScene('?run=launch&view=listing'), 'listing');
  assert.equal(initialScene('?view=unknown'), 'launch');
});

test('custom visitor shortcuts and predefined responses run through the same shell', () => {
  const shell = new TerminalEngine();
  assert.ok(quickActions.length >= 5);
  const commands = quickActions.map(action => action.command);
  assert.equal(commands.length, new Set(commands).size);
  for (const action of quickActions) {
    assert.ok(action.label.trim());
    assert.ok(!/command unavailable|directory unavailable|unknown project/i.test(
      stringify(shell.execute(action.command))
    ), 'Invalid shortcut command: ' + action.command);
  }
  assert.equal(shell.suggest('cont').replacement, 'contact');
  assert.match(stringify(shell.execute('contact')), /github.com\/yassinebkr/);
  assert.match(stringify(shell.execute('contact')), /yabbo01@gmail.com/);
  assert.match(stringify(shell.execute('contact private')), /unexpected arguments/);
  assert.ok(Object.hasOwn(presetResponses, 'contact'));
});


test('contact provides clickable, configured GitHub and email destinations', () => {
  const shell = new TerminalEngine();
  const parts = shell.execute('contact').lines.flatMap(row => row.parts);
  const links = parts.filter(part => part.href);
  assert.deepEqual(links.map(part => part.href), [
    'https://github.com/yassinebkr',
    'mailto:yabbo01@gmail.com'
  ]);
  assert.ok(links.every(part => part.style === 'blue'));
  assert.ok(links.some(part => part.text.includes('GitHub:')));
  assert.ok(links.some(part => part.text.includes('Email:')));
  assert.match(stringify(shell.execute('help')), /contact.*GitHub and email/);
});

test('mailto links do not get forced into a new browser tab', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const engine = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
  assert.match(app, /node\.href = part\.href/);
  assert.match(app, /if \(part\.href\.startsWith\('https:\/\/'\)\)/);
  assert.match(engine, /\^mailto:/);
});

test('Run and Clear shortcuts execute virtual commands', () => {
  const shell = new TerminalEngine();
  const run = quickActions.find(action => action.label === 'Run');
  const clear = quickActions.find(action => action.label === 'Clear');
  assert.equal(run?.command, './launch-interactive.sh');
  assert.equal(clear?.command, 'clear');
  assert.equal(quickActions.some(action => action.label === 'Clean'), false);
  assert.ok(shell.execute(run.command).timeline?.length > 0);
  assert.ok(shell.execute('run').timeline?.length > 0);
  assert.equal(shell.execute(clear.command).clear, true);
  assert.equal(shell.execute('clean').clear, true); // Backward-compatible alias
  assert.equal(shell.execute('reset').clear, true);
  assert.deepEqual(shell.suggest('cle').matches, ['clear']);
});

test('XFCE chrome is inert and script lifecycle controls Bash prompt', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(html, /class="menu-bar" aria-hidden="true"/);
  assert.doesNotMatch(app, /renderMenus|runMenuAction/);
  assert.match(app, /form[.]hidden = true/);
  assert.match(app, /form[.]hidden = false/);
  assert.match(app, /output[.]replaceChildren[(][)]/);
  assert.match(app, /document[.]addEventListener[(]'keydown'/);
  assert.ok(css.includes('#prompt-form[hidden] { display: none; }'));
});

test('script explicitly directs visitors to help or visible shortcuts', () => {
  const ending = LAUNCH_STEPS[LAUNCH_STEPS.length - 1];
  assert.match(ending.text, /type help/i);
  assert.match(ending.text, /shortcuts below/i);
});

test('copyable output never triggers generic focus stealing', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /body\.addEventListener\('click'/);
  assert.match(app, /restorePrompt\(\{ focus: shouldFocus \}\)/);
  assert.match(app, /window\.getSelection\(\)/);
  assert.match(app, /selection && !selection\.isCollapsed/);
  assert.match(css, /user-select: text/);
  assert.ok(quickActions.length > 0);
});


test('quick-action command is displayed first, then its output is appended', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /const SHORTCUT_REPLY_DELAY_MS = 280/);
  assert.match(app, /const entry = displayCommand\(raw, engine\.location, \[\]\)/);
  assert.match(app, /await sleep\(reducedMotion\.matches \? 0 : SHORTCUT_REPLY_DELAY_MS/);
  assert.match(app, /submitCommand\(raw, \{ existingEntry: entry, focusWhenReady: current\.focusWhenDone \}\)/);
  assert.match(app, /if \(response\.lines\.length\)/);
  assert.match(app, /existingEntry\.appendChild\(result\)/);
  assert.match(app, /button\.addEventListener\('click', \(\) => \{ void runQuickAction\(shortcut\.command\); \}\)/);
});

test('staged shortcuts can be canceled safely and do not animate typed characters', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /function cancelPendingShortcut\(\)/);
  assert.match(app, /current\.controller\.abort\('interrupt'\)/);
  assert.match(app, /pendingShortcut !== current/);
  assert.match(app, /if \(activeLaunch\) cancelLaunch\('interrupt'\)/);
  assert.match(app, /if \(activeLaunch \|\| pendingShortcut\) return false;/);
  assert.match(app, /if \(existingEntry && !response\.timeline\)/);
  assert.match(app, /reducedMotion\.matches \? 0 : SHORTCUT_REPLY_DELAY_MS/);
});

test('architecture diagrams use compact Mermaid flowcharts', () => {
  const doc = readFileSync(new URL('../docs/DEVELOPMENT.md', import.meta.url), 'utf8');
  const diagrams = [...doc.matchAll(/```mermaid\n([\s\S]*?)\n```/g)];
  assert.equal(diagrams.length, 2);
  assert.ok(diagrams.every(item => /^flowchart (?:TD|TB|LR)\n/.test(item[1])));
  assert.doesNotMatch(doc, /sequenceDiagram/);
  assert.match(doc, /Pause 280 ms/);
});





test('terminal footer offers a configurable external source link', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(repositoryLink.url, 'https://github.com/yassinebkr/ShellFolio');
  assert.match(repositoryLink.text, /ShellFolio.*GitHub/);
  assert.match(app, /source\.className = 'source-repo-link'/);
  assert.match(app, /source\.href = repositoryLink\.url/);
  assert.match(app, /source\.target = '_blank'/);
  assert.match(app, /source\.rel = 'noopener noreferrer'/);
  assert.match(app, /rail\.appendChild\(source\)/);
  assert.match(css, /\.source-repo-link/);
  assert.match(html, /style\.css\?v=12/);
});

test('web cursor matches the animated SVG block while preserving native editing', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(html, /id="terminal-cursor" class="terminal-cursor" aria-hidden="true"/);
  assert.match(css, /#command-input \{ caret-color: transparent; \}/);
  assert.match(css, /\.terminal-cursor \{/);
  assert.match(css, /width: 1ch;/);
  assert.match(css, /pointer-events: none;/);
  assert.match(css, /@keyframes terminal-cursor-blink/);
  assert.match(app, /function updateTerminalCursor\(\)/);
  assert.match(app, /input\.selectionStart/);
  assert.match(app, /input\.scrollLeft/);
  assert.match(app, /input\.addEventListener\('scroll', updateTerminalCursor\)/);
  assert.match(app, /document\.addEventListener\('selectionchange'/);
  assert.match(html, /style\.css\?v=12/);
});

test('manual neofetch requests the full initial Debian profile, not simplified lines', () => {
  const shell = new TerminalEngine();
  const response = shell.execute('neofetch');
  const printed = stringify(response);
  assert.equal(response.view, 'system-profile');
  for (const term of ['Debian GNU/Linux 13', 'Shell', 'Xfce', 'xfce4-terminal', 'KiCad', 'CinemaPi5']) {
    assert.ok(printed.includes(term), 'Missing neofetch field: ' + term);
  }
  assert.match(stringify(shell.execute('neofetch --bad')), /unexpected arguments/);
  assert.notEqual(shell.execute('clear').view, 'system-profile');
  assert.equal(shell.execute('neofetch').view, 'system-profile');
});

test('manual and shortcut neofetch reuse the same initial markup after clearing', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(html, /class="sysfetch"/);
  assert.match(html, /class="sysfetch-logo"/);
  assert.match(html, /assets\/debian\.svg/);
  assert.match(html, /class="palette"/);
  assert.match(app, /initialSystemProfile = output\.querySelector\('\.sysfetch'\)\?\.cloneNode\(true\)/);
  assert.match(app, /response\.view === 'system-profile' && initialSystemProfile/);
  assert.match(app, /initialSystemProfile\.cloneNode\(true\)/);
  assert.match(app, /output\.replaceChildren\(\)/);
  assert.match(css, /\.sysfetch-info dl/);
});

test('cloned neofetch uses normal whitespace while shell text preserves pre-wrap', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(css, /\.entry-result \{[^}]*white-space: pre-wrap;/s);
  assert.match(css, /\.entry-result \.sysfetch \{ white-space: normal; \}/);
  assert.match(app, /initialSystemProfile\.cloneNode\(true\)/);
  assert.doesNotMatch(css, /\.entry-result \.sysfetch \{ white-space: pre-wrap; \}/);
});

test('automatic introduction restores keyboard focus without stealing selections', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /focusWhenReady = false/);
  assert.match(app, /focusWhenReady: true/);
  assert.match(app, /if \(focus && document\.hasFocus\(\) && \(!selection \|\| selection\.isCollapsed\)\)/);
  assert.match(app, /restorePrompt\(\{ focus: shouldFocus \}\)/);
  assert.match(app, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /document\.addEventListener\('pointerdown'/);
  assert.match(app, /activeLaunch\.focusWhenReady = false/);
  assert.match(app, /activeLaunch\.pendingTyping \+= event\.key/);
  assert.match(app, /cancelLaunch\('skip'\)/);
  assert.match(app, /if \(!pendingShortcut\)/);
});

test('Escape explicitly returns focus to the prompt after skipping playback', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /focusOnEscape: false/);
  assert.match(app, /activeLaunch\.focusOnEscape = true/);
  assert.match(app, /const shouldFocus = run\.focusOnEscape \|\|/);
  assert.match(app, /const shouldFocus = run\.focusOnEscape \|\|/);
  assert.match(app, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /\(!selection \|\| selection\.isCollapsed\)/);
  assert.match(app, /if \(pendingShortcut\) \{\s*cancelPendingShortcut\(\)/);
});

test('README SVG pauses clearly between commands without reverse erasure', () => {
  const svg = readFileSync(new URL('../assets/terminal-demo-paced.svg', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /assets\/terminal-demo-paced\.svg/);
  assert.match(readme, /\]\(https:\/\/yassinebkr\.github\.io\/ShellFolio\/\)/);
  assert.match(svg, /\.transcript\{animation:replayFade 11s linear infinite\}/);
  assert.match(svg, /id="quick-actions-preview"/);
  assert.match(svg, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(svg, /100% \{ width:0; \}/);

  const seconds = percentage => Number(percentage) * 11 / 100;
  function shownAt(name) {
    const found = svg.match(new RegExp(`@keyframes ${name} \\{0%, [\\d.]+% \\{opacity:0;\\} ([\\d.]+)%, 100%`));
    assert.ok(found, `Missing reveal animation ${name}`);
    return seconds(found[1]);
  }
  function typedAt(index, end = false) {
    const found = svg.match(new RegExp(`@keyframes typing${index} \\{ 0%, ([\\d.]+)% \\{ width:0; \\} ([\\d.]+)%, 100%`));
    assert.ok(found, `Missing typing animation ${index}`);
    return seconds(found[end ? 2 : 1]);
  }
  const pauses = [
    typedAt(1) - shownAt('result0'),
    typedAt(2) - typedAt(1, true),
    typedAt(3) - shownAt('result2')
  ];
  for (const pause of pauses) {
    assert.ok(pause >= 0.7 && pause <= 0.95, `Unnatural command gap: ${pause}s`);
  }
  assert.ok(shownAt('lastPrompt') - shownAt('result3') <= 0.2);
  assert.ok(shownAt('sequence1') < typedAt(1));
  assert.ok(shownAt('sequence2') < typedAt(2));
  assert.ok(shownAt('sequence3') < typedAt(3));
});

test('shortcut completion always restores the editable prompt and keyboard focus', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const restore = app.slice(app.indexOf('function restorePrompt('), app.indexOf('async function playLaunch('));
  assert.match(restore, /if \(activeLaunch \|\| pendingShortcut\) return false;/);
  assert.match(restore, /input\.readOnly = false;/);
  assert.match(restore, /form\.hidden = false;/);
  assert.match(restore, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /submitCommand\(raw, \{ existingEntry: entry, focusWhenReady: current\.focusWhenDone \}\)/);
  assert.match(app, /restorePrompt\(\{ focus: focusWhenReady \}\)/);
  assert.match(app, /restorePrompt\(\{ focus: current\.focusWhenDone \}\)/);
  assert.match(app, /run\.startedByShortcut/);
  assert.match(html, /app\.js\?v=14/);
});
test('shortcut focus restoration respects another action and text selection', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(pendingShortcut === current\) pendingShortcut = null;/);
  assert.match(app, /if \(activeLaunch \|\| pendingShortcut\) return false;/);
  assert.match(app, /if \(pendingShortcut\) pendingShortcut\.focusWhenDone = false;/);
  assert.match(app, /\(!selection \|\| selection\.isCollapsed\)/);
  assert.match(app, /activeLaunch\.focusOnEscape = true/);
});
