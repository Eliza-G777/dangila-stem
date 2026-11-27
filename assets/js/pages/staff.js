/* Teacher pages: overview, students, one student's report, creating student accounts. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate, fmtDur } = ui, store = () => STEM.store;

const loadAll = () => Promise.all([store().listProfiles(), store().allProgress(), store().allAttempts(), store().allCertificates(), store().listExams()]);
const summarise = (people, progress, attempts, certs) => {
  const pubLabs = new Set(STEM.state.labs.filter(l => l.published).map(l => l.id));
  return people.filter(p => p.role === 'student').map(p => {
    const pr = progress.filter(x => x.user_id === p.id && pubLabs.has(x.lab_id)), at = attempts.filter(a => a.user_id === p.id);
    const best = {}; at.forEach(a => { if (!best[a.exam_id] || a.percent > best[a.exam_id]) best[a.exam_id] = +a.percent; });
    const b = Object.values(best);
    const last = [...pr.map(x => x.last_at), ...at.map(a => a.submitted_at)].sort().pop();
    return { ...p, done: pr.filter(x => x.completed).length, secs: pr.reduce((t, x) => t + x.seconds, 0), exams: Object.keys(best).length, passed: new Set(at.filter(a => a.passed).map(a => a.exam_id)).size, avg: b.length ? Math.round(b.reduce((t, x) => t + x, 0) / b.length) : null, certs: certs.filter(c => c.user_id === p.id).length, last };
  });
};

/* ---------- Teacher home ---------- */
STEM.renderStaffHome = async el => {
  const me = STEM.state.user;
  el.innerHTML = ui.band(`Hello, ${E(me.full_name || me.username)}`, me.role === 'admin' ? 'Admin overview of the whole club.' : 'Your class overview.') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
  const [people, progress, attempts, certs, exams] = await loadAll();
  const S = summarise(people, progress, attempts, certs), week = Date.now() - 7 * 864e5;
  const active = S.filter(s => s.last && new Date(s.last).getTime() > week).length;
  const recent = [...attempts].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0, 6);
  const who = id => people.find(p => p.id === id) || { full_name: '?' }, ex = id => exams.find(e => e.id === id) || { title: '?' };
  const labTotal = STEM.state.labs.filter(l => l.published).length;
  const perLab = STEM.state.labs.filter(l => l.published).map(l => ({ l, n: progress.filter(p => p.lab_id === l.id).length, c: progress.filter(p => p.lab_id === l.id && p.completed).length })).sort((a, b) => b.n - a.n);
  el.querySelector('.band:last-child .wrap').innerHTML = `
    <div class="stats four"><div class="stat"><small>Students</small><b>${S.length}</b></div><div class="stat"><small>Active this week</small><b>${active}</b></div><div class="stat"><small>Exams published</small><b>${exams.filter(e => e.published).length}</b></div><div class="stat"><small>Certificates earned</small><b>${certs.length}</b></div></div>
    <div class="row"><a class="btn y" href="#students">Students and progress</a><a class="btn" href="#exams">Exam builder</a><a class="btn ghost" href="#edit-new">+ New exam</a>${ui.isAdmin() ? '<a class="btn ghost" href="#admin">Admin settings</a>' : '<a class="btn ghost" href="#admin">Notices</a>'}</div>
    <div class="grid2 top">
      <div><h3 class="sec">Latest exam results</h3>${ui.table([{ h: 'Student', v: a => `<a href="#student-${E(a.user_id)}">${E(who(a.user_id).full_name)}</a>` }, { h: 'Exam', v: a => `<a href="#results-${E(a.exam_id)}">${E(ex(a.exam_id).title)}</a>` }, { h: '%', v: a => `${a.percent}% ${a.passed ? '✓' : ''}`, cls: 'num' }, { h: 'Date', v: a => fmtDate(a.submitted_at) }], recent, 'No results yet.')}</div>
      <div><h3 class="sec">Lab use</h3><p class="note">How many students opened and completed each lab (of ${S.length}).</p>
        <div class="items">${perLab.map(x => `<div class="itemrow"><span>${E(x.l.title)} <small class="muted">${E(subj(x.l.subject_id).name)}</small></span>${ui.bar(x.c, S.length || 1, subj(x.l.subject_id).color)}<b>${x.c}/${x.n}</b></div>`).join('')}</div>
        <p class="note">${labTotal} labs published.</p></div>
    </div>`;
};

/* ---------- Students list ---------- */
STEM.pages.push({
  name: 'students', match: r => r === 'students' ? {} : null, roles: ['teacher', 'admin'],
  async render(el) {
    el.innerHTML = ui.band('Students and progress', 'Create student logins, follow their lab work and exam results.') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.band:last-child .wrap');
    const [people, progress, attempts, certs] = await loadAll();
    const S = summarise(people, progress, attempts, certs), labTotal = STEM.state.labs.filter(l => l.published).length;
    const grades = [...new Set(S.map(s => s.grade).filter(Boolean))].sort();
    wrap.innerHTML = `<div class="row between"><div class="row"><input type="search" class="sq" placeholder="Search name or username" aria-label="Search students"><select class="sg" aria-label="Grade"><option value="">All grades</option>${grades.map(g => `<option>${E(g)}</option>`).join('')}</select></div>
      <div class="row"><button class="btn ghost csv">Download CSV</button><button class="btn y add">+ Add students</button></div></div><div class="tbl"></div>`;
    const draw = () => {
      const q = wrap.querySelector('.sq').value.toLowerCase(), g = wrap.querySelector('.sg').value;
      const rows = S.filter(s => (!g || s.grade === g) && (!q || (s.full_name + ' ' + s.username).toLowerCase().includes(q))).sort((a, b) => a.full_name.localeCompare(b.full_name));
      wrap.querySelector('.tbl').innerHTML = ui.table([
        { h: 'Student', v: s => `<a href="#student-${E(s.id)}"><b>${E(s.full_name)}</b></a><br><small class="muted">${E(s.username)}</small>` },
        { h: 'Grade', v: s => E(s.grade) },
        { h: 'Labs completed', v: s => `${ui.bar(s.done, labTotal)}<small>${s.done} / ${labTotal}</small>` },
        { h: 'Exams passed', v: s => `${s.passed} / ${s.exams}`, cls: 'num' },
        { h: 'Average', v: s => s.avg == null ? '—' : s.avg + '%', cls: 'num' },
        { h: 'Certificates', v: s => s.certs, cls: 'num' },
        { h: 'Last active', v: s => s.last ? fmtDate(s.last) : 'Never' }], rows, S.length ? 'No students match.' : 'No students yet. Use “Add students” to create their logins.');
    };
    wrap.querySelector('.sq').oninput = draw; wrap.querySelector('.sg').onchange = draw; draw();
    wrap.querySelector('.csv').onclick = () => ui.download('students-progress.csv', ui.csv([['Name', 'Username', 'Grade', 'Labs completed', 'Labs total', 'Time in labs (min)', 'Exams taken', 'Exams passed', 'Average %', 'Certificates', 'Last active'],
      ...S.map(s => [s.full_name, s.username, s.grade, s.done, labTotal, Math.round(s.secs / 60), s.exams, s.passed, s.avg ?? '', s.certs, s.last ? String(s.last).slice(0, 10) : ''])]));
    wrap.querySelector('.add').onclick = () => STEM.addUsersDialog('student');
  }
});

/* ---------- Create accounts + printable login slips ---------- */
STEM.addUsersDialog = (role = 'student') => {
  const admin = ui.isAdmin();
  const m = ui.modal(`<h3>Add ${role === 'teacher' ? 'teachers' : 'students'}</h3>
    <p class="note">One person per line: <b>Full name</b>, then optionally a comma and the grade. Usernames and passwords are made for you.</p>
    <label>Default grade<select class="dg"><option value="">None</option>${ui.grades.map(g => `<option>${g}</option>`).join('')}</select></label>
    ${admin ? `<label>Role<select class="rl"><option value="student" ${role === 'student' ? 'selected' : ''}>Student</option><option value="teacher" ${role === 'teacher' ? 'selected' : ''}>Teacher</option></select></label>` : ''}
    <label>Names<textarea class="nm" rows="8" placeholder="Abebe Kebede, Grade 10\nHana Mekonnen, Grade 9\nDawit Alemu"></textarea></label>
    <div class="row end"><button class="btn ghost c">Cancel</button><button class="btn y go">Create logins</button></div><p class="formmsg"></p>`, { wide: true });
  m.el.querySelector('.c').onclick = m.close;
  m.el.querySelector('.go').onclick = async () => {
    const dg = m.el.querySelector('.dg').value, rl = admin ? m.el.querySelector('.rl').value : 'student';
    const users = m.el.querySelector('.nm').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, g] = l.split(',').map(s => s.trim()); return { full_name: n, grade: g || dg, role: rl }; });
    if (!users.length) { ui.toast('Type at least one name', 'bad'); return; }
    const btn = m.el.querySelector('.go'); btn.disabled = true; m.el.querySelector('.formmsg').textContent = `Creating ${users.length} logins…`;
    try { const r = await store().manageUsers({ action: 'create', users }); m.close(); STEM.showSlips(r.created, r.failed); }
    catch (e) { btn.disabled = false; m.el.querySelector('.formmsg').textContent = ui.err(e); }
  };
};
STEM.showSlips = (created, failed = []) => {
  const url = location.origin && location.origin !== 'null' ? location.origin + location.pathname + '#login' : 'the club website';
  const text = created.map(c => `${c.full_name}\tusername: ${c.username}\tpassword: ${c.password}`).join('\n');
  const m = ui.modal(`<h3>${created.length} login${created.length === 1 ? '' : 's'} created</h3>
    <p class="note">Save or print these now. Passwords are not shown again (you can reset them later).</p>
    ${failed.length ? `<p class="badbox out">Not created: ${failed.map(f => `${E(f.full_name || '?')} (${E(f.error)})`).join(', ')}</p>` : ''}
    <div class="row noprint"><button class="btn y pr">Print slips</button><button class="btn ghost cp">Copy all</button><button class="btn ghost dl">Download CSV</button></div>
    <div class="slips">${created.map(c => `<div class="slip"><b>${E(STEM.CONFIG.clubName)}</b><span>${E(c.full_name)}${c.grade ? ' · ' + E(c.grade) : ''}</span><span>Website: ${E(url)}</span><span>Username: <code>${E(c.username)}</code></span><span>Password: <code>${E(c.password)}</code></span></div>`).join('')}</div>`, { wide: true });
  m.el.closest('.modal').classList.add('printable');
  m.el.querySelector('.pr').onclick = () => { try { window.print(); } catch (e) { ui.toast('Printing is not available here.'); } };
  m.el.querySelector('.cp').onclick = () => ui.copy(text);
  m.el.querySelector('.dl').onclick = () => ui.download('new-logins.csv', ui.csv([['Name', 'Grade', 'Username', 'Password', 'Role'], ...created.map(c => [c.full_name, c.grade, c.username, c.password, c.role])]));
  if (location.hash === '#students' || location.hash === '#admin') setTimeout(() => STEM.route({ keepModal: true }), 50);
};

/* ---------- One student's report ---------- */
STEM.pages.push({
  name: 'student', match: r => r.startsWith('student-') ? { id: r.slice(8) } : null, roles: ['teacher', 'admin'],
  async render(el, { id }) {
    el.innerHTML = `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const people = await store().listProfiles(), p = people.find(x => x.id === id);
    if (!p) { el.innerHTML = ui.band('Student not found') + '<div class="band"><div class="wrap"><a href="#students">Back to students</a></div></div>'; return; }
    const [status, progress, attempts, certs, exams] = await Promise.all([store().certStatus(id), store().userProgress(id), store().userAttempts(id), store().userCertificates(id), store().listExams()]);
    const canManage = ui.isAdmin() || p.role === 'student';
    el.innerHTML = ui.band(E(p.full_name), `${E(p.username)}${p.grade ? ' · ' + E(p.grade) : ''} · ${E(p.role)} · account created ${fmtDate(p.created_at)}`) + `<div class="band"><div class="wrap">
      <div class="row between noprint"><a class="btn ghost" href="#students">← All students</a>${canManage ? `<div class="row"><button class="btn ghost ed">Edit name or grade</button><button class="btn ghost rp">Reset password</button><button class="btn ghost pr">Print report</button></div>` : ''}</div>
      ${STEM.progressReport({ status, progress, attempts, certs, exams, self: false })}
      <h3 class="sec">Lab activity</h3>
      ${ui.table([{ h: 'Lab', v: x => E((STEM.state.labs.find(l => l.id === x.lab_id) || { title: x.lab_id }).title) }, { h: 'Subject', v: x => E(subj(x.subject_id).name) }, { h: 'Time', v: x => fmtDur(x.seconds), cls: 'num' }, { h: 'Actions', v: x => x.interactions, cls: 'num' }, { h: 'Status', v: x => x.completed ? '<span class="badge ok">Completed</span>' : '<span class="badge">Started</span>' }, { h: 'Last used', v: x => fmtDate(x.last_at) }],
        [...progress].sort((a, b) => String(b.last_at).localeCompare(String(a.last_at))), 'This student has not opened any labs yet.')}
    </div></div>`;
    if (!canManage) return;
    el.querySelector('.pr').onclick = () => { try { window.print(); } catch (e) { ui.toast('Printing is not available here.'); } };
    el.querySelector('.rp').onclick = async () => {
      if (!await ui.confirm(`Make a new password for ${p.full_name}? The old one will stop working.`, 'Reset password')) return;
      try { const r = await store().manageUsers({ action: 'reset', user_id: id }); STEM.showSlips([{ ...p, password: r.password }]); } catch (e) { ui.toast(ui.err(e), 'bad'); }
    };
    el.querySelector('.ed').onclick = () => {
      const m = ui.modal(`<h3>Edit student</h3><label>Full name<input class="n" value="${E(p.full_name)}"></label><label>Grade<select class="g"><option value="">None</option>${ui.grades.map(g => `<option ${g === p.grade ? 'selected' : ''}>${g}</option>`).join('')}</select></label><div class="row end"><button class="btn ghost c">Cancel</button><button class="btn y s">Save</button></div>`);
      m.el.querySelector('.c').onclick = m.close;
      m.el.querySelector('.s').onclick = async () => { try { await store().manageUsers({ action: 'update', user_id: id, full_name: m.el.querySelector('.n').value, grade: m.el.querySelector('.g').value }); m.close(); ui.toast('Saved'); STEM.route(); } catch (e) { ui.toast(ui.err(e), 'bad'); } };
    };
  }
});
})();
