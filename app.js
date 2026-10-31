/** DOM controller for ShellFolio's read-only virtual terminal interface. */
import { TerminalEngine } from './engine.js';

const engine = new TerminalEngine();
const $ = id => document.getElementById(id);
const output = $('output');
const form = $('prompt-form');
const input = $('command-input');
const pwdLabel = $('pwd-label');
const body = $('terminal-body');
let historyIndex = 0;

function renderLine(content, container) {
  const div = document.createElement('div');
  div.className = 'line';
  for (const part of content.parts) {
    const node = part.href ? document.createElement('a') : document.createElement('span');
    node.textContent = part.text;
    if (part.style) node.className = part.style;
    if (part.href) {
      node.href = part.href;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
    }
    div.appendChild(node);
  }
  container.appendChild(div);
}

function displayCommand(command, location, lines) {
  const entry = document.createElement('section');
  entry.className = 'entry';
  const prompt = document.createElement('div');
  prompt.className = 'entry-command';
  const name = document.createElement('span');
  name.textContent = 'yassine@debian';
  name.className = 'user';
  const path = document.createElement('span');
  path.className = 'path';
  path.textContent = ':' + location;
  const sep = document.createElement('span');
  sep.className = 'cmd-sep';
  sep.textContent = '$ ';
  const cmd = document.createElement('span');
  cmd.textContent = command;
  prompt.append(name, path, sep, cmd);
  entry.appendChild(prompt);
  if (lines.length) {
    const result = document.createElement('div');
    result.className = 'entry-result';
    lines.forEach(line => renderLine(line, result));
    entry.appendChild(result);
  }
  output.appendChild(entry);
}

function submitCommand(value = input.value) {
  const raw = String(value).trim();
  if (!raw) { input.focus(); return; }
  const location = engine.location;
  const response = engine.execute(raw);
  if (response.clear) {
    // Keep the original neofetch scene, clear only submitted command history.
    output.querySelectorAll('.entry').forEach(el => el.remove());
  } else {
    displayCommand(raw, location, response.lines);
  }
  pwdLabel.textContent = ':' + engine.location;
  historyIndex = engine.history.length;
  input.value = '';
  input.focus();
  body.scrollTop = body.scrollHeight;
}

form.addEventListener('submit', e => { e.preventDefault(); submitCommand(); });
input.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    historyIndex = Math.max(0,historyIndex - 1);
    input.value = engine.history[historyIndex] || '';
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    historyIndex = Math.min(engine.history.length,historyIndex + 1);
    input.value = engine.history[historyIndex] || '';
  } else if (e.key === 'Tab') {
    e.preventDefault();
    input.value = engine.complete(input.value);
  } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
    e.preventDefault(); submitCommand('clear');
  }
});
document.querySelectorAll('[data-command]').forEach(btn => btn.addEventListener('click', () => submitCommand(btn.dataset.command)));
body.addEventListener('click', event => {
  // Reading links and selecting output remain available without focus changes.
  if (event.target.closest('a,button,input')) return;
  input.focus();
});
input.focus({preventScroll:true});
