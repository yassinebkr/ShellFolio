import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalEngine, resolvePath, tokenize } from '../engine.js';

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
  assert.match(stringify(shell.execute('run sh')), /command unavailable/);
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
  assert.deepEqual(shell.suggest('c').matches, ['cd', 'cat', 'clear']);
  assert.equal(shell.suggest('unknown').matches.length, 0);
  assert.deepEqual(shell.suggest('').matches, []);
  shell.execute('cd workspace/projects');
  assert.equal(shell.suggest('cd lo').replacement, 'cd lora/');
});
