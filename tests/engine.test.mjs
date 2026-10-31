import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalEngine, resolvePath, tokenize } from '../engine.js';
import { LAUNCH_STEPS, resolvedLaunchLines } from '../launch-script.js';
import { initialScene } from '../startup.js';
import { quickActions, presetResponses } from '../portfolio.config.js';
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
  assert.deepEqual(shell.suggest('c').matches, ['cd', 'cat', 'clear', 'clean', 'contact']);
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
  assert.match(stringify(shell.execute('contact private')), /unexpected arguments/);
  assert.ok(Object.hasOwn(presetResponses, 'contact'));
});


test('Run and Clean shortcuts execute virtual commands', () => {
  const shell = new TerminalEngine();
  const run = quickActions.find(action => action.label === 'Run');
  const clean = quickActions.find(action => action.label === 'Clean');
  assert.equal(run?.command, './launch-interactive.sh');
  assert.equal(clean?.command, 'clean');
  assert.ok(shell.execute(run.command).timeline?.length > 0);
  assert.ok(shell.execute('run').timeline?.length > 0);
  assert.equal(shell.execute(clean.command).clear, true);
  assert.equal(shell.execute('clear').clear, true);
  assert.equal(shell.execute('reset').clear, true);
  assert.ok(shell.suggest('cle').matches.includes('clean'));
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
