/* Admin: labs, subjects, users and notices. Teachers see the Notices tab only. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate } = ui, store = () => STEM.store;
let tab = 'labs';
STEM.store.onChange(() => { tab = 'labs'; });
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const refresh = async () => { await ui.loadSiteData(); STEM.renderNav(); STEM.route({ keepScroll: true }); };

STEM.pages.push({
  name: 'admin', match: r => r === 'admin' ? {} : null, roles: ['teacher', 'admin'],
  async render(el) {
    const admin = ui.isAdmin(); if (!admin) tab = 'news';
    const tabs = admin ? [['labs', 'Labs'], ['subjects', 'Subjects'], ['users', 'Users'], ['news', 'Notices']] : [['news', 'Notices']];
    el.innerHTML = ui.band(admin ? 'Admin' : 'Notices', admin ? 'Add labs and subjects, manage accounts and post notices. Changes appear on the site straight away.' : 'Post news for the club notice board.') +
      `<div class="band"><div class="wrap"><div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" class="${k === tab ? 'on' : ''}" data-t="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div><div class="tabbody">${ui.loading}</div></div></div>`;
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; STEM.route(); });
    const body = el.querySelector('.tabbody');
    try { await ({ labs: labsTab, subjects: subjectsTab, users: usersTab, news: newsTab })[tab](body); }
    catch (e) { body.innerHTML = `<p class="empty">${E(ui.err(e))}</p>`; }
  }
});

/* ---------- Labs ---------- */
async function labsTab(el) {
  const known = new Set(STEM.state.labs.map(l => l.id));
  const missing = STEM.SIMS.filter(s => !known.has(s.id));
  el.innerHTML = `<div class="row between"><p class="note">Three kinds of lab: <b>built-in</b> simulations (from the code), <b>outside simulations</b> (any https link, e.g. PhET or GeoGebra), and <b>hands-on guides</b> for real experiments.</p><button class="btn y add">+ Add a lab</button></div>
    ${missing.length ? `<div class="out"><b>New simulation files found:</b> ${missing.map(s => E(s.title)).join(', ')}. <button class="btn sm reg">Add them to the site</button></div>` : ''}
    ${STEM.state.subjects.map(s => { const labs = ui.labsOf(s.id, true); return `<h3 class="sec" style="color:${s.color}">${E(s.name)} <small class="muted">${labs.length} labs</small></h3>
      ${ui.table([{ h: 'Lab', v: l => `<b>${E(l.title)}</b><br><small class="muted">${E(l.id)} · ${l.kind === 'builtin' ? 'built-in' : l.kind === 'embed' ? 'outside simulation' : 'hands-on guide'}</small>` },
        { h: 'Level', v: l => E(l.level || '') }, { h: 'Shown', v: l => l.published ? '<span class="badge ok">Visible</span>' : '<span class="badge soft">Hidden</span>' },
        { h: '', v: l => `<div class="row tight"><button class="btn ghost sm mv" data-id="${E(l.id)}" data-d="-1" aria-label="Move up">↑</button><button class="btn ghost sm mv" data-id="${E(l.id)}" data-d="1" aria-label="Move down">↓</button><button class="btn ghost sm tg" data-id="${E(l.id)}">${l.published ? 'Hide' : 'Show'}</button><button class="btn ghost sm ed" data-id="${E(l.id)}">Edit</button>${l.kind !== 'builtin' ? `<button class="btn ghost sm rm" data-id="${E(l.id)}">Delete</button>` : ''}</div>` }], labs, 'No labs yet.')}`; }).join('')}`;
  const find = id => STEM.state.labs.find(l => l.id === id);
  el.querySelector('.add').onclick = () => labDialog();
  el.querySelectorAll('.ed').forEach(b => b.onclick = () => labDialog(find(b.dataset.id)));
  el.querySelectorAll('.tg').forEach(b => b.onclick = async () => { const l = find(b.dataset.id); try { await store().saveLab({ ...l, published: !l.published }); refresh(); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
  el.querySelectorAll('.rm').forEach(b => b.onclick = async () => { if (!await ui.confirm('Delete this lab? Student progress on it will no longer count.', 'Delete', true)) return; try { await store().deleteLab(b.dataset.id); refresh(); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
  el.querySelectorAll('.mv').forEach(b => b.onclick = async () => {
    const l = find(b.dataset.id), list = ui.labsOf(l.subject_id, true), i = list.indexOf(l), j = i + +b.dataset.d; if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    try { for (let k = 0; k < list.length; k++) if (list[k].position !== k + 1) await store().saveLab({ ...list[k], position: k + 1 }); refresh(); } catch (e) { ui.toast(ui.err(e), 'bad'); }
  });
  const reg = el.querySelector('.reg');
  if (reg) reg.onclick = async () => { try { for (const s of missing) await store().saveLab({ id: s.id, subject_id: s.subject, kind: 'builtin', title: s.title, level: s.level, blurb: s.blurb, instructions: '', embed_url: '', position: 50, published: true }); ui.toast('Added'); refresh(); } catch (e) { ui.toast(ui.err(e), 'bad'); } };
}

function labDialog(l) {
  const isNew = !l; l = l || { id: '', subject_id: STEM.state.subjects[0].id, kind: 'embed', title: '', level: '', blurb: '', instructions: '', embed_url: '', published: true, position: 99 };
  const m = ui.modal(`<h3>${isNew ? 'Add a lab' : 'Edit lab'}</h3>
    <form class="stackform">
      ${isNew ? `<label>Kind<select name="kind"><option value="embed">Outside simulation (link)</option><option value="guide">Hands-on guide (instructions only)</option></select></label>` : `<p class="note">Kind: ${l.kind === 'builtin' ? 'built-in simulation' : l.kind === 'embed' ? 'outside simulation' : 'hands-on guide'}</p>`}
      <label>Subject<select name="subject_id">${STEM.state.subjects.map(s => `<option value="${E(s.id)}" ${s.id === l.subject_id ? 'selected' : ''}>${E(s.name)}</option>`).join('')}</select></label>
      <label>Title<input name="title" required maxlength="100" value="${E(l.title)}"></label>
      <label>Grade level<input name="level" maxlength="30" placeholder="e.g. Grade 9–10" value="${E(l.level)}"></label>
      <label>Short description<textarea name="blurb" rows="2" maxlength="300">${E(l.blurb)}</textarea></label>
      <label class="kembed">Link to the simulation (https)<input name="embed_url" type="url" placeholder="https://phet.colorado.edu/sims/html/…" value="${E(l.embed_url)}"></label>
      <label class="kinstr">${l.kind === 'guide' ? 'Steps' : 'Task or instructions'} <small class="muted">(start lines with 1. 2. 3. for numbered steps)</small><textarea name="instructions" rows="6">${E(l.instructions)}</textarea></label>
      <label class="check"><input type="checkbox" name="published" ${l.published ? 'checked' : ''}> Visible to students</label>
      <p class="note kembed">Good free sources: PhET (phet.colorado.edu, open a simulation and copy its HTML5 link), GeoGebra (geogebra.org, use the “embed” link).</p>
      <div class="row end"><button type="button" class="btn ghost c">Cancel</button><button class="btn y">Save lab</button></div>
    </form>`, { wide: true });
  const f = m.el.querySelector('form');
  const kind = () => isNew ? f.kind.value : l.kind;
  const sync = () => { m.el.querySelectorAll('.kembed').forEach(x => x.hidden = kind() !== 'embed'); m.el.querySelector('.kinstr').hidden = kind() === 'builtin' && !l.instructions; };
  if (isNew) f.kind.onchange = sync; sync();
  m.el.querySelector('.c').onclick = m.close;
  f.onsubmit = async e => {
    e.preventDefault();
    const data = { ...l, kind: kind(), subject_id: f.subject_id.value, title: f.title.value.trim(), level: f.level.value.trim(), blurb: f.blurb.value.trim(), instructions: f.instructions.value.trim(), embed_url: f.embed_url.value.trim(), published: f.published.checked };
    if (data.kind === 'embed' && !/^https:\/\//i.test(data.embed_url)) { ui.toast('The link must start with https://', 'bad'); return; }
    if (isNew) { let id = slug(data.title) || 'lab', n = 2; while (STEM.state.labs.some(x => x.id === id) || STEM.state.subjects.some(x => x.id === id)) id = slug(data.title) + '-' + n++; data.id = id; data.position = ui.labsOf(data.subject_id, true).length + 1; }
    try { await store().saveLab(data); m.close(); ui.toast('Lab saved'); refresh(); } catch (err) { ui.toast(ui.err(err), 'bad'); }
  };
}

/* ---------- Subjects ---------- */
async function subjectsTab(el) {
  el.innerHTML = `<div class="row between"><p class="note">Each subject becomes a lab page and a menu item. Add physics, Earth science, coding or anything else.</p><button class="btn y add">+ Add a subject</button></div>
    ${ui.table([{ h: 'Subject', v: s => `<span class="dot" style="background:${s.color}"></span> <b>${E(s.name)}</b> <small class="muted">${E(s.am || '')}</small><br><small class="muted">${E(s.description)}</small>` },
      { h: 'Labs', v: s => ui.labsOf(s.id, true).length, cls: 'num' }, { h: 'Shown', v: s => s.published !== false ? '<span class="badge ok">Visible</span>' : '<span class="badge soft">Hidden</span>' },
      { h: '', v: s => `<div class="row tight"><button class="btn ghost sm ed" data-id="${E(s.id)}">Edit</button><button class="btn ghost sm rm" data-id="${E(s.id)}">Delete</button></div>` }], STEM.state.subjects)}`;
  const dlg = s => {
    const isNew = !s; s = s || { id: '', name: '', am: '', color: '#7a4fd6', description: '', published: true, position: STEM.state.subjects.length + 1 };
    const m = ui.modal(`<h3>${isNew ? 'Add a subject' : 'Edit subject'}</h3><form class="stackform">
      <label>Name<input name="name" required maxlength="40" value="${E(s.name)}"></label>
      <label>Name in Amharic (optional)<input name="am" maxlength="40" value="${E(s.am || '')}"></label>
      <label>Colour<input name="color" type="color" value="${E(s.color)}"></label>
      <label>Short description<textarea name="description" rows="2" maxlength="200">${E(s.description)}</textarea></label>
      <label>Order in menu<input name="position" type="number" min="0" value="${s.position || 0}"></label>
      <label class="check"><input type="checkbox" name="published" ${s.published !== false ? 'checked' : ''}> Visible</label>
      <div class="row end"><button type="button" class="btn ghost c">Cancel</button><button class="btn y">Save</button></div></form>`);
    const f = m.el.querySelector('form'); m.el.querySelector('.c').onclick = m.close;
    f.onsubmit = async e => {
      e.preventDefault();
      const d = { id: s.id || slug(f.name.value), name: f.name.value.trim(), am: f.am.value.trim(), color: f.color.value, description: f.description.value.trim(), position: +f.position.value || 0, published: f.published.checked };
      if (!d.id) { ui.toast('Give the subject a name', 'bad'); return; }
      if (isNew && STEM.state.subjects.some(x => x.id === d.id)) { ui.toast('A subject with that name already exists', 'bad'); return; }
      try { await store().saveSubject(d); m.close(); ui.toast('Subject saved'); refresh(); } catch (err) { ui.toast(ui.err(err), 'bad'); }
    };
  };
  el.querySelector('.add').onclick = () => dlg();
  el.querySelectorAll('.ed').forEach(b => b.onclick = () => dlg(STEM.state.subjects.find(s => s.id === b.dataset.id)));
  el.querySelectorAll('.rm').forEach(b => b.onclick = async () => {
    if (!await ui.confirm('Delete this subject and all its labs? Built-in simulation files are not deleted.', 'Delete', true)) return;
    try { await store().deleteSubject(b.dataset.id); refresh(); } catch (e) { ui.toast(ui.err(e), 'bad'); }
  });
}

/* ---------- Users ---------- */
async function usersTab(el) {
  const people = await store().listProfiles();
  el.innerHTML = `<div class="row between"><div class="row"><input type="search" class="uq" placeholder="Search" aria-label="Search users"><select class="ur" aria-label="Role"><option value="">All roles</option><option>student</option><option>teacher</option><option>admin</option></select></div>
    <div class="row"><button class="btn ghost at">+ Add teachers</button><button class="btn y as">+ Add students</button></div></div><div class="ut"></div>`;
  const draw = () => {
    const q = el.querySelector('.uq').value.toLowerCase(), r = el.querySelector('.ur').value;
    const rows = people.filter(p => (!r || p.role === r) && (!q || (p.full_name + p.username).toLowerCase().includes(q))).sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name));
    el.querySelector('.ut').innerHTML = ui.table([{ h: 'Name', v: p => `<b>${E(p.full_name)}</b><br><small class="muted">${E(p.username)}</small>` }, { h: 'Grade', v: p => E(p.grade) },
      { h: 'Role', v: p => `<select class="role" data-id="${E(p.id)}" aria-label="Role for ${E(p.full_name)}" ${p.id === STEM.state.user.id ? 'disabled' : ''}>${['student', 'teacher', 'admin'].map(x => `<option ${x === p.role ? 'selected' : ''}>${x}</option>`).join('')}</select>` },
      { h: 'Created', v: p => fmtDate(p.created_at) },
      { h: '', v: p => p.id === STEM.state.user.id ? '<small class="muted">You</small>' : `<div class="row tight">${p.role === 'student' ? `<a class="btn ghost sm" href="#student-${E(p.id)}">Report</a>` : ''}<button class="btn ghost sm rp" data-id="${E(p.id)}">Reset password</button><button class="btn ghost sm del" data-id="${E(p.id)}">Delete</button></div>` }], rows);
    el.querySelectorAll('.role').forEach(s => s.onchange = async () => { try { await store().manageUsers({ action: 'role', user_id: s.dataset.id, role: s.value }); people.find(p => p.id === s.dataset.id).role = s.value; ui.toast('Role changed'); } catch (e) { ui.toast(ui.err(e), 'bad'); draw(); } });
    el.querySelectorAll('.rp').forEach(b => b.onclick = async () => { const p = people.find(x => x.id === b.dataset.id); if (!await ui.confirm(`Make a new password for ${p.full_name}?`, 'Reset')) return; try { const r = await store().manageUsers({ action: 'reset', user_id: p.id }); STEM.showSlips([{ ...p, password: r.password }]); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
    el.querySelectorAll('.del').forEach(b => b.onclick = async () => { const p = people.find(x => x.id === b.dataset.id); if (!await ui.confirm(`Delete ${p.full_name}'s account and all their results? This cannot be undone.`, 'Delete', true)) return; try { await store().manageUsers({ action: 'delete', user_id: p.id }); people.splice(people.indexOf(p), 1); draw(); ui.toast('Deleted'); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
  };
  el.querySelector('.uq').oninput = draw; el.querySelector('.ur').onchange = draw; draw();
  el.querySelector('.as').onclick = () => STEM.addUsersDialog('student');
  el.querySelector('.at').onclick = () => STEM.addUsersDialog('teacher');
}

/* ---------- Notices ---------- */
async function newsTab(el) {
  const news = await store().getNews();
  el.innerHTML = `<div class="row between"><p class="note">Notices show on the home page and the Club page, newest first.</p><button class="btn y add">+ New notice</button></div>
    ${ui.table([{ h: 'Date', v: n => fmtDate(n.date) }, { h: 'Notice', v: n => `<b>${E(n.title)}</b>${n.tag ? ` <span class="badge soft">${E(n.tag)}</span>` : ''}<br><small class="muted">${E(n.body).slice(0, 140)}</small>` },
      { h: '', v: n => `<div class="row tight"><button class="btn ghost sm ed" data-id="${E(n.id)}">Edit</button><button class="btn ghost sm rm" data-id="${E(n.id)}">Delete</button></div>` }], news, 'No notices yet.')}`;
  const dlg = n => {
    n = n || { date: new Date().toISOString().slice(0, 10), tag: '', title: '', body: '', link: '', link_text: '' };
    const m = ui.modal(`<h3>${n.id ? 'Edit notice' : 'New notice'}</h3><form class="stackform">
      <div class="grid2"><label>Date<input name="date" type="date" required value="${E(n.date)}"></label><label>Tag (optional)<input name="tag" maxlength="20" placeholder="Meeting, Exam, News" value="${E(n.tag)}"></label></div>
      <label>Title<input name="title" required maxlength="120" value="${E(n.title)}"></label>
      <label>Message<textarea name="body" rows="4" maxlength="1000">${E(n.body)}</textarea></label>
      <div class="grid2"><label>Link (optional)<input name="link" placeholder="#chemistry or https://…" value="${E(n.link)}"></label><label>Link text<input name="link_text" maxlength="40" value="${E(n.link_text)}"></label></div>
      <div class="row end"><button type="button" class="btn ghost c">Cancel</button><button class="btn y">Save notice</button></div></form>`, { wide: true });
    const f = m.el.querySelector('form'); m.el.querySelector('.c').onclick = m.close;
    f.onsubmit = async e => { e.preventDefault(); const d = { ...(n.id ? { id: n.id } : {}), date: f.date.value, tag: f.tag.value.trim(), title: f.title.value.trim(), body: f.body.value.trim(), link: f.link.value.trim(), link_text: f.link_text.value.trim() };
      try { await store().saveNews(d); m.close(); ui.toast('Notice saved'); STEM.route(); } catch (err) { ui.toast(ui.err(err), 'bad'); } };
  };
  el.querySelector('.add').onclick = () => dlg();
  el.querySelectorAll('.ed').forEach(b => b.onclick = () => dlg(news.find(n => n.id === b.dataset.id)));
  el.querySelectorAll('.rm').forEach(b => b.onclick = async () => { if (!await ui.confirm('Delete this notice?', 'Delete', true)) return; try { await store().deleteNews(b.dataset.id); STEM.route(); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
}
})();
