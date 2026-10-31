/** Browser controller for ShellFolio's read-only terminal simulator. */
import { TerminalEngine } from './engine.js';

const engine = new TerminalEngine();
const $ = id => document.getElementById(id);
const output = $('output');
const form = $('prompt-form');
const input = $('command-input');
const pwdLabel = $('pwd-label');
const windowTitle = $('window-title');
const body = $('terminal-body');
const ghostPrefix = $('ghost-prefix');
const ghostSuffix = $('ghost-suffix');
const completionOptions = $('completion-options');
let historyIndex = 0;
let completionCandidates = [];

function renderLine(content, container) {
  const row = document.createElement('div');
  row.className = 'line';
  for (const part of content.parts) {
    const node = part.href ? document.createElement('a') : document.createElement('span');
    node.textContent = part.text;
    if (part.style) node.className = part.style;
    if (part.href) {
      node.href = part.href;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
    }
    row.appendChild(node);
  }
  container.appendChild(row);
}

function displayCommand(command, location, lines) {
  const entry = document.createElement('section');
  entry.className = 'entry';
  const prompt = document.createElement('div');
  prompt.className = 'entry-command';
  for (const [value, kind] of [
    ['yassine@debian', 'user'], [':' + location, 'path'], ['$ ', 'cmd-sep'], [command, '']
  ]) {
    const piece = document.createElement('span');
    piece.textContent = value;
    if (kind) piece.className = kind;
    prompt.appendChild(piece);
  }
  entry.appendChild(prompt);
  if (lines.length) {
    const result = document.createElement('div');
    result.className = 'entry-result';
    lines.forEach(value => renderLine(value, result));
    entry.appendChild(result);
  }
  output.appendChild(entry);
}

/**
 * Keep the initial session consistent with the virtual interpreter.
 * The README launcher uses ?run=launch; only that exact flag is accepted.
 */
const launcherRequested = new URLSearchParams(window.location.search).get('run') === 'launch';
if (launcherRequested) {
  submitCommand('./launch-interactive.sh');
} else {
  const initialSession = new TerminalEngine();
  const listing = initialSession.execute('ls -l ~/workspace');
  displayCommand('ls -l ~/workspace', '~', listing.lines);
}

function refreshCompletion(showMatches = false) {
  const typed = input.value;
  // Completion applies to the end of the command line, like a regular shell.
  const caretAtEnd = input.selectionStart === typed.length && input.selectionEnd === typed.length;
  const suggestion = caretAtEnd ? engine.suggest(typed) : { replacement: typed, matches: [] };
  completionCandidates = suggestion.matches;
  const suffix = suggestion.matches.length === 1 ? suggestion.replacement.slice(typed.length) : '';
  ghostPrefix.textContent = suffix ? typed : '';
  ghostSuffix.textContent = suffix;
  completionOptions.hidden = !(showMatches && suggestion.matches.length > 1);
  completionOptions.textContent = completionOptions.hidden ? '' : suggestion.matches.slice(0, 8).join('    ');
}

function submitCommand(value = input.value) {
  const raw = String(value).trim();
  if (!raw) { input.focus(); return; }
  const location = engine.location;
  const response = engine.execute(raw);
  if (response.clear) {
    output.querySelectorAll('.entry').forEach(entry => entry.remove());
  } else {
    displayCommand(raw, location, response.lines);
  }
  pwdLabel.textContent = ':' + engine.location;
  windowTitle.textContent = `Terminal - yassine@debian: ${engine.location}`;
  historyIndex = engine.history.length;
  input.value = '';
  refreshCompletion();
  input.focus();
  body.scrollTop = body.scrollHeight;
}

form.addEventListener('submit', e => { e.preventDefault(); submitCommand(); });
input.addEventListener('input', () => refreshCompletion());
input.addEventListener('click', () => refreshCompletion());
input.addEventListener('keyup', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) refreshCompletion();
});
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    input.value = engine.history[historyIndex] || '';
    input.setSelectionRange(input.value.length, input.value.length);
    refreshCompletion();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    historyIndex = Math.min(engine.history.length, historyIndex + 1);
    input.value = engine.history[historyIndex] || '';
    input.setSelectionRange(input.value.length, input.value.length);
    refreshCompletion();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    const next = engine.suggest(input.value);
    if (next.matches.length === 1) {
      input.value = next.replacement;
      input.setSelectionRange(input.value.length, input.value.length);
      refreshCompletion();
    } else {
      refreshCompletion(true);
    }
  } else if (event.key === 'ArrowRight') {
    if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
      const next = engine.suggest(input.value);
      if (next.matches.length === 1 && next.replacement !== input.value) {
        event.preventDefault();
        input.value = next.replacement;
        refreshCompletion();
      }
    }
  } else if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
    event.preventDefault();
    submitCommand('clear');
  }
});
document.querySelectorAll('[data-command]').forEach(button => {
  button.addEventListener('click', () => submitCommand(button.dataset.command));
});
body.addEventListener('click', e => {
  if (e.target.closest('a,button,input')) return;
  input.focus();
});
refreshCompletion();
input.focus({ preventScroll: true });
