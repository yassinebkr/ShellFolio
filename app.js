/** Browser controller for ShellFolio's read-only terminal simulator. */
import { TerminalEngine } from './engine.js';
import { initialScene } from './startup.js';
import { quickActions, menuGroups } from './portfolio.config.js';

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
let activeLaunch = null;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Abortable delay used for the script's human-scale pacing. The animation
 * never blocks the main thread; Ctrl+C cancels pending timers immediately.
 */
function sleep(ms, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function scrollToBottom() {
  body.scrollTop = body.scrollHeight;
}

/**
 * Script output is built with textContent, not HTML strings. A single status
 * row is updated in-place for each spinner, like a normal CLI progress line.
 */
async function playLaunch(entry, timeline, typedCommand = '') {
  const controller = new AbortController();
  const signal = controller.signal;
  const result = document.createElement('div');
  result.className = 'entry-result';
  result.setAttribute('aria-label', 'Virtual portfolio launcher output');
  entry.appendChild(result);
  const run = { controller };
  activeLaunch = run;
  const commandNode = entry.querySelector('.entry-command span:last-child');
  // A startup command is typed into the visible previous prompt before
  // execution output begins. Replays invoked by the user show it immediately.
  if (typedCommand && !commandNode) throw new Error('Shell prompt is missing');
  input.readOnly = true;
  // Quick actions remain available: selecting one finishes this introduction
  // and immediately runs the chosen read-only command.
  const quickPace = () => reducedMotion.matches;
  let currentRow = null;
  let stepIndex = -1;
  const renderFinal = (step, existingRow = null) => {
    const row = existingRow || document.createElement('div');
    row.className = 'line';
    row.textContent = step.kind === 'progress' ? '[ok] ' + step.label : step.text;
    if (step.style) row.className += ' ' + step.style.split(/\s+/).map(c => 'script-' + c).join(' ');
    if (!existingRow) result.appendChild(row);
    scrollToBottom();
  };
  try {
    if (typedCommand) {
      if (quickPace()) {
        commandNode.textContent = typedCommand;
      } else {
        await sleep(190, signal);
        for (const character of typedCommand) {
          commandNode.textContent += character;
          scrollToBottom();
          await sleep(34, signal);
        }
        await sleep(220, signal);
      }
    }
    for (stepIndex = 0; stepIndex < timeline.length; stepIndex++) {
      const step = timeline[stepIndex];
      currentRow = null;
      await sleep(quickPace() ? 0 : step.delay || 0, signal);
      if (step.kind === 'progress') {
        const row = document.createElement('div');
        row.className = 'line script-progress';
        result.appendChild(row);
        currentRow = row;
        const frames = ['|', '/', '-', '\\'];
        const iterations = quickPace() ? 0 : Math.max(2, Math.round(step.duration / 120));
        for (let tick = 0; tick < iterations; tick++) {
          row.textContent = '[' + frames[tick % frames.length] + '] ' + step.label;
          scrollToBottom();
          await sleep(120, signal);
        }
        renderFinal(step, row);
      } else if (step.kind === 'type' && !quickPace()) {
        const row = document.createElement('div');
        row.className = 'line' + (step.style ? ' ' + step.style.split(/\s+/).map(c => 'script-' + c).join(' ') : '');
        result.appendChild(row);
        currentRow = row;
        for (const character of step.text) {
          row.textContent += character;
          scrollToBottom();
          await sleep(step.speed || 16, signal);
        }
      } else {
        renderFinal(step);
      }
    }
  } catch {
    if (signal.reason === 'skip') {
      // A skip may occur during command typing, before the first output row.
      if (typedCommand) commandNode.textContent = typedCommand;
      if (stepIndex >= 0 && stepIndex < timeline.length) {
        if (currentRow) renderFinal(timeline[stepIndex], currentRow);
        else renderFinal(timeline[stepIndex]);
      }
      for (const step of timeline.slice(Math.max(0, stepIndex + 1))) renderFinal(step);
    } else {
      const interrupted = document.createElement('div');
      interrupted.className = 'line script-muted';
      interrupted.textContent = '^C';
      result.appendChild(interrupted);
    }
  } finally {
    if (activeLaunch === run) {
      activeLaunch = null;
      input.readOnly = false;
      // The persistent quick-action rail remains interactive throughout.
      input.focus({ preventScroll: true });
      refreshCompletion();
      scrollToBottom();
    }
  }
}

function cancelLaunch(reason) {
  if (!activeLaunch) return false;
  activeLaunch.controller.abort(reason);
  return true;
}

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
  return entry;
}

/**
 * Run the authored introduction for every normal visit, not only for
 * profile-README links carrying ?run=launch. Display and type the Bash-style
 * invocation before progressively rendering its virtual output.
 *
 * An explicit ?view=listing remains available to inspect the original
 * directory listing without initiating the guided introduction.
 */
renderQuickActions();
renderMenus();
if (initialScene(window.location.search) === 'launch') {
  submitCommand('./launch-interactive.sh', { typeCommand: true });
} else {
  const listing = engine.execute('ls -l ~/workspace');
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

function submitCommand(value = input.value, { typeCommand = false } = {}) {
  if (activeLaunch) {
    // Allow a visitor to choose a shortcut instead of watching the full intro.
    // The pending animation settles in a microtask before the next command.
    cancelLaunch('skip');
    window.setTimeout(() => submitCommand(value, { typeCommand }), 0);
    return;
  }
  const raw = String(value).trim();
  if (!raw) { input.focus(); return; }
  const location = engine.location;
  const response = engine.execute(raw);
  if (response.clear) {
    output.querySelectorAll('.entry').forEach(entry => entry.remove());
  } else if (response.timeline) {
    const entry = displayCommand(typeCommand ? '' : raw, location, []);
    // The startup prompt is visibly typed; a manual replay starts immediately.
    void playLaunch(entry, response.timeline, typeCommand ? raw : '');
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
  if (activeLaunch && event.ctrlKey && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    cancelLaunch('interrupt');
    return;
  }
  if (activeLaunch && event.key === 'Escape') {
    event.preventDefault();
    cancelLaunch('skip');
    return;
  }
  if (activeLaunch) {
    if (event.key === 'Enter' || event.key === 'Tab') event.preventDefault();
    return;
  }
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
/**
 * Build the always-visible visitor shortcuts from the public configuration.
 * All buttons share the same command handler as a manually entered command.
 */
function renderQuickActions() {
  const rail = $('quick-commands');
  rail.replaceChildren();
  const label = document.createElement('span');
  label.className = 'quick-label';
  label.textContent = 'TRY';
  rail.appendChild(label);
  for (const shortcut of quickActions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.command = shortcut.command;
    button.textContent = shortcut.label;
    button.title = shortcut.command;
    button.addEventListener('click', () => submitCommand(shortcut.command));
    rail.appendChild(button);
  }
}

/** Convert the real clipboard success/failure into a visible terminal line. */
function statusLine(message, style = 'muted') {
  const row = document.createElement('div');
  row.className = 'line';
  const text = document.createElement('span');
  text.className = style;
  text.textContent = message;
  row.appendChild(text);
  output.appendChild(row);
  scrollToBottom();
}

function runMenuAction(id) {
  const shellActions = {
    workspace: 'ls -l ~/workspace',
    intro: './launch-interactive.sh',
    clear: 'clear',
    help: 'help'
  };
  if (Object.hasOwn(shellActions, id)) {
    submitCommand(shellActions[id]);
  } else if (id === 'restart') {
    if (activeLaunch) cancelLaunch('skip');
    window.setTimeout(() => {
      output.querySelectorAll('.entry').forEach(entry => entry.remove());
      engine.execute('cd ~');
      submitCommand('./launch-interactive.sh');
    }, 0);
  } else if (id === 'copy') {
    navigator.clipboard.writeText(output.innerText).then(
      () => statusLine('Terminal output copied to clipboard.'),
      () => statusLine('Clipboard permission unavailable; select the text to copy.', 'pink')
    );
  } else if (['font-up', 'font-down', 'font-reset'].includes(id)) {
    if (id === 'font-reset') {
      body.style.removeProperty('font-size');
    } else {
      const current = parseFloat(getComputedStyle(body).fontSize);
      const delta = id === 'font-up' ? 1 : -1;
      body.style.fontSize = Math.min(20, Math.max(11, current + delta)) + 'px';
    }
  } else if (id === 'new-tab') {
    window.open('./', '_blank', 'noopener,noreferrer');
  } else if (id === 'guide') {
    window.open('https://github.com/yassinebkr/ShellFolio/blob/main/docs/CUSTOMIZATION.md', '_blank', 'noopener,noreferrer');
  }
}

function renderMenus() {
  const bar = $('menu-bar');
  bar.replaceChildren();
  const groups = [];
  for (const group of menuGroups) {
    const details = document.createElement('details');
    details.className = 'menu-item';
    const summary = document.createElement('summary');
    summary.textContent = group.label;
    details.appendChild(summary);
    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown';
    for (const action of group.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        details.open = false;
        runMenuAction(action.id);
      });
      dropdown.appendChild(button);
    }
    details.appendChild(dropdown);
    details.addEventListener('toggle', () => {
      if (details.open) {
        groups.forEach(other => { if (other !== details) other.open = false; });
      }
    });
    bar.appendChild(details);
    groups.push(details);
  }
  document.addEventListener('pointerdown', event => {
    if (!bar.contains(event.target)) groups.forEach(group => { group.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      groups.forEach(group => { group.open = false; });
    }
  });
}
body.addEventListener('click', e => {
  if (e.target.closest('a,button,input')) return;
  input.focus();
});
refreshCompletion();
input.focus({ preventScroll: true });
