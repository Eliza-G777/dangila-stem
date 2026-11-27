/* Exams: students take them; teachers build them and read the results. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate } = ui, store = () => STEM.store;
let timerId = null;
STEM.onLeave = STEM.onLeave || [];
STEM.onLeave.push(() => { clearInterval(timerId); timerId = null; });

/* ---------- Exams list ---------- */
STEM.pages.push({
  name: 'exams', match: r => r === 'exams' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    const staff = ui.isStaff();
    el.innerHTML = ui.band(staff ? 'Exam builder' : 'Exams', staff ? 'Create exams, publish them to students and read the results.' : 'Exams are marked straight away. Passing them moves you towards your certificates.') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.band:last-child .wrap');
    const exams = await store().listExams();
    if (staff) {
      const atts = await store().allAttempts();
      wrap.innerHTML = `<div class="row between"><div class="row"><select class="fs"><option value="">All subjects</option>${STEM.state.subjects.map(s => `<option value="${E(s.id)}">${E(s.name)}</option>`).join('')}</select></div><a class="btn y" href="#edit-new">+ New exam</a></div><div class="list2"></div>`;
      const draw = () => {
        const f = wrap.querySelector('.fs').value;
        wrap.querySelector('.list2').innerHTML = ui.table([
          { h: 'Exam', v: e => `<b>${E(e.title)}</b><br><small class="muted">${E(subj(e.subject_id).name)}${e.grade ? ' · ' + E(e.grade) : ''}</small>` },
          { h: 'Questions', v: e => e.question_count ?? '', cls: 'num' },
          { h: 'Status', v: e => e.published ? '<span class="badge ok">Published</span>' : '<span class="badge soft">Draft</span>' },
          { h: 'Attempts', v: e => atts.filter(a => a.exam_id === e.id).length, cls: 'num' },
          { h: '', v: e => `<div class="row tight"><a class="btn ghost sm" href="#edit-${E(e.id)}">Edit</a><a class="btn ghost sm" href="#results-${E(e.id)}">Results</a><button class="btn ghost sm dup" data-id="${E(e.id)}">Copy</button><button class="btn ghost sm del" data-id="${E(e.id)}">Delete</button></div>` }
        ], exams.filter(e => !f || e.subject_id === f), 'No exams yet. Create the first one.');
        wrap.querySelectorAll('.del').forEach(b => b.onclick = async () => {
          if (!await ui.confirm('Delete this exam and all its results? This cannot be undone.', 'Delete', true)) return;
          try { await store().deleteExam(b.dataset.id); ui.toast('Exam deleted'); STEM.route(); } catch (e) { ui.toast(ui.err(e), 'bad'); }
        });
        wrap.querySelectorAll('.dup').forEach(b => b.onclick = async () => {
          try { const { exam, questions } = await store().getExamForEdit(b.dataset.id); const id = await store().saveExam({ ...exam, id: null, title: exam.title + ' (copy)', published: false }, questions); ui.toast('Copied as a draft'); location.hash = 'edit-' + id; } catch (e) { ui.toast(ui.err(e), 'bad'); }
        });
      };
      wrap.querySelector('.fs').onchange = draw; draw(); return;
    }
    const atts = await store().myAttempts();
    const pub = exams.filter(e => e.published);
    if (!pub.length) { wrap.innerHTML = '<p class="empty">No exams are open right now. Check back soon.</p>'; return; }
    wrap.innerHTML = `<div class="examgrid">${pub.map(e => {
      const mine = atts.filter(a => a.exam_id === e.id), best = mine.reduce((m, a) => Math.max(m, +a.percent), -1), passed = mine.some(a => a.passed);
      const left = e.max_attempts === 0 ? Infinity : e.max_attempts - mine.length, S = subj(e.subject_id);
      return `<div class="examcard" style="--c:${S.color}"><small>${E(S.name)}${e.grade ? ' · ' + E(e.grade) : ''}</small><h3>${E(e.title)}</h3><p>${E(e.description || '')}</p>
        <p class="note">${e.time_limit ? e.time_limit + ' minutes' : 'No time limit'} · pass mark ${e.pass_mark}% · ${e.max_attempts === 0 ? 'practice, unlimited tries' : `${Math.max(left, 0)} of ${e.max_attempts} attempt${e.max_attempts > 1 ? 's' : ''} left`}</p>
        ${mine.length ? `<p>${passed ? '<span class="badge ok">Passed</span>' : '<span class="badge bad">Not passed yet</span>'} Best score ${best}%</p>` : ''}
        ${left > 0 ? `<a class="btn ${mine.length ? 'ghost' : 'y'}" href="#exam-${E(e.id)}">${mine.length ? 'Try again' : 'Start exam'}</a>` : '<p class="note">No attempts left.</p>'}</div>`;
    }).join('')}</div>`;
  }
});

/* ---------- Take an exam ---------- */
STEM.pages.push({
  name: 'exam', match: r => r.startsWith('exam-') && r !== 'exam-builder' ? { id: r.slice(5) } : null, roles: ['student', 'teacher', 'admin'],
  async render(el, { id }) {
    el.innerHTML = `<div class="band"><div class="wrap narrow">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.wrap');
    let paper; try { paper = await store().getPaper(id); } catch (e) { wrap.innerHTML = `<p class="empty">${E(ui.err(e))}</p><a href="#exams">Back to exams</a>`; return; }
    const { exam: e, questions: qs, attempts_used } = paper, S = subj(e.subject_id);
    const left = e.max_attempts === 0 ? Infinity : e.max_attempts - attempts_used;
    const total = qs.reduce((t, q) => t + (q.points || 0), 0);
    if (left <= 0) { wrap.innerHTML = `<h2>${E(e.title)}</h2><p>You have used all your attempts for this exam.</p><a class="btn" href="#exams">Back to exams</a>`; return; }
    wrap.innerHTML = `<div class="card examintro" style="--c:${S.color}"><small>${E(S.name)}</small><h2>${E(e.title)}</h2><p>${E(e.description || '')}</p>
      <div class="stats four"><div class="stat"><small>Questions</small><b>${qs.length}</b></div><div class="stat"><small>Marks</small><b>${total}</b></div><div class="stat"><small>Time</small><b>${e.time_limit ? e.time_limit + ' min' : 'No limit'}</b></div><div class="stat"><small>Pass mark</small><b>${e.pass_mark}%</b></div></div>
      <p class="note">${e.max_attempts === 0 ? 'Practice exam: unlimited attempts.' : `Attempts left: ${left}.`} ${e.time_limit ? 'The exam submits itself when time runs out.' : ''}</p>
      ${ui.isStaff() && !e.published ? '<p class="note">Draft preview: students cannot see this exam yet.</p>' : ''}
      <button class="btn y go" ${qs.length ? '' : 'disabled'}>Start now</button> <a class="btn ghost" href="#exams">Not now</a></div>`;
    wrap.querySelector('.go').onclick = () => start();

    const KEY = 'dscExam_' + id;
    function start() {
      let saved = {}; try { saved = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (x) {}
      const started = saved.started || new Date().toISOString(), answers = saved.answers || {};
      const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ started, answers })); } catch (x) {} };
      save();
      wrap.innerHTML = `<div class="examtop"><b>${E(e.title)}</b><span class="answered"></span><span class="clock"></span></div>
        <ol class="paper">${qs.map((q, i) => `<li data-q="${E(q.id)}"><p class="qtext">${E(q.question)} <small class="muted">(${q.points} mark${q.points === 1 ? '' : 's'})</small></p>
          <div class="opts">${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" ${String(answers[q.id]) === String(j) ? 'checked' : ''}><span>${E(o)}</span></label>`).join('')}</div></li>`).join('')}</ol>
        <div class="row end"><button class="btn y submit">Submit exam</button></div>`;
      const upd = () => { const n = Object.keys(answers).length; wrap.querySelector('.answered').textContent = `${n} of ${qs.length} answered`; };
      wrap.querySelectorAll('.paper li').forEach(li => li.querySelectorAll('input').forEach(inp => inp.onchange = () => { answers[li.dataset.q] = +inp.value; save(); upd(); }));
      upd();
      let done = false;
      const submit = async () => {
        if (done) return; done = true; clearInterval(timerId);
        wrap.querySelector('.submit').disabled = true; wrap.querySelector('.submit').textContent = 'Marking…';
        try { const res = await store().submitExam(id, answers, started); sessionStorage.removeItem(KEY); showResult(res); }
        catch (x) { done = false; wrap.querySelector('.submit').disabled = false; wrap.querySelector('.submit').textContent = 'Submit exam'; ui.toast(ui.err(x), 'bad'); }
      };
      wrap.querySelector('.submit').onclick = async () => {
        const missing = qs.length - Object.keys(answers).length;
        if (missing && !await ui.confirm(`You have ${missing} unanswered question${missing > 1 ? 's' : ''}. Submit anyway?`, 'Submit')) return;
        submit();
      };
      if (e.time_limit) {
        const end = new Date(started).getTime() + e.time_limit * 60000, clock = wrap.querySelector('.clock');
        const tick = () => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`; clock.classList.toggle('low', s < 60); if (s <= 0) { ui.toast('Time is up. Submitting…'); submit(); } };
        tick(); timerId = setInterval(tick, 1000);
      }
    }
    function showResult(r) {
      const key = r.answers_key || {}, hasKey = Object.keys(key).length > 0;
      const det = Object.fromEntries((r.detail || []).map(d => [d.id, d]));
      wrap.innerHTML = `<div class="card result ${r.passed ? 'pass' : 'fail'}"><p class="big">${r.percent}%</p><h2>${r.passed ? 'You passed!' : 'Not passed this time'}</h2>
        <p>${r.score} of ${r.max_score} marks. Pass mark ${e.pass_mark}%.</p>
        <div class="row"><a class="btn y" href="#dashboard">See my progress</a><a class="btn ghost" href="#certificates">My certificates</a><a class="btn ghost" href="#exams">All exams</a></div></div>
        <h3 class="sec">Your answers</h3><ol class="paper review">${qs.map(q => { const d = det[q.id] || {}; return `<li class="${d.correct ? 'right' : 'wrong'}"><p class="qtext">${d.correct ? '✓' : '✗'} ${E(q.question)}</p><div class="opts">${q.options.map((o, j) => `<div class="opt ro ${d.chosen === j ? 'chosen' : ''} ${hasKey && key[q.id] === j ? 'key' : ''}">${E(o)}${d.chosen === j ? ' <small>(your answer)</small>' : ''}${hasKey && key[q.id] === j ? ' <small>(correct)</small>' : ''}</div>`).join('')}</div></li>`; }).join('')}</ol>
        ${hasKey ? '' : '<p class="note">Correct answers are shown after your last attempt.</p>'}`;
      window.scrollTo(0, 0);
    }
  }
});

/* ---------- Exam editor (teachers) ---------- */
const parseText = txt => txt.split(/\n\s*\n/).map(b => b.split('\n').map(s => s.trim()).filter(Boolean)).filter(b => b.length >= 3).map(b => {
  const opts = b.slice(1).map(s => s.replace(/^([a-f][.)]|•)\s*/i, '')), ans = Math.max(0, b.slice(1).findIndex(s => /^\*|\*$/.test(s.replace(/^([a-f][.)]|•)\s*/i, ''))));
  return { question: b[0].replace(/^\d+[.)]\s*/, ''), options: opts.map(o => o.replace(/^\*\s*|\s*\*$/g, '')), answer: ans, points: 1 };
});

STEM.pages.push({
  name: 'edit', match: r => r.startsWith('edit-') ? { id: r.slice(5) } : null, roles: ['teacher', 'admin'],
  async render(el, { id }) {
    let exam = { title: '', subject_id: STEM.state.subjects[0] ? STEM.state.subjects[0].id : '', grade: '', description: '', time_limit: 20, pass_mark: 60, max_attempts: 1, published: false }, qs = [];
    if (id !== 'new') { const d = await store().getExamForEdit(id); if (!d.exam) { el.innerHTML = ui.band('Exam not found'); return; } exam = d.exam; qs = d.questions.map(q => ({ question: q.question, options: [...q.options], answer: q.answer, points: q.points })); }
    if (!qs.length) qs.push({ question: '', options: ['', '', '', ''], answer: 0, points: 1 });
    el.innerHTML = ui.band(id === 'new' ? 'New exam' : 'Edit exam', 'Write questions, choose the correct answer, then publish when ready.') + `<div class="band"><div class="wrap">
      <form class="card editor">
        <div class="grid2">
          <label>Title<input name="title" required maxlength="120"></label>
          <label>Subject<select name="subject_id">${STEM.state.subjects.map(s => `<option value="${E(s.id)}">${E(s.name)}</option>`).join('')}</select></label>
          <label>For grade<input name="grade" placeholder="e.g. Grade 9–10" maxlength="30"></label>
          <label>Time limit (minutes, 0 = none)<input name="time_limit" type="number" min="0" max="300"></label>
          <label>Pass mark (%)<input name="pass_mark" type="number" min="0" max="100"></label>
          <label>Attempts allowed (0 = unlimited practice)<input name="max_attempts" type="number" min="0" max="20"></label>
        </div>
        <label>Instructions for students<textarea name="description" rows="2" maxlength="600"></textarea></label>
        <label class="check"><input type="checkbox" name="published"> Published (students can see and take it)</label>
      </form>
      <div class="row between"><h3 class="sec">Questions <small class="muted qcount"></small></h3><button class="btn ghost imp">Paste questions from text</button></div>
      <ol class="qedit"></ol>
      <div class="row between"><button class="btn ghost addq">+ Add question</button><div class="row"><a class="btn ghost" href="#exams">Cancel</a><button class="btn y save">Save exam</button></div></div>
    </div></div>`;
    const f = el.querySelector('form');
    ['title', 'subject_id', 'grade', 'description', 'time_limit', 'pass_mark', 'max_attempts'].forEach(k => f[k].value = exam[k] ?? '');
    f.published.checked = !!exam.published;
    const list = el.querySelector('.qedit');
    const draw = () => {
      el.querySelector('.qcount').textContent = `(${qs.length}, ${qs.reduce((t, q) => t + (+q.points || 0), 0)} marks)`;
      list.innerHTML = qs.map((q, i) => `<li class="card qitem" data-i="${i}">
        <div class="row between"><b>Question ${i + 1}</b><div class="row tight"><button class="btn ghost sm up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn ghost sm down" ${i < qs.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button class="btn ghost sm rm">Remove</button></div></div>
        <label>Question<textarea class="qq" rows="2">${E(q.question)}</textarea></label>
        <div class="optedit">${q.options.map((o, j) => `<div class="orow"><label class="radio" title="Correct answer"><input type="radio" name="ans${i}" value="${j}" ${q.answer === j ? 'checked' : ''}><span class="sr">Correct</span></label><input class="oo" data-j="${j}" value="${E(o)}" placeholder="Option ${j + 1}"><button class="btn ghost sm ro" data-j="${j}" ${q.options.length > 2 ? '' : 'disabled'} aria-label="Remove option">×</button></div>`).join('')}</div>
        <div class="row between"><button class="btn ghost sm ao" ${q.options.length < 6 ? '' : 'disabled'}>+ Option</button><label class="inline">Marks <input class="qp" type="number" min="0" max="20" value="${q.points}"></label></div>
        <p class="note">Tick the circle next to the correct answer.</p></li>`).join('');
      list.querySelectorAll('.qitem').forEach(li => {
        const i = +li.dataset.i, q = qs[i];
        li.querySelector('.qq').oninput = e => q.question = e.target.value;
        li.querySelectorAll('.oo').forEach(inp => inp.oninput = () => q.options[+inp.dataset.j] = inp.value);
        li.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => q.answer = +r.value);
        li.querySelector('.qp').oninput = e => { q.points = Math.max(0, +e.target.value || 0); el.querySelector('.qcount').textContent = `(${qs.length}, ${qs.reduce((t, x) => t + (+x.points || 0), 0)} marks)`; };
        li.querySelector('.ao').onclick = () => { q.options.push(''); draw(); };
        li.querySelectorAll('.ro').forEach(b => b.onclick = () => { const j = +b.dataset.j; q.options.splice(j, 1); if (q.answer >= q.options.length || q.answer === j) q.answer = 0; else if (q.answer > j) q.answer--; draw(); });
        li.querySelector('.rm').onclick = () => { qs.splice(i, 1); if (!qs.length) qs.push({ question: '', options: ['', ''], answer: 0, points: 1 }); draw(); };
        li.querySelector('.up').onclick = () => { [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]]; draw(); };
        li.querySelector('.down').onclick = () => { [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]]; draw(); };
      });
    };
    draw();
    el.querySelector('.addq').onclick = () => { qs.push({ question: '', options: ['', '', '', ''], answer: 0, points: 1 }); draw(); list.lastElementChild.querySelector('textarea').focus(); };
    el.querySelector('.imp').onclick = () => {
      const m = ui.modal(`<h3>Paste questions</h3><p class="note">One question per block, with a blank line between questions. Put a * before the correct option.</p>
        <textarea class="pt" rows="12" placeholder="What is the pH of pure water?\n0\n*7\n14\n\nWhich gas makes vinegar and baking soda fizz?\nOxygen\n*Carbon dioxide\nHydrogen"></textarea>
        <div class="row end"><button class="btn ghost c">Cancel</button><button class="btn y a">Add questions</button></div>`, { wide: true });
      m.el.querySelector('.c').onclick = m.close;
      m.el.querySelector('.a').onclick = () => {
        const add = parseText(m.el.querySelector('.pt').value);
        if (!add.length) { ui.toast('No questions found. Each needs a question line and at least 2 options.', 'bad'); return; }
        if (qs.length === 1 && !qs[0].question.trim()) qs.length = 0;
        qs.push(...add); draw(); m.close(); ui.toast(`${add.length} questions added`);
      };
    };
    el.querySelector('.save').onclick = async () => {
      const data = { id: id === 'new' ? null : id, title: f.title.value.trim(), subject_id: f.subject_id.value, grade: f.grade.value.trim(), description: f.description.value.trim(),
        time_limit: +f.time_limit.value || 0, pass_mark: Math.min(100, Math.max(0, +f.pass_mark.value || 0)), max_attempts: Math.max(0, +f.max_attempts.value || 0), published: f.published.checked };
      if (!data.title) { ui.toast('Give the exam a title', 'bad'); f.title.focus(); return; }
      const clean = qs.map(q => ({ ...q, question: q.question.trim(), options: q.options.map(o => o.trim()).filter(Boolean) })).filter(q => q.question);
      const bad = clean.findIndex(q => q.options.length < 2 || q.answer >= q.options.length);
      if (!clean.length) { ui.toast('Add at least one question', 'bad'); return; }
      if (bad >= 0) { ui.toast(`Question ${bad + 1} needs at least 2 options and a correct answer`, 'bad'); return; }
      try { const newId = await store().saveExam(data, clean); ui.toast(data.published ? 'Saved and published' : 'Saved as draft'); location.hash = 'edit-' + newId; if (id === newId) STEM.route(); }
      catch (e) { ui.toast(ui.err(e), 'bad'); }
    };
  }
});

/* ---------- Exam results (teachers) ---------- */
STEM.pages.push({
  name: 'results', match: r => r.startsWith('results-') ? { id: r.slice(8) } : null, roles: ['teacher', 'admin'],
  async render(el, { id }) {
    el.innerHTML = `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const [{ exam, questions }, atts, people] = await Promise.all([store().getExamForEdit(id), store().allAttempts(), store().listProfiles()]);
    if (!exam) { el.innerHTML = ui.band('Exam not found'); return; }
    const mine = atts.filter(a => a.exam_id === id), who = uid => people.find(p => p.id === uid) || { full_name: 'Deleted user', grade: '' };
    const best = {}; mine.forEach(a => { if (!best[a.user_id] || a.percent > best[a.user_id].percent) best[a.user_id] = a; });
    const rows = Object.values(best).map(a => ({ ...a, p: who(a.user_id), n: mine.filter(x => x.user_id === a.user_id).length })).sort((a, b) => b.percent - a.percent);
    const avg = rows.length ? Math.round(rows.reduce((t, r) => t + +r.percent, 0) / rows.length) : 0, pass = rows.filter(r => r.passed).length;
    const item = questions.map(q => { const ds = mine.map(a => (a.detail || []).find(d => d.id === q.id)).filter(Boolean); return { q, n: ds.length, ok: ds.filter(d => d.correct).length }; });
    el.innerHTML = ui.band(`Results: ${E(exam.title)}`, `${E(subj(exam.subject_id).name)} · pass mark ${exam.pass_mark}%`) + `<div class="band"><div class="wrap">
      <div class="stats four"><div class="stat"><small>Students</small><b>${rows.length}</b></div><div class="stat"><small>Attempts</small><b>${mine.length}</b></div><div class="stat"><small>Average best score</small><b>${rows.length ? avg + '%' : '—'}</b></div><div class="stat"><small>Pass rate</small><b>${rows.length ? Math.round(100 * pass / rows.length) + '%' : '—'}</b></div></div>
      <div class="row between"><h3 class="sec">Students (best attempt)</h3><div class="row"><button class="btn ghost csv">Download CSV</button><a class="btn ghost" href="#edit-${E(id)}">Edit exam</a></div></div>
      ${ui.table([{ h: 'Student', v: r => `<a href="#student-${E(r.user_id)}">${E(r.p.full_name)}</a>` }, { h: 'Grade', v: r => E(r.p.grade) }, { h: 'Score', v: r => `${r.score} / ${r.max_score}`, cls: 'num' }, { h: '%', v: r => r.percent + '%', cls: 'num' },
        { h: 'Result', v: r => r.passed ? '<span class="badge ok">Passed</span>' : '<span class="badge bad">Not passed</span>' }, { h: 'Attempts', v: r => r.n, cls: 'num' }, { h: 'Date', v: r => fmtDate(r.submitted_at) }], rows, 'No one has taken this exam yet.')}
      <h3 class="sec">Question analysis</h3><p class="note">Share of attempts that got each question right. Low bars show topics to teach again.</p>
      <div class="items">${item.map((x, i) => `<div class="itemrow"><span>${i + 1}. ${E(x.q.question)}</span>${ui.bar(x.ok, x.n || 1, x.n && x.ok / x.n < 0.5 ? 'var(--red)' : 'var(--bio)')}<b>${x.n ? Math.round(100 * x.ok / x.n) + '%' : '—'}</b></div>`).join('')}</div>
    </div></div>`;
    el.querySelector('.csv').onclick = () => ui.download(`${exam.title.replace(/\W+/g, '-')}-results.csv`, ui.csv([['Student', 'Username', 'Grade', 'Score', 'Max', 'Percent', 'Passed', 'Attempts', 'Date'], ...rows.map(r => [r.p.full_name, r.p.username, r.p.grade, r.score, r.max_score, r.percent, r.passed ? 'yes' : 'no', r.n, String(r.submitted_at).slice(0, 10)])]));
  }
});
})();
