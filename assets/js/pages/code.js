/* Coding: exercise cards inside lab pages (kind "code") and the free Python playground (#code). */
(() => {
const ui = STEM.ui, { E } = ui, store = () => STEM.store;
const draftKey = id => `dscCode_${(STEM.state.user || {}).id || 'guest'}_${id}`;
const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

const panelHTML = (withChecks) => `
  <div class="codebox"></div>
  <div class="row coderow"><button class="btn y run">▶ Run</button>${withChecks ? '<button class="btn chk">Check my answer</button>' : ''}<button class="btn ghost stop" hidden>Stop</button><button class="btn ghost rst">Reset code</button><button class="btn ghost ask">Ask the tutor</button><span class="note kbd">Ctrl + Enter runs your code</span></div>
  <details class="inbox"><summary>Program input <small class="muted">(for input(), one answer per line)</small></summary><textarea class="pin" rows="3" spellcheck="false"></textarea></details>
  <pre class="console" aria-live="polite" data-status=""></pre><div class="plots"></div>${withChecks ? '<ul class="checks"></ul>' : ''}`;

/* Wire a code panel. opts: { id, starter, tests, lab, subjectId, onPass } */
function wire(box, opts) {
  const out = STEM.codeOutput(box);
  const ed = STEM.editor(box.querySelector('.codebox'), { value: load(draftKey(opts.id), opts.starter), onRun: () => go(false), onChange: v => save(draftKey(opts.id), v) });
  const btn = sel => box.querySelector(sel);
  const busy = on => { btn('.run').disabled = on; if (btn('.chk')) btn('.chk').disabled = on; btn('.stop').hidden = !on; };
  async function go(check) {
    if (STEM.python.busy) { ui.toast('Another program is still running. Press Stop first.'); return; }
    out.clear(); busy(true); out.status('Starting…');
    const tests = check ? String(opts.tests || '').split('\n') : [];
    const r = await STEM.python.run({ code: ed.get(), tests, input: btn('.pin').value, onOut: t => out.out(t), onErr: t => out.out(t, 'err'), onStatus: t => out.status(t) });
    busy(false); out.status('');
    if (r.error) out.out(r.error, 'err');
    out.images(r.images);
    if (!r.error && !out.text().trim() && !(r.images || []).length) out.out('(Your program ran but printed nothing. Use print() to show results.)', 'muted');
    if (check) {
      if (r.error) { out.checks([['', false, 'Fix the error above first, then check again.']]); return; }
      out.checks(r.results);
      const pass = r.results.length > 0 && r.results.every(x => x[1]);
      if (pass) { ui.toast('All checks passed. Excellent work!'); opts.onPass && opts.onPass(); }
      else ui.toast(`${r.results.filter(x => x[1]).length} of ${r.results.length} checks passed. Keep going!`);
    }
  }
  btn('.run').onclick = () => go(false);
  if (btn('.chk')) btn('.chk').onclick = () => go(true);
  btn('.stop').onclick = () => STEM.python.stop('Stopped by you.');
  btn('.rst').onclick = async () => { if (await ui.confirm('Go back to the starting code? Your changes will be lost.', 'Reset')) { ed.set(opts.starter); save(draftKey(opts.id), opts.starter); out.clear(); } };
  btn('.ask').onclick = () => STEM.tutor.open({ subjectId: opts.subjectId, labId: opts.lab && opts.lab.id, code: { code: ed.get(), output: out.text() } });
  return { editor: ed, run: go };
}

/* ---------- Coding exercise inside a lab page ---------- */
STEM.codeLabHTML = l => `${l.instructions ? `<div class="out task"><b>Your task</b>${ui.richText(l.instructions)}</div>` : ''}<div class="codepanel">${panelHTML(!!String(l.tests || '').trim())}</div>`;
STEM.mountCodeLab = (article, l) => wire(article.querySelector('.codepanel'), {
  id: l.id, starter: l.starter_code || '', tests: l.tests, lab: l, subjectId: l.subject_id,
  onPass: async () => {
    if (!STEM.state.user) { ui.toast('Log in to save this as completed.'); return; }
    try { await store().completeCodeLab(l.id); const b = article.querySelector('.pbadge'); if (b) b.innerHTML = '<span class="badge ok">✓ Completed</span>'; }
    catch (e) { ui.toast(ui.err(e), 'bad'); }
  }
});

/* ---------- Playground ---------- */
const EXAMPLES = [
  ['Hello and input', 'name = input("What is your name? ")\nprint("Selam,", name + "!")\nprint("Welcome to the Dangila STEM Club coding lab.")\n', 'Abebe'],
  ['Times table (loops)', 'n = 7\nfor i in range(1, 11):\n    print(n, "x", i, "=", n * i)\n', ''],
  ['Falling ball (physics graph)', 'import matplotlib.pyplot as plt\n\ng = 9.8          # m/s²\ntimes = [t / 10 for t in range(0, 31)]   # 0 to 3 seconds\ndistance = [0.5 * g * t**2 for t in times]\n\nfor t, d in zip(times[::5], distance[::5]):\n    print(f"after {t:.1f} s the ball has fallen {d:.1f} m")\n\nplt.plot(times, distance)\nplt.xlabel("Time (s)")\nplt.ylabel("Distance fallen (m)")\nplt.title("A ball dropped from rest")\nplt.show()\n', ''],
  ['Rolling two dice (probability)', 'import random\nimport matplotlib.pyplot as plt\n\nrolls = 1000\ncounts = {total: 0 for total in range(2, 13)}\nfor _ in range(rolls):\n    counts[random.randint(1, 6) + random.randint(1, 6)] += 1\n\nfor total, c in counts.items():\n    print(total, "#" * (c // 10))\n\nplt.bar(list(counts.keys()), list(counts.values()))\nplt.xlabel("Total of two dice")\nplt.ylabel("How many times")\nplt.show()\n', ''],
  ['Savings that grow (compound interest)', 'birr = 1000      # starting savings\nrate = 0.07      # 7% interest each year\n\nfor year in range(1, 11):\n    birr = birr * (1 + rate)\n    print("Year", year, ":", round(birr, 2), "birr")\n', ''],
  ['Lake Tana fish population (biology)', '# A simple model: fish grow by 30% a year, but the lake can hold at most 5000.\nimport matplotlib.pyplot as plt\n\nfish = 200\ncapacity = 5000\nyears, sizes = [], []\nfor year in range(25):\n    years.append(year)\n    sizes.append(fish)\n    fish = fish + 0.3 * fish * (1 - fish / capacity)\n\nprint("After 25 years:", round(fish), "fish")\nplt.plot(years, sizes)\nplt.xlabel("Year")\nplt.ylabel("Number of fish")\nplt.show()\n', '']
];

STEM.pages.push({
  name: 'code', match: r => r === 'code' ? {} : null,
  render(el) {
    const subj = STEM.state.subjects.find(s => s.id === 'coding');
    el.innerHTML = ui.band('Python playground', 'Write and run real Python code in your browser. Try an example, change it, and see what happens.', subj ? subj.color : '#0e8a8a') + `<div class="band"><div class="wrap">
      <div class="row between"><label class="inline">Example <select class="ex">${EXAMPLES.map((x, i) => `<option value="${i}">${E(x[0])}</option>`).join('')}<option value="mine">My saved code</option></select></label>
        <div class="row"><button class="btn ghost sv">Save my code</button><button class="btn ghost dl">Download .py</button>${subj ? `<a class="btn ghost" href="#coding">Coding exercises</a>` : ''}</div></div>
      <div class="codepanel big">${panelHTML(false)}</div>
      <p class="note">Python runs on your own device, so nothing is sent away. The first run downloads Python (about 10 MB), so it can be slow on a weak connection. After that it is fast.</p>
    </div></div>`;
    const box = el.querySelector('.codepanel');
    const mine = load(draftKey('playground-saved'), '');
    const w = wire(box, { id: 'playground', starter: EXAMPLES[0][1], subjectId: 'coding' });
    if (!load(draftKey('playground'), '')) { w.editor.set(EXAMPLES[0][1]); box.querySelector('.pin').value = EXAMPLES[0][2]; }
    el.querySelector('.ex').onchange = e => {
      const v = e.target.value;
      if (v === 'mine') { if (!load(draftKey('playground-saved'), '')) { ui.toast('You have not saved any code yet'); return; } w.editor.set(load(draftKey('playground-saved'), '')); }
      else { w.editor.set(EXAMPLES[+v][1]); box.querySelector('.pin').value = EXAMPLES[+v][2]; if (EXAMPLES[+v][2]) box.querySelector('.inbox').open = true; }
      save(draftKey('playground'), w.editor.get());
    };
    el.querySelector('.sv').onclick = () => { save(draftKey('playground-saved'), w.editor.get()); ui.toast('Saved on this device. Choose “My saved code” to open it again.'); };
    el.querySelector('.dl').onclick = () => ui.download('my_program.py', w.editor.get(), 'text/x-python');
    STEM.tutor.showFab('coding');
    void mine;
  }
});
})();
