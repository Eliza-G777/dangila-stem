/* Python in the browser (Pyodide), run inside a Web Worker so a stuck program can be stopped,
   plus a small code editor (line numbers, Tab indents, auto-indent, Ctrl+Enter to run). */
(() => {
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const TIME_LIMIT = 20000; // ms a program may run before it is stopped

const HARNESS = String.raw`
import sys, io, json, os, traceback, builtins, warnings
os.environ['MPLBACKEND'] = 'Agg'
warnings.filterwarnings('ignore', message='.*non-interactive.*')
warnings.filterwarnings('ignore', message='.*Matplotlib is currently using agg.*')
sys.stdin = io.StringIO(__INPUT)
def _input(prompt=''):
    print(prompt, end='')
    line = sys.stdin.readline()
    if not line:
        print()
        raise EOFError('input() needs a value. Type it in the "Program input" box, one answer per line.')
    line = line.rstrip('\n')
    print(line)
    return line
builtins.input = _input
__ns = {'__name__': '__main__'}
__error = None
try:
    exec(compile(__CODE, 'main.py', 'exec'), __ns)
except SystemExit:
    pass
except BaseException:
    __et, __ev, __tb = sys.exc_info()
    __lines = traceback.format_exception(__et, __ev, __tb)
    __error = ''.join(l for l in __lines if '<exec>' not in l and '<string>' not in l and 'pyodide' not in l)
__images = []
if 'matplotlib.pyplot' in sys.modules:
    import matplotlib.pyplot as __plt, base64
    for __n in __plt.get_fignums():
        __buf = io.BytesIO()
        __plt.figure(__n).savefig(__buf, format='png', dpi=90, bbox_inches='tight')
        __images.append(base64.b64encode(__buf.getvalue()).decode())
    __plt.close('all')
__results = []
if __error is None:
    for __t in json.loads(__TESTS_JSON):
        __t = __t.strip()
        if not __t or __t.startswith('#'):
            continue
        try:
            exec(__t, __ns)
            __results.append([__t, True, ''])
        except AssertionError as __e:
            __results.append([__t, False, str(__e) or 'This check failed'])
        except BaseException as __e:
            __results.append([__t, False, type(__e).__name__ + ': ' + str(__e)])
json.dumps({'error': __error, 'images': __images, 'results': __results})
`;

const WORKER = `
importScripts('${PYODIDE}pyodide.js');
let py;
const ready = (async () => {
  py = await loadPyodide({ indexURL: '${PYODIDE}' });
  py.setStdout({ batched: s => postMessage({ type: 'out', text: s + '\\n' }) });
  py.setStderr({ batched: s => postMessage({ type: 'err', text: s + '\\n' }) });
  postMessage({ type: 'ready' });
})().catch(e => postMessage({ type: 'fatal', error: String(e) }));
const HARNESS = ${JSON.stringify(HARNESS)};
onmessage = async e => {
  const { id, code, tests, input } = e.data;
  try {
    await ready;
    postMessage({ type: 'status', text: 'Loading libraries…' });
    await py.loadPackagesFromImports(code);
    py.globals.set('__CODE', code);
    py.globals.set('__TESTS_JSON', JSON.stringify(tests || []));
    py.globals.set('__INPUT', input || '');
    postMessage({ type: 'running' });
    const res = await py.runPythonAsync(HARNESS);
    postMessage({ type: 'done', id, result: JSON.parse(res) });
  } catch (err) {
    postMessage({ type: 'done', id, result: { error: String(err && err.message || err), images: [], results: [] } });
  }
};`;

let worker = null, ready = false, current = null, readyWaiters = [];
const make = () => {
  ready = false;
  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === 'ready') { ready = true; readyWaiters.splice(0).forEach(f => f()); return; }
    if (m.type === 'fatal') { const c = current; current = null; worker.terminate(); worker = null; if (c) c.resolve({ error: 'Python could not start. Check your internet connection and try again.\n(' + m.error + ')', images: [], results: [], fatal: true }); return; }
    if (!current) return;
    if (m.type === 'out') current.onOut && current.onOut(m.text);
    if (m.type === 'err') current.onErr && current.onErr(m.text);
    if (m.type === 'status') current.onStatus && current.onStatus(m.text);
    if (m.type === 'running') { current.onStatus && current.onStatus('Running…'); clearTimeout(current.timer); current.timer = setTimeout(() => STEM.python.stop('Stopped: the program ran for more than 20 seconds. Is there a loop that never ends?'), TIME_LIMIT); }
    if (m.type === 'done') { const c = current; current = null; clearTimeout(c.timer); c.resolve(m.result); }
  };
  worker.onerror = e => { e.preventDefault && e.preventDefault(); if (current) STEM.python.stop(/importScripts|NetworkError|load/i.test(e.message || '') ? 'Python could not be downloaded. Check your internet connection and press Run again.' : 'Python stopped unexpectedly: ' + (e.message || 'unknown error')); };
};

STEM.python = {
  get busy() { return !!current; },
  get loaded() { return ready; },
  // run({ code, tests:[lines], input, onOut, onErr, onStatus }) → Promise<{ error, images, results, stopped }>
  run(opts) {
    if (current) return Promise.reject(new Error('Another program is still running'));
    if (!worker) make();
    if (!ready && opts.onStatus) opts.onStatus('Loading Python… (the first time can take up to a minute)');
    return new Promise(resolve => {
      current = { ...opts, resolve, timer: null };
      worker.postMessage({ id: Date.now(), code: opts.code, tests: opts.tests || [], input: opts.input || '' });
    });
  },
  stop(reason = 'Stopped.') {
    if (worker) { worker.terminate(); worker = null; ready = false; }
    const c = current; current = null;
    if (c) { clearTimeout(c.timer); c.resolve({ error: reason, images: [], results: [], stopped: true }); }
  },
  preload() { if (!worker) make(); return new Promise(r => ready ? r() : readyWaiters.push(r)); }
};

/* ---------- Editor ---------- */
STEM.editor = (host, { value = '', onRun, onChange, rows = 14 } = {}) => {
  host.classList.add('ed');
  host.innerHTML = `<div class="gutter" aria-hidden="true"></div><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python code" rows="${rows}"></textarea>`;
  const ta = host.querySelector('textarea'), gut = host.querySelector('.gutter');
  ta.value = value;
  const nums = () => { const n = ta.value.split('\n').length; if (gut.childElementCount !== n) gut.innerHTML = Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join(''); gut.scrollTop = ta.scrollTop; };
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 4, rows * 22), 640) + 'px'; gut.style.height = ta.style.height; };
  const insert = (text, selStart, selEnd) => { ta.setRangeText(text, selStart, selEnd, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); };
  ta.addEventListener('input', () => { nums(); fit(); onChange && onChange(ta.value); });
  ta.addEventListener('scroll', () => gut.scrollTop = ta.scrollTop);
  ta.addEventListener('keydown', e => {
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun && onRun(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) { const m = /^ {1,4}/.exec(v.slice(ls)); if (m) { ta.setRangeText('', ls, ls + m[0].length, 'start'); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - m[0].length); ta.dispatchEvent(new Event('input', { bubbles: true })); } }
      else if (s !== en && v.slice(s, en).includes('\n')) {
        const block = v.slice(ls, en).split('\n').map(l => '    ' + l).join('\n'); ta.setRangeText(block, ls, en, 'select'); ta.dispatchEvent(new Event('input', { bubbles: true }));
      } else insert('    ', s, en);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s), ind = /^\s*/.exec(line)[0];
      e.preventDefault(); insert('\n' + ind + (/:\s*$/.test(line) ? '    ' : ''), s, en);
    }
    if (e.key === 'Backspace' && s === en) {
      const ls = v.lastIndexOf('\n', s - 1) + 1, before = v.slice(ls, s);
      if (before.length && /^ +$/.test(before) && before.length % 4 === 0) { e.preventDefault(); ta.setRangeText('', s - 4, s, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  });
  nums(); requestAnimationFrame(fit);
  return { get: () => ta.value, set: v => { ta.value = v; nums(); fit(); }, focus: () => ta.focus(), el: ta };
};

/* ---------- Output panel helper ---------- */
STEM.codeOutput = (box) => {
  const con = box.querySelector('.console'), plots = box.querySelector('.plots'), checks = box.querySelector('.checks');
  return {
    clear() { con.textContent = ''; con.classList.remove('has'); plots.innerHTML = ''; if (checks) checks.innerHTML = ''; },
    status(t) { con.dataset.status = t || ''; },
    out(t, cls) { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = t; con.appendChild(s); con.classList.add('has'); con.scrollTop = con.scrollHeight; },
    text: () => con.textContent,
    images(list) { plots.innerHTML = (list || []).map(b => `<img alt="Plot from your program" src="data:image/png;base64,${b}">`).join(''); },
    checks(results) {
      if (!checks) return;
      checks.innerHTML = results.map(([t, ok, msg]) => `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${STEM.escapeHTML(ok ? (/,\s*["'](.*)["']\s*$/.exec(t) || [, t])[1] : msg)}</li>`).join('');
    }
  };
};
})();
