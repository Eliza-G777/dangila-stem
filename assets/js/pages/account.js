/* Login, student dashboard, certificates and certificate checking. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate, fmtDur, bar } = ui, store = () => STEM.store;

/* ---------- Log in ---------- */
STEM.pages.push({
  name: 'login', match: r => r === 'login' ? {} : null,
  render(el) {
    if (STEM.state.user) { location.hash = 'dashboard'; return; }
    const demo = store().mode === 'demo';
    el.innerHTML = `<div class="band loginband"><div class="wrap narrow">
      <form class="card login" autocomplete="on">
        <h2>Log in</h2><p class="note">Use the username and password your teacher gave you.</p>
        <label>Username <small class="muted">(or your full login email)</small><input name="u" required autocomplete="username" autocapitalize="none" spellcheck="false"></label>
        <label>Password<input name="p" type="password" required autocomplete="current-password"></label>
        <button class="btn y" type="submit">Log in</button><p class="formmsg" aria-live="polite"></p>
        <p class="note">Forgot your password? Ask your teacher to reset it.</p>
        <p class="note">Admin: trouble logging in? Open the <a href="#setup">setup check</a>.</p>
        <details class="diag"><summary>Login help (for the admin)</summary><div class="diagout note">Checking…</div></details>
      </form>
      ${demo ? `<div class="card demohelp"><h3>Demo accounts</h3><p class="note">This site is in demo mode, so data is saved only in this browser. Try each role:</p>
        <div class="row">${[['elizabeth', 'admin123', 'Admin'], ['teacher', 'teacher123', 'Teacher'], ['abebe', 'student123', 'Student']].map(([u, p, r]) => `<button class="btn ghost quick" data-u="${u}" data-p="${p}">${r}: ${u}</button>`).join('')}</div></div>` : ''}
    </div></div>`;
    const f = el.querySelector('form'), msg = f.querySelector('.formmsg');
    const go = async (u, p) => {
      msg.textContent = 'Logging in…';
      try { const me = await store().signIn(u, p); ui.toast(`Welcome, ${me.full_name || me.username}`); location.hash = 'dashboard'; }
      catch (e) { msg.textContent = ui.err(e); if (el.querySelector('.diag').open) showDiag(); }
    };
    f.onsubmit = e => { e.preventDefault(); go(f.u.value, f.p.value); };
    const showDiag = async () => {
      const box = el.querySelector('.diagout'); if (!box) return;
      let d; try { d = await store().diag(); } catch (e) { d = { error: ui.err(e) }; }
      const typed = (f.u.value || 'elizabeth').trim().toLowerCase();
      const L = STEM.lastLogin || {};
      box.innerHTML = `<table class="diagt"><tbody>
        <tr><td>Mode</td><td><b>${E(d.mode || '?')}</b>${d.mode === 'demo' ? ' ← the keys in config.js are empty, so real accounts cannot work' : ''}</td></tr>
        <tr><td>Supabase project</td><td>${E(d.project || '')}</td></tr>
        <tr><td>anon key format</td><td>${d.mode === 'live' ? (d.keyLooksRight ? 'looks right' : '<b>looks wrong</b>: copy the anon public key again') : '—'}</td></tr>
        <tr><td>Database tables</td><td>${d.mode !== 'live' ? '—' : d.error ? '<b>Problem:</b> ' + E(d.error) + (/subjects/.test(d.error) ? ' ← run supabase/schema.sql' : '') : d.subjects ? `OK (${d.subjects} subjects found)` : '<b>No subjects found</b> ← run supabase/schema.sql'}</td></tr>
        <tr><td>loginDomain</td><td>${E(d.loginDomain || '')}</td></tr>
        <tr><td>Email the site will try</td><td><code>${E(typed.includes('@') ? typed : typed + '@' + (d.loginDomain || ''))}</code> ← must match the user's email in Supabase exactly</td></tr>
        ${L.email ? `<tr><td>Last attempt</td><td><code>${E(L.email)}</code>: ${E(L.error || 'no error')}</td></tr>` : ''}
      </tbody></table>`;
    };
    el.querySelector('.diag').addEventListener('toggle', e => { if (e.target.open) showDiag(); });
    f.u.addEventListener('input', () => { if (el.querySelector('.diag').open) showDiag(); });
    el.querySelectorAll('.quick').forEach(b => b.onclick = () => go(b.dataset.u, b.dataset.p));
  }
});

/* ---------- Progress report (used by the student dashboard and by teachers) ---------- */
STEM.progressReport = ({ status, progress, attempts, certs, exams, self }) => {
  const subjects = STEM.state.subjects.filter(s => s.published !== false);
  const labsTotal = subjects.reduce((t, s) => t + ui.labsOf(s.id).length, 0);
  const done = progress.filter(p => p.completed && STEM.state.labs.some(l => l.id === p.lab_id && l.published)).length;
  const time = progress.reduce((t, p) => t + p.seconds, 0);
  const best = {}; attempts.forEach(a => { if (!best[a.exam_id] || a.percent > best[a.exam_id].percent) best[a.exam_id] = a; });
  const bests = Object.values(best), passed = bests.filter(a => attempts.some(x => x.exam_id === a.exam_id && x.passed)).length;
  const avg = bests.length ? Math.round(bests.reduce((t, a) => t + +a.percent, 0) / bests.length) : 0;
  const examName = id => (exams.find(e => e.id === id) || {}).title || 'Exam';
  const step = (ok, text, cur) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${text}${cur ? ` <small>(${cur})</small>` : ''}</li>`;
  const subjCards = status.filter(s => s.labs_total > 0).map(s => {
    const S = subj(s.subject_id), next = s.level + 1;
    const steps = [
      step(s.labs_opened >= s.labs_total, 'Open every lab', `${s.labs_opened}/${s.labs_total}`),
      step(s.labs_completed >= s.labs_total, 'Complete every lab', `${s.labs_completed}/${s.labs_total}`),
      step(s.exams_passed >= 1, 'Pass 1 exam', `${Math.min(s.exams_passed, 1)}/1`),
      step(s.exams_passed >= 2 && s.avg_best >= 85, 'Pass 2 exams, average 85%+', `${s.exams_passed} passed, ${s.avg_best}%`)];
    return `<div class="scard" style="--c:${S.color}">
      <div class="shead"><b>${E(S.name)}</b>${s.level ? `<span class="lvlchip" style="--lc:${ui.levelColor(s.subject_id, s.level)}">${ui.levelName(s.subject_id, s.level)}</span>` : '<span class="lvlchip none">No level yet</span>'}</div>
      ${bar(s.labs_completed, s.labs_total, S.color)}<small>${s.labs_completed} of ${s.labs_total} labs completed</small>
      <ul class="steps">${steps.join('')}</ul>
      ${next <= 3 ? `<p class="note">Next: <b>${STEM.LEVELS[next].name}</b>. ${STEM.LEVELS[next].rule}.</p>` : '<p class="note">Top level reached.</p>'}
      ${self ? `<a href="#${E(s.subject_id)}">Go to ${E(S.name)} labs →</a>` : ''}</div>`;
  }).join('');
  const recent = [...attempts].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))).slice(0, 8);
  return `
    <div class="stats four">
      <div class="stat"><small>Labs completed</small><b>${done} / ${labsTotal}</b></div>
      <div class="stat"><small>Time in labs</small><b>${fmtDur(time)}</b></div>
      <div class="stat"><small>Exams passed</small><b>${passed}</b></div>
      <div class="stat"><small>Average best score</small><b>${bests.length ? avg + '%' : '—'}</b></div>
    </div>
    <h3 class="sec">Progress by subject</h3><div class="sgrid">${subjCards || '<p class="empty">No labs yet.</p>'}</div>
    <h3 class="sec">Exam results</h3>
    ${ui.table([{ h: 'Exam', v: a => E(examName(a.exam_id)) }, { h: 'Score', v: a => `${a.score} / ${a.max_score}`, cls: 'num' }, { h: '%', v: a => a.percent + '%', cls: 'num' },
      { h: 'Result', v: a => a.passed ? '<span class="badge ok">Passed</span>' : '<span class="badge bad">Not passed</span>' }, { h: 'Date', v: a => fmtDate(a.submitted_at) }], recent, 'No exams taken yet.')}
    <h3 class="sec">Certificates</h3>
    ${certs.length ? `<div class="certs">${certs.map(c => `<a class="certchip" href="#cert-${E(c.id)}" style="--lc:${ui.levelColor(c.subject_id, c.level)}"><b>${ui.levelName(c.subject_id, c.level)}</b><small>${E(subj(c.subject_id).name)} · ${fmtDate(c.issued_at)}</small></a>`).join('')}</div>` : '<p class="empty">No certificates yet.</p>'}`;
};

/* ---------- Dashboard ---------- */
STEM.pages.push({
  name: 'dashboard', match: r => r === 'dashboard' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    const me = STEM.state.user;
    if (ui.isStaff()) return STEM.renderStaffHome(el);
    el.innerHTML = ui.band(`Hello, ${E(me.full_name || me.username)}`, `${E(me.grade || '')}${me.grade ? ' · ' : ''}Your labs, exams and certificates in one place.`) + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const [status, progress, attempts, certs, exams] = await Promise.all([store().certStatus(), store().myProgress(), store().myAttempts(), store().myCertificates(), store().listExams()]);
    const doneIds = new Set(progress.filter(p => p.completed).map(p => p.lab_id));
    const next = STEM.state.labs.filter(l => l.published && !doneIds.has(l.id) && STEM.state.subjects.some(s => s.id === l.subject_id))[0];
    const usedBy = id => attempts.filter(a => a.exam_id === id).length;
    const open = exams.filter(e => e.published && (e.max_attempts === 0 || usedBy(e.id) < e.max_attempts) && !attempts.some(a => a.exam_id === e.id && a.passed)).slice(0, 4);
    const earnable = status.some(s => s.level > 0 && !certs.some(c => c.subject_id === s.subject_id && c.level === s.level));
    el.querySelector('.band:last-child .wrap').innerHTML = `
      <div class="todo">
        ${next ? `<a class="todocard" href="#${E(next.id)}" style="--c:${subj(next.subject_id).color}"><small>Continue learning</small><b>${E(next.title)}</b><span>${E(subj(next.subject_id).name)}</span></a>` : `<div class="todocard"><small>Labs</small><b>All labs completed!</b></div>`}
        ${open.map(e => `<a class="todocard" href="#exam-${E(e.id)}" style="--c:${subj(e.subject_id).color}"><small>Exam waiting</small><b>${E(e.title)}</b><span>${E(subj(e.subject_id).name)}${e.time_limit ? ' · ' + e.time_limit + ' min' : ''}</span></a>`).join('')}
        ${earnable ? `<button class="todocard claim" style="--c:#5a3fa8"><small>New certificate ready</small><b>Collect your certificate</b><span>You reached a new level</span></button>` : ''}
      </div>
      <div class="mycourses"></div>
      ${STEM.progressReport({ status, progress, attempts, certs, exams, self: true })}`;
    if (STEM.coursesSummary) STEM.coursesSummary().then(h => { const b = el.querySelector('.mycourses'); if (b) b.innerHTML = h; });
    const cl = el.querySelector('.claim');
    if (cl) cl.onclick = async () => { try { await store().claimCertificates(); ui.toast('Certificate added!'); location.hash = 'certificates'; } catch (e) { ui.toast(ui.err(e), 'bad'); } };
  }
});

/* ---------- Certificates list ---------- */
STEM.pages.push({
  name: 'certificates', match: r => r === 'certificates' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    el.innerHTML = ui.band('My certificates', 'Earn Dangila STEM certificates by completing labs and passing exams.') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    let certs = [], status = [];
    try { certs = await store().claimCertificates(); status = await store().certStatus(); } catch (e) { el.querySelector('.band:last-child .wrap').innerHTML = `<p class="empty">${E(ui.err(e))}</p>`; return; }
    const L = STEM.LEVELS;
    el.querySelector('.band:last-child .wrap').innerHTML = `
      <div class="levels">${[1, 2, 3, 'scholar'].map(k => `<div class="levelcard" style="--lc:${L[k].color}"><div class="seal">${k === 'scholar' ? '★' : k}</div><b>${L[k].name}</b><p>${L[k].rule}.</p></div>`).join('')}</div>
      <h3 class="sec">Earned</h3>
      ${certs.length ? `<div class="certs big">${certs.map(c => `<a class="certchip" href="#cert-${E(c.id)}" style="--lc:${ui.levelColor(c.subject_id, c.level)}"><b>${ui.levelName(c.subject_id, c.level)}</b><small>${E(subj(c.subject_id).name)}</small><small>${fmtDate(c.issued_at)} · ${E(c.code)}</small><span>View and print →</span></a>`).join('')}</div>`
        : `<p class="empty">No certificates yet. Open every lab in a subject to become an Explorer.</p>`}
      <h3 class="sec">Next levels</h3>
      <div class="sgrid">${status.filter(s => s.labs_total).map(s => `<div class="scard" style="--c:${subj(s.subject_id).color}"><div class="shead"><b>${E(subj(s.subject_id).name)}</b><span class="lvlchip ${s.level ? '' : 'none'}" style="--lc:${ui.levelColor(s.subject_id, s.level)}">${s.level ? ui.levelName(s.subject_id, s.level) : 'No level yet'}</span></div>${s.level < 3 ? `<p class="note">Next: <b>${L[s.level + 1].name}</b>. ${L[s.level + 1].rule}.</p>` : '<p class="note">Top level reached.</p>'}</div>`).join('')}</div>`;
  }
});

/* ---------- One certificate (printable) ---------- */
const certHTML = (c, name) => {
  const color = ui.levelColor(c.subject_id, c.level), lvl = ui.levelName(c.subject_id, c.level), S = subj(c.subject_id);
  const rule = c.subject_id === 'all' ? STEM.LEVELS.scholar.rule : STEM.LEVELS[c.level].rule;
  return `<div class="certificate" style="--lc:${color}">
    <div class="cinner">
      <div class="ctop"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="4" fill="var(--lc)"/><ellipse cx="20" cy="20" rx="16" ry="6" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="20" cy="20" rx="16" ry="6" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(60 20 20)"/><ellipse cx="20" cy="20" rx="16" ry="6" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(120 20 20)"/></svg><span>${E(STEM.CONFIG.schoolName)} · STEM Club</span></div>
      <p class="ckind">Certificate of achievement</p>
      <p class="clevel">${E(lvl)}${c.subject_id === 'all' ? '' : ` <span>in ${E(S.name)}</span>`}</p>
      <p class="cto">awarded to</p><p class="cname">${E(name)}</p>
      <p class="crule">for meeting the club standard: ${E(rule.charAt(0).toLowerCase() + rule.slice(1))}.</p>
      <div class="cfoot"><div><b>${fmtDate(c.issued_at)}</b><small>Date issued</small></div>
        <div class="cseal"><svg viewBox="0 0 120 120"><defs><path id="ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><circle cx="60" cy="60" r="56" fill="var(--lc)"/><circle cx="60" cy="60" r="48" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 3"/><text font-size="9.5" fill="#fff" letter-spacing="2"><textPath href="#ring">DANGILA STEM CLUB · ${E(lvl.toUpperCase())} ·</textPath></text><text x="60" y="68" text-anchor="middle" font-size="26" font-weight="700" fill="#fff">${c.subject_id === 'all' ? '★' : c.level}</text></svg></div>
        <div><b>${E(c.code)}</b><small>Check at ${E(location.host || 'the club website')}/#verify</small></div></div>
    </div></div>`;
};
STEM.certHTML = certHTML;
STEM.pages.push({
  name: 'cert', match: r => r.startsWith('cert-') ? { id: r.slice(5) } : null, roles: ['student', 'teacher', 'admin'],
  async render(el, { id }) {
    const certs = ui.isStaff() ? await store().allCertificates() : await store().myCertificates();
    const c = certs.find(x => x.id === id);
    if (!c) { el.innerHTML = ui.band('Certificate not found') + '<div class="band"><div class="wrap"><a href="#certificates">Back to certificates</a></div></div>'; return; }
    let name = STEM.state.user.full_name;
    if (c.user_id !== STEM.state.user.id) { const p = (await store().listProfiles()).find(x => x.id === c.user_id); name = p ? p.full_name : ''; }
    el.innerHTML = `<div class="band certband"><div class="wrap"><div class="row noprint"><a class="btn ghost" href="#certificates">← Back</a><button class="btn y pr">Print or save as PDF</button><button class="btn ghost cp">Copy certificate code</button></div>${certHTML(c, name)}</div></div>`;
    el.querySelector('.pr').onclick = () => { try { window.print(); } catch (e) { ui.toast('Printing is not available here. Open the live site to print.'); } };
    el.querySelector('.cp').onclick = () => ui.copy(c.code);
  }
});

/* ---------- Verify a certificate (public) ---------- */
STEM.pages.push({
  name: 'verify', match: r => r === 'verify' ? {} : null,
  render(el) {
    el.innerHTML = ui.band('Check a certificate', 'Every Dangila STEM certificate has a code. Enter it to confirm it is real.') + `<div class="band"><div class="wrap narrow">
      <form class="card"><label>Certificate code<input name="c" required placeholder="DSC-CHEM-2-AB12CD" autocapitalize="characters" spellcheck="false"></label><button class="btn y" type="submit">Check</button></form><div class="vres"></div></div></div>`;
    const f = el.querySelector('form');
    f.onsubmit = async e => {
      e.preventDefault(); const out = el.querySelector('.vres'); out.innerHTML = ui.loading;
      try {
        const r = await store().verifyCertificate(f.c.value);
        out.innerHTML = r.valid ? `<div class="out okbox"><p class="eq">✓ Valid certificate</p><p><b>${E(r.full_name)}</b> earned <b>${E(ui.levelName(r.subject_id, r.level))}</b>${r.subject_id === 'all' ? '' : ' in ' + E(r.subject_name)} on ${fmtDate(r.issued_at)}.</p><p class="note">Code ${E(r.code)}</p></div>`
          : '<div class="out badbox"><p class="eq">No certificate found</p><p>Check the code and try again. Codes look like DSC-CHEM-2-AB12CD.</p></div>';
      } catch (err) { out.innerHTML = `<p class="empty">${E(ui.err(err))}</p>`; }
    };
  }
});
})();
