/* AI tutor: a chat panel that knows the current subject and lab. */
(() => {
const ui = STEM.ui, { E, subj } = ui, store = () => STEM.store;
const KEY = id => 'dscTutor_' + id;
let state = { subjectId: null, labId: null, context: null, msgs: [] }, panel = null;

// safe, tiny formatting: escape first, then **bold**, `code`, ```blocks```, "- " lists
const fmt = t => {
  const parts = String(t).split(/```(?:\w+)?\n?([\s\S]*?)```/g);
  return parts.map((p, i) => i % 2 ? `<pre class="tcode">${E(p)}</pre>` : E(p)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .split('\n').map(l => /^\s*[-•]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>` : l + '<br>').join('')
    .replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`).replace(/^(<br>)+|(<br>)+$/g, '').replace(/<\/ul><br>/g, '</ul>')).join('');
};

const canUse = s => STEM.state.user && (s ? s.ai_enabled !== false || ui.isStaff() : true);

function build() {
  panel = document.createElement('aside');
  panel.className = 'tutor'; panel.hidden = true; panel.setAttribute('aria-label', 'AI tutor');
  panel.innerHTML = `<header><div><b>AI tutor</b><small class="tsub"></small></div><span class="tuse"></span><button class="x" aria-label="Close tutor">×</button></header>
    <div class="tmsgs" aria-live="polite"></div>
    <div class="tchips"></div>
    <form class="tform"><textarea rows="2" placeholder="Ask a question in English or Amharic…" aria-label="Your question"></textarea><button class="btn y" type="submit">Send</button></form>
    <p class="tnote">The tutor can make mistakes. Check important facts with your teacher. <button class="linkbtn tclear">New chat</button></p>`;
  document.body.appendChild(panel);
  panel.querySelector('.x').onclick = () => STEM.tutor.close();
  panel.querySelector('.tclear').onclick = () => { state.msgs = []; persist(); draw(); };
  const f = panel.querySelector('.tform'), ta = f.querySelector('textarea');
  f.onsubmit = e => { e.preventDefault(); const q = ta.value.trim(); if (q) { ta.value = ''; ask(q); } };
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  const fab = document.createElement('button');
  fab.className = 'fab'; fab.hidden = true; fab.innerHTML = '<span aria-hidden="true">✦</span> Ask the tutor';
  fab.onclick = () => STEM.tutor.open({ subjectId: state.subjectId });
  document.body.appendChild(fab);
  STEM.tutor.fab = fab;
}

const persist = () => { try { sessionStorage.setItem(KEY(state.subjectId || 'general'), JSON.stringify(state.msgs.slice(-30))); } catch (e) {} };
const restore = id => { try { return JSON.parse(sessionStorage.getItem(KEY(id || 'general')) || '[]'); } catch (e) { return []; } };

function draw(thinking) {
  const s = state.subjectId ? subj(state.subjectId) : null, lab = STEM.state.labs.find(l => l.id === state.labId);
  panel.style.setProperty('--c', s ? s.color : 'var(--blue)');
  panel.querySelector('.tsub').textContent = s ? ` · ${s.name}${lab ? ' · ' + lab.title : ''}` : '';
  const box = panel.querySelector('.tmsgs');
  box.innerHTML = (state.msgs.length ? '' : `<div class="tmsg bot">Selam! I am your ${s ? E(s.name) + ' ' : ''}tutor. Ask me anything about ${lab ? '<b>' + E(lab.title) + '</b>' : 'this subject'}. I will help you think it through step by step.</div>`) +
    state.msgs.map(m => `<div class="tmsg ${m.role === 'user' ? 'me' : m.error ? 'bot err' : 'bot'}">${m.role === 'user' ? E(m.content).replace(/\n/g, '<br>') : fmt(m.content)}</div>`).join('') +
    (thinking ? '<div class="tmsg bot thinking"><i></i><i></i><i></i></div>' : '');
  box.scrollTop = box.scrollHeight;
  const chips = lab ? ['Explain this lab simply', 'Give me a hint', 'Quiz me with one question', 'Why does this happen?'] : ['Explain the main ideas', 'Quiz me with one question', 'Give me a real-life example'];
  panel.querySelector('.tchips').innerHTML = state.msgs.length > 2 ? '' : chips.map(c => `<button type="button">${c}</button>`).join('');
  panel.querySelectorAll('.tchips button').forEach(b => b.onclick = () => ask(b.textContent));
}

async function ask(q, codeCtx) {
  state.msgs.push({ role: 'user', content: q }); persist(); draw(true);
  const form = panel.querySelector('.tform button'); form.disabled = true;
  try {
    const body = codeCtx ? { mode: 'code', subject_id: state.subjectId, lab_id: state.labId, code: codeCtx.code, output: codeCtx.output, question: q }
      : { mode: 'tutor', subject_id: state.subjectId, lab_id: state.labId, context: state.context, messages: state.msgs.filter(m => !m.error).map(({ role, content }) => ({ role, content })) };
    const r = await store().ai(body);
    state.msgs.push({ role: 'assistant', content: r.reply });
    if (r.limit) panel.querySelector('.tuse').textContent = `${r.used}/${r.limit} today`;
  } catch (e) { state.msgs.push({ role: 'assistant', content: ui.err(e), error: true }); }
  form.disabled = false; persist(); draw();
}

STEM.tutor = {
  open({ subjectId, labId, code, context } = {}) {
    if (!panel) build();
    if (!STEM.state.user) { ui.toast('Log in to use the AI tutor'); location.hash = 'login'; return; }
    const s = subjectId ? subj(subjectId) : null;
    if (s && !canUse(s)) { ui.toast(`The AI tutor is turned off for ${s.name}.`); return; }
    if (subjectId !== state.subjectId) state = { subjectId, labId: null, msgs: restore(subjectId) };
    if (labId !== undefined) state.labId = labId || null;
    state.context = context || null;
    panel.hidden = false; this.fab.hidden = true; draw();
    if (code) ask(code.output && /Error|Traceback/.test(code.output) ? 'Why does my code give this error? Give me a hint to fix it.' : 'Can you check my code and give me a hint to improve it?', code);
    else panel.querySelector('textarea').focus();
  },
  close() { if (panel) panel.hidden = true; this.showFab(state.subjectId); },
  // show the floating button on subject and code pages
  showFab(subjectId) {
    if (!panel) build();
    const s = subjectId ? subj(subjectId) : null;
    const on = !!subjectId && canUse(s) && panel.hidden;
    this.fab.hidden = !on;
    if (on) { this.fab.style.setProperty('--c', s.color); if (subjectId !== state.subjectId) state = { subjectId, labId: null, msgs: restore(subjectId) }; }
  },
  hideAll() { if (panel) { panel.hidden = true; this.fab.hidden = true; } }
};
})();
