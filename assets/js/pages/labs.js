/* Lab pages (one per subject), lab cards on the home page, and automatic progress tracking. */
(() => {
const { E, subj, onColor, icon, labsOf } = STEM.ui;
const $ = STEM.$;
const ui = STEM.ui, store = () => STEM.store;
let QUIZ = null;

/* ---------- Progress tracker: counts active time and interactions in each lab ---------- */
const Tracker = STEM.tracker = {
  labs: new Map(), timer: null, flushTimer: null, lastActive: 0, onUpdate: null,
  start(articles) {
    this.stop();
    if (!STEM.state.user) return;
    const io = this.io = new IntersectionObserver(es => es.forEach(e => { const t = this.labs.get(e.target.id); if (t) t.visible = e.isIntersecting; }), { threshold: 0.35 });
    articles.forEach(a => {
      const lab = STEM.state.labs.find(l => l.id === a.id); if (!lab) return;
      this.labs.set(a.id, { lab, visible: false, secs: 0, inter: 0, lastInter: 0 });
      io.observe(a);
      const bump = () => { const t = this.labs.get(a.id); if (!t) return; this.lastActive = Date.now(); if (Date.now() - t.lastInter > 400) { t.inter++; t.lastInter = Date.now(); } };
      a.addEventListener('pointerdown', bump); a.addEventListener('input', bump); a.addEventListener('keydown', bump);
    });
    this.lastActive = Date.now();
    ['scroll', 'pointermove'].forEach(ev => window.addEventListener(ev, this._act = () => this.lastActive = Date.now(), { passive: true }));
    this.timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - this.lastActive > 90000) return;
      this.labs.forEach(t => { if (t.visible || t.lab.kind === 'embed' && document.activeElement && document.activeElement.tagName === 'IFRAME' && document.activeElement.closest('#' + CSS.escape(t.lab.id))) t.secs++; });
    }, 1000);
    this.flushTimer = setInterval(() => this.flush(), 20000);
  },
  async flush() {
    if (!STEM.state.user) return;
    for (const [id, t] of this.labs) {
      if (t.secs < 1 && t.inter < 1) continue;
      const secs = Math.min(t.secs, 60), inter = t.inter; t.secs -= secs; t.inter = 0;
      try { const row = await store().trackLab(id, t.lab.subject_id, t.lab.kind, secs, inter); if (this.onUpdate) this.onUpdate(row); }
      catch (e) { console.warn('progress not saved', e); }
    }
  },
  stop() {
    if (this.labs.size) this.flush();
    clearInterval(this.timer); clearInterval(this.flushTimer); if (this.io) this.io.disconnect();
    if (this._act) { window.removeEventListener('scroll', this._act); window.removeEventListener('pointermove', this._act); }
    this.labs = new Map();
  }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Tracker.flush(); });

/* ---------- Home: lab cards and search ---------- */
STEM.renderHomeLabs = (progress = []) => {
  const done = new Set(progress.filter(p => p.completed).map(p => p.lab_id)), seen = new Set(progress.map(p => p.lab_id));
  $('#labCards').innerHTML = STEM.state.subjects.filter(s => s.published !== false).map(s => {
    const labs = labsOf(s.id), c = labs.filter(l => done.has(l.id)).length;
    return `<a class="lab" href="#${s.id}" style="--c:${s.color}">${icon(s.id)}<b>${E(s.name)}</b><small>${E(s.am || '')}</small><span>${E(s.description)}</span>
      ${STEM.state.user ? `<div class="labprog">${ui.bar(c, labs.length, s.color)}<small>${c} of ${labs.length} labs completed</small></div>` : `<small>${labs.length} labs</small>`}</a>`;
  }).join('');
  $('#lvlFilter').innerHTML = '<option value="">All subjects</option>' + STEM.state.subjects.map(s => `<option value="${E(s.id)}">${E(s.name)}</option>`).join('');
  const render = () => {
    const q = $('#q').value.toLowerCase().trim(), f = $('#lvlFilter').value;
    const m = STEM.state.labs.filter(l => l.published && STEM.state.subjects.some(s => s.id === l.subject_id) && (!f || l.subject_id === f) && (!q || (l.title + ' ' + l.blurb + ' ' + l.subject_id).toLowerCase().includes(q)));
    $('#allList').innerHTML = m.length ? m.map(l => `<li><a href="#${E(l.id)}" style="--c:${subj(l.subject_id).color}"><i></i><div><b>${E(l.title)}</b><small>${E(subj(l.subject_id).name)} · ${E(l.level || '')}${l.kind === 'embed' ? ' · outside simulation' : l.kind === 'guide' ? ' · hands-on' : ''}</small>${done.has(l.id) ? '<div class="tried">✓ Completed</div>' : seen.has(l.id) ? '<div class="tried soft">Started</div>' : ''}</div></a></li>`).join('') : '<li class="empty">No labs match. Try another word.</li>';
  };
  $('#q').oninput = render; $('#lvlFilter').onchange = render; render();
};

/* ---------- Subject lab page ---------- */
const labCard = (l, prog) => {
  const p = prog.find(x => x.lab_id === l.id);
  const badge = !STEM.state.user ? '' : p && p.completed ? '<span class="badge ok">✓ Completed</span>' : p ? `<span class="badge">In progress · ${ui.fmtDur(p.seconds)}</span>` : '<span class="badge soft">Not started</span>';
  let body;
  if (l.kind === 'embed') {
    const safe = /^https:\/\//i.test(l.embed_url || '') ? E(l.embed_url) : '';
    body = `${l.instructions ? `<div class="out task"><b>Your task</b>${ui.richText(l.instructions)}</div>` : ''}
      ${safe ? `<div class="embed"><iframe src="${safe}" title="${E(l.title)}" loading="lazy" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div><p class="note"><a href="${safe}" target="_blank" rel="noopener">Open full screen ↗</a></p>` : '<p class="empty">This lab has no valid link yet.</p>'}`;
  } else if (l.kind === 'guide') {
    body = `<div class="guide">${ui.richText(l.instructions)}</div>${STEM.state.user ? `<button class="btn ghost doneBtn">I did this experiment</button>` : ''}`;
  } else if (l.kind === 'code') {
    body = STEM.codeLabHTML(l);
  } else {
    body = STEM.SIMS.find(x => x.id === l.id) ? '<div class="simbody"></div>' : '<p class="empty">The simulation file for this lab is missing.</p>';
  }
  const kindTag = l.kind === 'embed' ? '<span class="lvl">Outside simulation</span>' : l.kind === 'guide' ? '<span class="lvl">Hands-on</span>' : l.kind === 'code' ? '<span class="lvl">Python</span>' : '';
  const s = subj(l.subject_id), ask = STEM.state.user && (s.ai_enabled !== false || ui.isStaff()) && l.kind !== 'code' ? `<button class="linkbtn askBtn" data-lab="${E(l.id)}">✦ Ask the tutor about this lab</button>` : '';
  return `<article class="sim" id="${E(l.id)}"><header><h3>${E(l.title)}</h3>${l.level ? `<span class="lvl">${E(l.level)}</span>` : ''}${kindTag}<span class="pbadge">${badge}</span><p>${E(l.blurb)}</p>${ask}</header>${body}</article>`;
};

const quizHTML = (id) => {
  const qs = QUIZ && QUIZ[id]; if (!qs || !qs.length) return '';
  return `<article class="sim quiz"><header><h3>Check yourself</h3><span class="lvl">${qs.length} questions</span><p>Quick practice after trying the labs above. ${STEM.state.user ? 'For marked exams, open <a href="#exams">Exams</a>.' : ''}</p></header>
    <ol class="qz">${qs.map((q, i) => `<li><p>${E(q.q)}</p><div class="chips">${q.options.map((o, j) => `<button data-i="${i}" data-j="${j}">${E(o)}</button>`).join('')}</div><p class="fb" aria-live="polite"></p></li>`).join('')}</ol><p class="score"></p></article>`;
};
const wireQuiz = (el, id) => {
  const box = el.querySelector('.quiz'), qs = QUIZ && QUIZ[id]; if (!box || !qs) return; const done = {};
  box.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, j = +b.dataset.j, q = qs[i], li = b.closest('li'); const okk = j === q.answer;
    li.querySelectorAll('button').forEach(x => x.classList.remove('on', 'bad')); b.classList.add(okk ? 'on' : 'bad');
    li.querySelector('.fb').textContent = (okk ? 'Correct. ' : 'Not quite. ') + (q.why || ''); done[i] = okk;
    box.querySelector('.score').textContent = `Score: ${Object.values(done).filter(Boolean).length} of ${qs.length}`;
  });
};

STEM.pages.push({
  name: 'subject',
  match: r => { const s = STEM.state.subjects.find(x => x.id === r); if (s) return { s }; const l = STEM.state.labs.find(x => x.id === r && x.published); return l ? { s: subj(l.subject_id), target: l.id } : null; },
  async render(el, { s, target }) {
    if (!QUIZ) { try { const r = await fetch('content/quizzes.json'); QUIZ = r.ok ? await r.json() : null; } catch (e) { QUIZ = null; } if (!QUIZ) { try { QUIZ = JSON.parse(document.getElementById('quizFallback').textContent); } catch (e) { QUIZ = {}; } } }
    let prog = []; if (STEM.state.user) { try { prog = await store().myProgress(); } catch (e) {} }
    const labs = labsOf(s.id), col = s.color, on = onColor(col);
    const done = labs.filter(l => (prog.find(p => p.lab_id === l.id) || {}).completed).length;
    el.innerHTML = `<div style="--c:${col};--on:${on}">
      <div class="band subhead"><div class="wrap"><p class="am">${E(s.am || '')}</p><h2>${E(s.name)} lab</h2><p>${E(s.description)}</p>
        ${STEM.state.user ? `<div class="subprog">${ui.bar(done, labs.length, on)}<span>${done} of ${labs.length} labs completed. A lab counts as completed after ${STEM.COMPLETE.seconds / 60} minutes of real use.</span></div>` : `<p class="note on"><a href="#login">Log in</a> to save your progress and earn certificates.</p>`}</div></div>
      <div class="band"><div class="wrap sims">${labs.map(l => labCard(l, prog)).join('') || '<p class="empty">No labs in this subject yet.</p>'}${quizHTML(s.id)}</div></div></div>`;
    const active = [];
    labs.filter(l => l.kind === 'builtin').forEach(l => {
      const sim = STEM.SIMS.find(x => x.id === l.id), box = el.querySelector('#' + CSS.escape(l.id) + ' .simbody'); if (!sim || !box) return;
      try { active.push(sim.mount(box) || {}); } catch (e) { console.error(e); box.textContent = 'This simulation could not start.'; }
    });
    labs.filter(l => l.kind === 'code').forEach(l => { const a = el.querySelector('#' + CSS.escape(l.id)); if (a) STEM.mountCodeLab(a, l); });
    el.querySelectorAll('.askBtn').forEach(b => b.onclick = () => STEM.tutor.open({ subjectId: s.id, labId: b.dataset.lab }));
    STEM.tutor.showFab(s.id);
    if (s.id === 'coding') el.querySelector('.subhead .wrap').insertAdjacentHTML('beforeend', '<p><a class="btn y" href="#code">Open the Python playground</a></p>');
    el.querySelectorAll('.doneBtn').forEach(b => b.onclick = async () => {
      const lab = STEM.state.labs.find(l => l.id === b.closest('article').id);
      try { await store().trackLab(lab.id, lab.subject_id, 'guide', 60, 1); await store().trackLab(lab.id, lab.subject_id, 'guide', 60, 1); ui.toast('Marked as done. Well done!'); b.disabled = true; b.textContent = '✓ Recorded'; }
      catch (e) { ui.toast(ui.err(e), 'bad'); }
    });
    wireQuiz(el, s.id);
    Tracker.onUpdate = row => { const a = el.querySelector('#' + CSS.escape(row.lab_id) + ' .pbadge'); if (a) a.innerHTML = row.completed ? '<span class="badge ok">✓ Completed</span>' : `<span class="badge">In progress · ${ui.fmtDur(row.seconds)}</span>`; };
    Tracker.start([...el.querySelectorAll('article.sim[id]')]);
    STEM.activeSims = active;
    if (target) requestAnimationFrame(() => { const t = el.querySelector('#' + CSS.escape(target)); if (t) t.scrollIntoView({ block: 'start' }); });
  }
});
})();
