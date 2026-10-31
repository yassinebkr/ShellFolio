/**
 * Read-only portfolio command interpreter.
 *
 * The engine exposes structured output to both the browser and Node tests.
 * It processes a curated virtual filesystem with deterministic commands and
 * uses a dedicated UI renderer for all HTML and link creation.
 */

import { LAUNCH_STEPS, resolvedLaunchLines } from './launch-script.js';

const home = '/home/yassine';
const root = {
  hardware: {
    about: 'Electronics design · PCB layout · circuit debugging · testing',
    files: {
      'README.md': ['HARDWARE ENGINEERING', '', 'EDA         KiCad · schematic capture · PCB layout', 'Analysis    SPICE simulation', 'Interfaces  I2C · SPI · UART · RS-485', 'Assembly    Soldering · reflow · board bring-up', 'Methods     Design → Build → Measure → Iterate']
    }
  },
  embedded: {
    about: 'Embedded Linux · RP2040 · radio · sensors',
    files: {
      'README.md': ['EMBEDDED SYSTEMS', '', 'Platforms   Raspberry Pi 5 · RP2040', 'Firmware    Python · C / C++', 'Sensors     IMU · GNSS · image sensors', 'Radio       RFM95 LoRa 868 MHz', 'Transport   TCP/IP · Ethernet · UART', 'Evidence    CinemaPi5 camera + 45 km LoRa field test']
    }
  },
  software: {
    about: 'Programming · networking · user interfaces · AI',
    files: {
      'README.md': ['SOFTWARE ENGINEERING', '', 'Languages   Python · C · C++', 'Systems     Debian Linux · Git', 'Networking  TCP · Ethernet', 'Front-end   Web UI · PWA', 'Research    AI agents · computer vision · generative UI']
    }
  },
  fabrication: {
    about: 'CAD · CNC · FDM · electronics assembly',
    files: {
      'README.md': ['DIGITAL FABRICATION', '', 'CAD         Fusion 360', 'CNC         TTC450 / 1.5 kW spindle', '3D Printing Qidi Plus 4 · Klipper', 'Electronics Reflow oven · hot air · soldering', 'Workflow    Prototype → integrate → validate']
    }
  },
  projects: {
    about: 'Engineering case studies and measured outcomes',
    files: {
      'README.md': ['PROJECT INDEX', '', 'cinemapi5/   DIY cinema camera', 'lora/        45 km telemetry field test', 'bigbrain/    Multi-agent workspace concept']
    },
    children: {
      cinemapi5: ['CinemaPi5', 'Custom cinema camera / Raspberry Pi 5 + Sony IMX283', 'Capture      RAW · Libcamera · PISP', 'Interface    Web preview · PWA · HUD · LUTs', 'Performance  4K 12-bit 30 fps target (under validation)', 'Repository   https://github.com/yassinebkr/cinematepi5'],
      lora: ['LoRa Telemetry', '45 km wireless link validated in a field test', 'Controller   Feather RP2040', 'RF           RFM95 868 MHz', 'Sensors      IMU + GNSS', 'Antenna      Directional Yagi', 'Outcome      Successful 45 km link'],
      bigbrain: ['Aplot AI / BigBrain', 'Multi-agent workspace and generative interface research', 'Focus        Agent orchestration · task-specific UI', 'Approach     Evidence · execution · adaptive work surfaces', 'Stage        Experimental project']
    }
  }
};
const safeLinks = new Map([
  ['github', 'https://github.com/yassinebkr'],
  ['cinemapi5', 'https://github.com/yassinebkr/cinematepi5']
]);
const groups = Object.keys(root);
const cwdRoot = `${home}/workspace`;

const segment = (text, style = '') => ({ text: String(text), style });
const line = (...parts) => ({ parts: parts.map(part => typeof part === 'string' ? segment(part) : part) });
const plain = text => line(segment(text));
const lines = (...xs) => xs.map(plain);
const err = text => [line(segment(text, 'pink'))];

/** Convert an absolute or relative virtual path into a canonical path. */
function resolvePath(cwd, path = '.') {
  let input = path.trim() || '.';
  if (input === '~') input = home;
  else if (input.startsWith('~/')) input = `${home}/${input.slice(2)}`;
  else if (input.startsWith('/')) { /* Keep absolute paths. */ }
  else input = `${cwd}/${input}`;
  const parts = [];
  for (const p of input.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') parts.pop();
    else parts.push(p);
  }
  return `/${parts.join('/')}`;
}

function isDir(path) {
  if (path === '/' || path === '/home' || path === home || path === cwdRoot) return true;
  const prefix = `${cwdRoot}/`;
  if (!path.startsWith(prefix)) return false;
  const suffix = path.slice(prefix.length).split('/').filter(Boolean);
  if (suffix.length === 1) return Object.hasOwn(root, suffix[0]);
  if (suffix.length === 2 && suffix[0] === 'projects') {
    return Object.hasOwn(root.projects.children, suffix[1]);
  }
  return false;
}

function getFile(path) {
  if (path === `${home}/README.md`) return ['YASSINE / ENGINEERING LAB', '', 'Electronics · embedded systems · software · digital fabrication', 'Explore with: ls workspace, cd workspace, projects, skills'];
  const prefix = `${cwdRoot}/`;
  if (!path.startsWith(prefix)) return null;
  const suffix = path.slice(prefix.length).split('/').filter(Boolean);
  if (suffix.length === 2 && suffix[1] === 'README.md' && Object.hasOwn(root, suffix[0])) return root[suffix[0]].files['README.md'];
  if (suffix.length === 3 && suffix[0] === 'projects' && suffix[2] === 'README.md') return root.projects.children[suffix[1]] ?? null;
  return null;
}

function children(path) {
  if (path === '/') return ['home/'];
  if (path === '/home') return ['yassine/'];
  if (path === home) return ['README.md', 'workspace/'];
  if (path === cwdRoot) return groups.map(x => `${x}/`);
  if (path === `${cwdRoot}/projects`) return ['README.md', ...Object.keys(root.projects.children).map(x => `${x}/`)];
  if (path.startsWith(`${cwdRoot}/`)) {
    const name = path.slice(cwdRoot.length + 1);
    if (Object.hasOwn(root, name)) return ['README.md'];
    if (name.startsWith('projects/') && Object.hasOwn(root.projects.children, name.slice('projects/'.length))) return ['README.md'];
  }
  return null;
}

function cwdLabel(cwd) {
  return cwd === home ? '~' : cwd.startsWith(`${home}/`) ? `~${cwd.slice(home.length)}` : cwd;
}

function tokenize(input) {
  // Single and double quotes allow paths with spaces, matching common shell UX.
  const tokens = [];
  let token = '', quote = '', started = false;
  for (const c of input.trim()) {
    if (quote) {
      if (c === quote) quote = '';
      else token += c;
    } else if (c === '"' || c === "'") { quote = c; started = true; }
    else if (/\s/.test(c)) { if (started) { tokens.push(token); token = ''; started = false; } }
    else { token += c; started = true; }
  }
  if (quote) return { error: 'shell: unmatched quotation mark' };
  if (started) tokens.push(token);
  return { tokens };
}

export class TerminalEngine {
  constructor() { this.cwd = home; this.history = []; }
  get location() { return cwdLabel(this.cwd); }
  get commands() { return ['help', 'ls', 'pwd', 'cd', 'cat', 'tree', 'about', 'whoami', 'skills', 'projects', 'inspect', 'open', 'history', 'neofetch', 'clear', 'reset', 'exit', './launch-interactive.sh']; }

  /** Find candidates for live ghost text and shell-style Tab completion. */
  suggest(value) {
    if (!value || !value.trim()) return { replacement: value, matches: [] };
    const parts = value.match(/^(.*?)([^\s]*)$/);
    const prefix = parts?.[1] || '';
    const last = parts?.[2] || '';
    if (!last) return { replacement: value, matches: [] };
    const words = prefix.trim().split(/\s+/).filter(Boolean);
    let choices = [];
    if (!words.length) choices = this.commands;
    else if (words[0] === 'inspect') choices = ['cinemapi5', 'lora', 'bigbrain'];
    else if (words[0] === 'open') choices = [...safeLinks.keys()];
    else if (['cd', 'ls', 'cat', 'tree'].includes(words[0])) {
      const slash = last.lastIndexOf('/');
      const before = slash >= 0 ? last.slice(0, slash + 1) : '';
      const base = resolvePath(this.cwd, before || '.');
      choices = (children(base) || []).map(item => before + item);
    }
    const matches = choices.filter(option => option.toLowerCase().startsWith(last.toLowerCase()));
    return { replacement: matches.length === 1 ? prefix + matches[0] : value, matches };
  }

  complete(value) {
    return this.suggest(value).replacement;
  }

  /** Return structured lines; browser rendering always uses textContent. */
  execute(raw) {
    const input = raw.trim();
    if (!input) return { lines: [], cwd: this.cwd };
    if (input.length > 240) return { lines: err('shell: input exceeds 240 characters'), cwd: this.cwd };
    this.history.push(input);
    const parsed = tokenize(input);
    if (parsed.error) return { lines: err(parsed.error), cwd: this.cwd };
    const [command, ...args] = parsed.tokens;
    const value = args.join(' ');
    if (['clear', 'reset'].includes(command)) return { lines: [], clear: true, cwd: this.cwd };
    if (command === 'pwd') return { lines: lines(this.cwd), cwd: this.cwd };
    if (command === 'whoami') return { lines: lines('yassine'), cwd: this.cwd };
    if (command === 'history') return { lines: this.history.slice(-30).map((cmd, i) => plain(`${String(Math.max(1, this.history.length - 29) + i).padStart(3)}  ${cmd}`)), cwd: this.cwd };
    if (command === 'exit') return { lines: lines('Session preserved. Type help to keep exploring.'), cwd: this.cwd };
    if (command === './launch-interactive.sh') {
      if (args.length) return { lines: err('launch-interactive.sh: unexpected arguments'), cwd: this.cwd };
      const lines = resolvedLaunchLines().map(item => line(segment(item.text, item.style)));
      return { lines, timeline: LAUNCH_STEPS, cwd: this.cwd };
    }
    if (command === 'neofetch') return { lines: [line(segment('yassine@debian', 'green')), ...lines('OS         Debian GNU/Linux 13 (trixie)', 'Focus      Electronics / Embedded Systems', 'Toolchain  KiCad · Python · C · C++', 'Projects   CinemaPi5 · LoRa 45 km')], cwd: this.cwd };
    if (command === 'help') return { lines: [line(segment('SHELLFOLIO — available commands', 'cyan bold')), ...lines('  help                  Show command reference', '  ls [-l] [path]        List workspace directories', '  cd <path>             Change virtual directory', '  pwd                   Print current directory', '  cat <file>            Read a technical document', '  tree [path]           Explore directory hierarchy', '  skills                Browse technical domains', '  projects              Browse engineering projects', '  inspect <project>     Read an engineering case study', '  open <project>        Open a public source repository', '  about / whoami        Engineer profile', '  history               Show executed commands', '  clear / reset         Clear terminal output', '  Tab / ↑ / ↓           Complete and recall commands')], cwd: this.cwd };
    if (command === 'about') return { lines: [line(segment('YASSINE / ELECTRONICS & EMBEDDED SYSTEMS', 'cyan bold')), ...lines('Engineering across electronics, embedded Linux, software and digital fabrication.', 'Selected evidence: 45 km LoRa telemetry link and Raspberry Pi 5 cinema camera.', 'Approach: Design → Build → Test → Measure → Iterate.')], cwd: this.cwd };
    if (command === 'skills') return { lines: [line(segment('ENGINEERING DISCIPLINES', 'cyan bold')), ...groups.filter(x => x !== 'projects').map(name => line(segment(name.padEnd(14) + root[name].about, 'blue'))), plain('Tip: cd workspace/embedded && cat README.md')], cwd: this.cwd };
    if (command === 'projects') return { lines: [line(segment('PROJECTS / ENGINEERING EVIDENCE', 'cyan bold')), ...Object.entries(root.projects.children).map(([name, content]) => line(segment(name.padEnd(15), 'blue'), segment(content[1]))), plain('Tip: inspect cinemapi5   or   inspect lora')], cwd: this.cwd };
    if (command === 'inspect') {
      const project = (args[0] || '').toLowerCase();
      const entry = root.projects.children[project];
      if (!entry) return { lines: err(`inspect: unknown project '${args[0] || ''}'. Available: cinemapi5, lora, bigbrain`), cwd: this.cwd };
      const result = [line(segment(entry[0].toUpperCase(), 'cyan bold')), ...entry.slice(1).map(s => plain(s))];
      if (project === 'cinemapi5') result.push(line({ text:'Open CinemaPi5 repository ↗', style:'blue', href: safeLinks.get('cinemapi5') }));
      return { lines: result, cwd: this.cwd };
    }
    if (command === 'open') {
      const key = (args[0] || '').toLowerCase();
      if (!safeLinks.has(key)) return { lines: err(`open: available destinations: ${[...safeLinks.keys()].join(', ')}`), cwd: this.cwd };
      return { lines: [line({text:`Open ${key} on GitHub ↗`,style:'blue',href:safeLinks.get(key)})], cwd: this.cwd };
    }
    if (command === 'cd') {
      if (args.length > 1) return { lines: err('cd: expected one directory argument'), cwd: this.cwd };
      const target = resolvePath(this.cwd, args[0] || '~');
      if (!isDir(target)) return { lines: err(`cd: ${args[0]}: directory unavailable`), cwd: this.cwd };
      this.cwd = target; return { lines: [], cwd: this.cwd };
    }
    if (command === 'ls') {
      const bad = args.find(a => a.startsWith('-') && !/^-[al]+$/.test(a));
      if (bad) return { lines: err(`ls: unsupported option '${bad}'. Try ls -l`), cwd: this.cwd };
      const long = args.some(a => a.includes('l') && a.startsWith('-'));
      const pos = args.find(a => !a.startsWith('-')) || '.';
      const target = resolvePath(this.cwd, pos);
      const childrenAtPath = children(target);
      if (!childrenAtPath) {
        const file = getFile(target);
        return { lines: file ? lines(pos) : err(`ls: cannot access '${pos}': path unavailable`), cwd: this.cwd };
      }
      if (!long) return { lines: [line(...childrenAtPath.map(x => segment(x.padEnd(17), x.endsWith('/') ? 'dir' : '')))], cwd: this.cwd };
      const rows = [plain(`total ${childrenAtPath.length * 4}`)];
      childrenAtPath.forEach((name,i) => rows.push(line(segment(`${name.endsWith('/') ? 'd' : '-'}rwxr-xr-x  2 yassine  yassine  ${name.endsWith('/') ? '4096' : ' 512'} Oct 31  `, 'muted'), segment(name, name.endsWith('/') ? 'dir' : ''))));
      return { lines: rows, cwd: this.cwd };
    }
    if (command === 'cat') {
      if (!value) return { lines: err('cat: specify a file. Example: cat workspace/embedded/README.md'), cwd: this.cwd };
      const target = resolvePath(this.cwd, value);
      const file = getFile(target);
      return { lines: file ? file.map((row,i) => line(segment(row, i===0?'cyan bold':''))) : err(`cat: ${value}: file unavailable`), cwd: this.cwd };
    }
    if (command === 'tree') {
      const target = resolvePath(this.cwd, value || '.');
      if (!isDir(target)) return { lines: err(`tree: ${value}: directory unavailable`), cwd: this.cwd };
      const result = [plain(target)];
      const walk = (path,prefix,depth) => {
        if (depth > 3) return;
        const list = children(path) || [];
        list.forEach((item,index) => {
          const tail = index === list.length-1;
          result.push(line(segment(prefix + (tail?'└── ':'├── '), 'muted'), segment(item,item.endsWith('/')?'dir':'')));
          if (item.endsWith('/')) walk(resolvePath(path,item),prefix+(tail?'    ':'│   '),depth+1);
        });
      };
      walk(target,'',0);
      return { lines: result, cwd: this.cwd };
    }
    return { lines: err(`${command}: command unavailable. Type help for supported commands.`), cwd: this.cwd };
  }
}

export { home, cwdRoot, resolvePath, tokenize };
