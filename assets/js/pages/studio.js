/* AI Studio: several AI models and learning tools in one place. */
(() => {
const ui = STEM.ui, { E } = ui, store = () => STEM.store;
const TOOLS = [
  { id: 'ask', icon: '💬', name: 'Ask anything', desc: 'A patient tutor for any school question.', ph: 'Ask a question… e.g. Why is the sky blue?' },
  { id: 'simple', icon: '🌱', name: 'Explain simply', desc: 'Any topic explained in everyday words.', ph: 'A topic to explain… e.g. photosynthesis' },
  { id: 'solve', icon: '🧮', name: 'Step-by-step solver', desc: 'Maths and science problems, one step at a time.', ph: 'Paste a problem… e.g. A car goes 120 km in 2 hours. What is its speed?' },
  { id: 'translate', icon: '🔤', name: 'Translate', desc: 'English ↔ Amharic, with key science words.', ph: 'Text to translate between English and Amharic…' },
  { id: 'flashcards', icon: '🃏', name: 'Flashcards', desc: 'Study cards you can flip, on any topic.', ph: 'A topic for flashcards… e.g. parts of a cell', widget: true },
  { id: 'quiz', icon: '✅', name: 'Practice quiz', desc: 'Five questions to test yourself, marked instantly.', ph: 'A topic for a quiz… e.g. Ohm’s law', widget: true },
  { id: 'feedback', icon: '📝', name: 'Feedback on my writing', desc: 'Strengths and how to improve your own work.', ph: 'Paste your answer, report or essay…' }
];
let st = { tool: 'ask', model: null, compare: false, model2: null, turns: [], models: [] };
STEM.userListeners.push(() => { st.models = []; st.turns = []; });

const fmt = t => { // same safe formatting as the tutor panel
  const parts = String(t).split(/```(?:\w+)?\n?([\s\S]*?)```/g);
  return parts.map((p, i) => i % 2 ? `<pre class="tcode">${E(p)}</pre>` : E(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .split('\n').map(l => /^\s*[-•]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>` : l + '<br>').join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`).replace(/^(<br>)+|(<br>)+$/g, '').replace(/<\/ul><br>/g, '</ul>')).join('');
};

function cardsWidget(box, cards) {
  let i = 0, flipped = false;
  const draw = () => {
    const c = cards[i];
    box.innerHTML = `<div class="fcard ${flipped ? 'flip' : ''}" tabindex="0" role="button" aria-label="Flashcard, press to flip"><div class="face front">${E(c.front)}</div><div class="face back">${E(c.back)}</div></div>
      <div class="row center"><button class="btn ghost sm pv" ${i ? '' : 'disabled'}>Previous</button><span class="muted">${i + 1} / ${cards.length}</span><button class="btn sm fl">Flip</button><button class="btn ghost sm nx" ${i < cards.length - 1 ? '' : 'disabled'}>Next</button></div>`;
    const card = box.querySelector('.fcard'), flip = () => { flipped = !flipped; card.classList.toggle('flip', flipped); };
    card.onclick = flip; card.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
    box.querySelector('.fl').onclick = flip;
    box.querySelector('.pv').onclick = () => { i--; flipped = false; draw(); };
    box.querySelector('.nx').onclick = () => { i++; flipped = false; draw(); };
  };
  draw();
}
function quizWidget(box, qs) {
  const done = {};
  box.innerHTML = `<ol class="qz">${qs.map((q, i) => `<li><p>${E(q.question)}</p><div class="chips">${q.options.map((o, j) => `<button data-i="${i}" data-j="${j}">${E(o)}</button>`).join('')}</div><p class="fb"></p></li>`).join('')}</ol><p class="score"></p>`;
  box.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, j = +b.dataset.j, q = qs[i], li = b.closest('li'), okk = j === q.answer;
    li.querySelectorAll('button').forEach(x => x.classList.remove('on', 'bad')); b.classList.add(okk ? 'on' : 'bad');
    li.querySelector('.fb').textContent = (okk ? 'Correct. ' : `Not quite: the answer is “${q.options[q.answer]}”. `) + (q.why || ''); done[i] = okk;
    box.querySelector('.score').textContent = `Score: ${Object.values(done).filter(Boolean).length} of ${qs.length}`;
  });
}

STEM.pages.push({
  name: 'ai', match: r => r === 'ai' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    if (!st.models.length) { try { st.models = await store().aiModels(); } catch (e) { st.models = []; } }
    if (!st.model || !st.models.some(m => m.key === st.model)) st.model = st.models[0] ? st.models[0].key : null;
    if (!st.model2 || st.model2 === st.model) st.model2 = (st.models.find(m => m.key !== st.model) || {}).key || null;
    const demo = store().mode === 'demo';
    el.innerHTML = ui.band('AI Studio', 'Several AI models and learning tools in one place. Choose a tool, pick a model, and learn by asking.', '#5a3fa8') + `<div class="band"><div class="wrap">
      ${demo ? '<div class="out"><b>Demo mode:</b> AI answers work on the live site once it is set up. You can still look around.</div>' : ''}
      <h3 class="sec">Choose a tool</h3>
      <div class="tools">${TOOLS.map(t => `<button class="tool ${t.id === st.tool ? 'on' : ''}" data-t="${t.id}"><span class="ti" aria-hidden="true">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small></button>`).join('')}</div>
      <div class="studiobar"><div><h3 class="sec">Choose an AI model</h3><div class="chips models">${st.models.map(m => `<button data-m="${E(m.key)}" class="${m.key === st.model ? 'on' : ''}">${E(m.label)}</button>`).join('') || '<span class="muted">No models available.</span>'}</div></div>
        <div class="cmp"><label class="check"><input type="checkbox" class="cmpbox" ${st.compare ? 'checked' : ''} ${st.models.length < 2 ? 'disabled' : ''}> Compare two models</label>
        <select class="m2" ${st.compare ? '' : 'hidden'} aria-label="Second model">${st.models.filter(m => m.key !== st.model).map(m => `<option value="${E(m.key)}" ${m.key === st.model2 ? 'selected' : ''}>${E(m.label)}</option>`).join('')}</select></div>
        <label class="inline">Subject <select class="subj"><option value="">Any</option>${STEM.state.subjects.map(s => `<option value="${E(s.id)}">${E(s.name)}</option>`).join('')}</select></label></div>
      <div class="studio card"><div class="sturns" aria-live="polite"></div>
        <form class="sform"><textarea rows="3" class="sin"></textarea><div class="row between"><span class="note suse"></span><div class="row"><button type="button" class="btn ghost sm clr">Clear</button><button class="btn y go">Send</button></div></div></form></div>
      <p class="note">AI can make mistakes. Check important facts with your teacher. Each request counts towards your daily AI limit${st.compare ? ' (comparing uses two)' : ''}.</p>
    </div></div>`;
    const tool = () => TOOLS.find(t => t.id === st.tool);
    const label = k => (st.models.find(m => m.key === k) || { label: k }).label;
    const turns = el.querySelector('.sturns'), input = el.querySelector('.sin'), go = el.querySelector('.go');
    const drawTurns = () => {
      const t = tool(); input.placeholder = t.ph; go.textContent = t.widget ? 'Make' : 'Send';
      turns.innerHTML = st.turns.length ? st.turns.map((tn, i) => `<div class="sturn"><div class="tmsg me">${E(tn.q).replace(/\n/g, '<br>')}</div><div class="answers ${tn.answers.length > 1 ? 'two' : ''}">${tn.answers.map((a, k) => `<div class="answer"><small class="mlabel">${E(a.label)} · ${E(TOOLS.find(x => x.id === tn.tool).name)}</small><div class="abody" data-i="${i}" data-k="${k}">${a.pending ? '<div class="thinking"><i></i><i></i><i></i></div>' : a.error ? `<p class="err">${E(a.error)}</p>` : a.reply ? fmt(a.reply) : ''}</div></div>`).join('')}</div></div>`).join('')
        : `<div class="sempty"><b>${t.icon} ${t.name}</b><p>${t.desc}</p></div>`;
      st.turns.forEach((tn, i) => tn.answers.forEach((a, k) => { const b = turns.querySelector(`.abody[data-i="${i}"][data-k="${k}"]`); if (!b || a.pending || a.error) return; if (a.cards) cardsWidget(b, a.cards); if (a.questions) quizWidget(b, a.questions); }));
      turns.scrollTop = turns.scrollHeight;
    };
    drawTurns();
    el.querySelectorAll('.tool').forEach(b => b.onclick = () => { st.tool = b.dataset.t; el.querySelectorAll('.tool').forEach(x => x.classList.toggle('on', x === b)); drawTurns(); input.focus(); });
    el.querySelectorAll('.models button').forEach(b => b.onclick = () => { st.model = b.dataset.m; if (st.model2 === st.model) st.model2 = (st.models.find(m => m.key !== st.model) || {}).key; STEM.route({ keepScroll: true }); });
    el.querySelector('.cmpbox').onchange = e => { st.compare = e.target.checked; STEM.route({ keepScroll: true }); };
    el.querySelector('.m2').onchange = e => { st.model2 = e.target.value; };
    el.querySelector('.clr').onclick = () => { st.turns = []; drawTurns(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); el.querySelector('.sform').requestSubmit(); } });
    el.querySelector('.sform').onsubmit = async e => {
      e.preventDefault(); const q = input.value.trim(); if (!q) return; if (!st.model) { ui.toast('No AI model is available', 'bad'); return; }
      const t = tool(), keys = st.compare && st.model2 ? [st.model, st.model2] : [st.model];
      const history = t.widget ? [] : st.turns.filter(x => x.tool === t.id).slice(-4).flatMap(x => { const a = x.answers[0]; return a && a.reply ? [{ role: 'user', content: x.q }, { role: 'assistant', content: a.reply }] : []; });
      const turn = { q, tool: t.id, answers: keys.map(k => ({ key: k, label: label(k), pending: true })) };
      st.turns.push(turn); input.value = ''; drawTurns(); go.disabled = true;
      await Promise.all(turn.answers.map(async a => {
        try { const r = await store().ai({ mode: 'studio', tool: t.id, model: a.key, subject_id: el.querySelector('.subj').value || null, messages: [...history, { role: 'user', content: q }] });
          Object.assign(a, { pending: false, reply: r.reply, cards: r.cards, questions: r.questions, label: r.model || a.label }); if (r.limit) el.querySelector('.suse').textContent = `${r.used} of ${r.limit} AI requests used today`;
          if ((r.cards && !r.cards.length) || (r.questions && !r.questions.length)) a.error = 'Nothing came back. Try a clearer topic.';
        } catch (er) { Object.assign(a, { pending: false, error: ui.err(er) }); }
      }));
      go.disabled = false; drawTurns();
    };
  }
});
})();
