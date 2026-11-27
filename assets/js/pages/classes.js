/* Classroom: classes with a join code, stream, classwork, people and grades. Also student sign-up. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate } = ui, store = () => STEM.store;
const KINDS = { announcement: ['📣', 'Announcement'], material: ['📄', 'Material'], course: ['📚', 'Course'], exam: ['📝', 'Exam'], assignment: ['✍️', 'Assignment'], lab: ['🔬', 'Lab'] };
let tabByClass = {};
const linkFor = p => p.kind === 'course' ? '#course-' + p.ref_id : p.kind === 'exam' ? '#exam-' + p.ref_id : p.kind === 'assignment' ? '#assignment-' + p.ref_id : p.kind === 'lab' ? '#' + p.ref_id : (/^https:\/\//i.test(p.link) ? p.link : '');

/* status of one classwork item for the logged-in student */
async function myStatus(posts) {
  const work = posts.filter(p => p.kind !== 'announcement' && p.kind !== 'material');
  if (!work.length || ui.isStaff()) return {};
  const [att, subs, lp, prog] = await Promise.all([store().myAttempts(), store().mySubmissions(), store().myLessonProgress(), store().myProgress()]);
  const st = {};
  for (const p of work) {
    if (p.kind === 'exam') { const a = att.filter(x => x.exam_id === p.ref_id); st[p.id] = a.length ? { done: a.some(x => x.passed), text: `Best ${Math.max(...a.map(x => +x.percent))}%${a.some(x => x.passed) ? ' · passed' : ''}` } : { done: false, text: 'Not taken' }; }
    if (p.kind === 'assignment') { const s = subs.find(x => x.assignment_id === p.ref_id); st[p.id] = s ? { done: true, text: s.grade != null ? `Graded ${s.grade}` : 'Submitted' } : { done: false, text: 'Not submitted' }; }
    if (p.kind === 'lab') { const x = prog.find(y => y.lab_id === p.ref_id); st[p.id] = x ? { done: x.completed, text: x.completed ? 'Completed' : 'Started' } : { done: false, text: 'Not started' }; }
    if (p.kind === 'course') { let n = 0; try { n = (await store().getCourse(p.ref_id)).lessons.length; } catch (e) {} const d = lp.filter(x => x.course_id === p.ref_id).length; st[p.id] = { done: n > 0 && d >= n, text: `${d} of ${n} lessons` }; }
  }
  return st;
}

/* dashboard: upcoming classwork */
STEM.classTodo = async () => {
  try {
    const classes = await store().listClasses(); if (!classes.length) return '';
    const all = []; for (const c of classes) { const d = await store().getClass(c.id); const st = await myStatus(d.posts); d.posts.filter(p => st[p.id] && !st[p.id].done).forEach(p => all.push({ p, c, s: st[p.id] })); }
    all.sort((a, b) => String(a.p.due_date || '9999').localeCompare(String(b.p.due_date || '9999')));
    return `<h3 class="sec">To do from my classes</h3>${all.length ? `<div class="alist">${all.slice(0, 6).map(({ p, c, s }) => `<a class="acard" href="${E(linkFor(p) || '#class-' + c.id)}"><span>${KINDS[p.kind][0]}</span><b>${E(p.title)}</b><small>${E(c.name)}${p.due_date ? ' · Due ' + fmtDate(p.due_date) : ''}</small><span class="badge soft">${E(s.text)}</span></a>`).join('')}</div>` : '<p class="empty">All caught up!</p>'}`;
  } catch (e) { return ''; }
};

/* ---------- My classes ---------- */
STEM.pages.push({
  name: 'classes', match: r => r === 'classes' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    const staff = ui.isStaff();
    el.innerHTML = ui.band('Classes', staff ? 'Create a class, share its code with students, and post work and announcements.' : 'Your classes. Join a new one with the code from your teacher.', '#0e6b5c') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.band:last-child .wrap');
    const classes = await store().listClasses();
    wrap.innerHTML = `<div class="row between">${staff ? '<button class="btn y newc">+ New class</button>' : '<span></span>'}<form class="row joinf"><input class="jc" placeholder="Class code" maxlength="8" autocapitalize="characters" aria-label="Class code" spellcheck="false"><button class="btn">Join class</button></form></div>
      ${classes.length ? `<div class="classgrid">${classes.map(c => `<a class="classcard" href="#class-${E(c.id)}" style="--c:${E(c.color)}"><div class="cbanner"><b>${E(c.name)}</b><small>${E(subj(c.subject_id).name)}${c.grade ? ' · ' + E(c.grade) : ''}</small></div><div class="cbody"><span>${c.member_count} student${c.member_count === 1 ? '' : 's'}</span>${staff ? `<span class="code">Code <b>${E(c.code)}</b></span>` : ''}${c.archived ? '<span class="badge soft">Archived</span>' : ''}</div></a>`).join('')}</div>`
        : `<p class="empty">${staff ? 'No classes yet. Create your first class.' : 'You are not in a class yet. Ask your teacher for the class code and type it above.'}</p>`}`;
    wrap.querySelector('.joinf').onsubmit = async e => { e.preventDefault(); const v = wrap.querySelector('.jc').value.trim(); if (!v) return;
      try { const c = await store().joinClass(v); ui.toast(`You joined ${c.name}`); location.hash = 'class-' + c.id; } catch (er) { ui.toast(ui.err(er), 'bad'); } };
    const nb = wrap.querySelector('.newc'); if (nb) nb.onclick = () => classDialog();
  }
});

function classDialog(c) {
  const isNew = !c; c = c || { name: '', subject_id: STEM.state.subjects[0] ? STEM.state.subjects[0].id : '', grade: '', description: '', color: '#0e6b5c' };
  const m = ui.modal(`<h3>${isNew ? 'New class' : 'Edit class'}</h3><form class="stackform">
    <label>Class name<input name="name" required maxlength="80" placeholder="e.g. Grade 10 Physics, Section B" value="${E(c.name)}"></label>
    <div class="grid2"><label>Subject<select name="subject_id"><option value="">General</option>${STEM.state.subjects.map(s => `<option value="${E(s.id)}" ${s.id === c.subject_id ? 'selected' : ''}>${E(s.name)}</option>`).join('')}</select></label>
    <label>Grade<select name="grade"><option value="">Any</option>${ui.grades.map(g => `<option ${g === c.grade ? 'selected' : ''}>${g}</option>`).join('')}</select></label></div>
    <label>Description (optional)<textarea name="description" rows="2" maxlength="400">${E(c.description)}</textarea></label>
    <label>Colour<input name="color" type="color" value="${E(c.color)}"></label>
    ${isNew ? '' : `<label class="check"><input type="checkbox" name="archived" ${c.archived ? 'checked' : ''}> Archived (hidden from joining; students can still see it)</label>`}
    <div class="row end"><button type="button" class="btn ghost c">Cancel</button><button class="btn y">${isNew ? 'Create class' : 'Save'}</button></div></form>`);
  const f = m.el.querySelector('form'); m.el.querySelector('.c').onclick = m.close;
  f.onsubmit = async e => { e.preventDefault();
    const d = { ...(isNew ? {} : { id: c.id }), name: f.name.value.trim(), subject_id: f.subject_id.value, grade: f.grade.value, description: f.description.value.trim(), color: f.color.value, ...(isNew ? {} : { archived: f.archived.checked }) };
    try { const id = await store().saveClass(d); m.close(); ui.toast(isNew ? 'Class created. Share the code with your students.' : 'Saved'); location.hash = 'class-' + id; if (!isNew) STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } };
}

/* ---------- One class ---------- */
STEM.pages.push({
  name: 'class', match: r => r.startsWith('class-') ? { id: r.slice(6) } : null, roles: ['student', 'teacher', 'admin'],
  async render(el, { id }) {
    const staff = ui.isStaff(), me = STEM.state.user;
    let d; try { d = await store().getClass(id); } catch (e) { el.innerHTML = ui.band('Class not found') + '<div class="band"><div class="wrap"><a href="#classes">All classes</a></div></div>'; return; }
    const { cls: c, people, posts, comments, authors } = d, tab = tabByClass[id] || 'stream';
    const tabs = [['stream', 'Stream'], ['work', 'Classwork'], ['people', 'People']].concat(staff ? [['grades', 'Grades']] : []);
    const author = uid => (authors && authors[uid]) || (people.find(p => p.user_id === uid) || {}).full_name || 'Teacher';
    el.innerHTML = `<div class="band classhead" style="--c:${E(c.color)};--on:${ui.onColor(c.color)}"><div class="wrap"><a href="#classes" class="back">← Classes</a><h2>${E(c.name)}</h2><p>${E(subj(c.subject_id).name)}${c.grade ? ' · ' + E(c.grade) : ''}${c.description ? ' · ' + E(c.description) : ''}</p>
      ${staff ? `<div class="codebox2"><span>Class code</span><b class="ccode">${E(c.code)}</b><button class="btn sm ghostw cpc">Copy</button><button class="btn sm ghostw rsc">New code</button><button class="btn sm ghostw edc">Edit class</button></div>` : ''}</div></div>
      <div class="band"><div class="wrap"><div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" class="${k === tab ? 'on' : ''}" data-t="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div><div class="tabbody">${ui.loading}</div></div></div>`;
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { tabByClass[id] = b.dataset.t; STEM.route({ keepScroll: true }); });
    if (staff) {
      el.querySelector('.cpc').onclick = () => ui.copy(c.code);
      el.querySelector('.rsc').onclick = async () => { if (!await ui.confirm('Make a new class code? The old code will stop working for new students (current students stay in the class).', 'New code')) return; try { const code = await store().resetClassCode(id); el.querySelector('.ccode').textContent = code; ui.toast('New code: ' + code); } catch (e) { ui.toast(ui.err(e), 'bad'); } };
      el.querySelector('.edc').onclick = () => classDialog(c);
    }
    const body = el.querySelector('.tabbody');
    const st = await myStatus(posts);

    const postHTML = (p, withComments) => {
      const k = KINDS[p.kind] || KINDS.announcement, link = linkFor(p), cs = comments.filter(x => x.post_id === p.id), s = st[p.id];
      return `<article class="post k-${p.kind}" data-id="${E(p.id)}"><div class="phead"><span class="pic" aria-hidden="true">${k[0]}</span><div><b>${p.kind === 'announcement' ? E(author(p.author_id)) : E(p.title)}</b><small>${p.kind === 'announcement' ? fmtDate(p.created_at) : `${k[1]} · posted ${fmtDate(p.created_at)}${p.due_date ? ' · <b>Due ' + fmtDate(p.due_date) + '</b>' : ''}`}</small></div>
        ${s ? `<span class="badge ${s.done ? 'ok' : 'soft'}">${E(s.text)}</span>` : ''}${staff ? '<button class="linkbtn delp" aria-label="Delete post">Delete</button>' : ''}</div>
        ${p.body ? `<div class="pbody">${ui.richText(p.body)}</div>` : ''}
        ${link ? `<a class="btn sm ${p.kind === 'material' ? 'ghost' : 'y'}" href="${E(link)}" ${link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${p.kind === 'course' ? 'Open course' : p.kind === 'exam' ? 'Open exam' : p.kind === 'assignment' ? 'Open assignment' : p.kind === 'lab' ? 'Open lab' : 'Open link ↗'}</a>` : ''}
        ${withComments ? `<div class="comments">${cs.map(x => `<div class="cmt"><b>${E(author(x.author_id))}</b> <small class="muted">${fmtDate(x.created_at)}</small>${staff || x.author_id === me.id ? `<button class="linkbtn delc" data-c="${E(x.id)}" aria-label="Delete comment">×</button>` : ''}<p>${E(x.body)}</p></div>`).join('')}
          <form class="cform2"><input placeholder="Add a class comment…" maxlength="2000" aria-label="Comment"><button class="btn sm">Post</button></form></div>` : ''}</article>`;
    };
    const wirePosts = () => {
      body.querySelectorAll('.post').forEach(a => {
        const pid = a.dataset.id, f = a.querySelector('.cform2');
        if (f) f.onsubmit = async e => { e.preventDefault(); const v = f.querySelector('input').value.trim(); if (!v) return; try { await store().addComment(pid, v); STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } };
        a.querySelectorAll('.delc').forEach(b => b.onclick = async () => { try { await store().deleteComment(b.dataset.c); STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } });
        const dp = a.querySelector('.delp'); if (dp) dp.onclick = async () => { if (!await ui.confirm('Delete this post and its comments?', 'Delete', true)) return; try { await store().deletePost(pid); STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } };
      });
    };

    if (tab === 'stream') {
      const due = posts.filter(p => p.due_date && p.due_date >= new Date().toISOString().slice(0, 10) && !(st[p.id] && st[p.id].done)).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 4);
      body.innerHTML = `<div class="streamgrid"><aside class="upcoming card"><b>Upcoming</b>${due.length ? due.map(p => `<a href="${E(linkFor(p) || '#')}"><small>Due ${fmtDate(p.due_date)}</small>${E(p.title)}</a>`).join('') : '<p class="note">Nothing due soon.</p>'}</aside>
        <div>${staff ? `<form class="card announce"><textarea rows="3" placeholder="Announce something to your class…" maxlength="4000" aria-label="Announcement"></textarea><div class="row end"><button class="btn y">Post</button></div></form>` : ''}
        ${posts.map(p => postHTML(p, true)).join('') || '<p class="empty">Nothing posted yet.</p>'}</div></div>`;
      const af = body.querySelector('.announce');
      if (af) af.onsubmit = async e => { e.preventDefault(); const v = af.querySelector('textarea').value.trim(); if (!v) return; try { await store().savePost({ class_id: id, kind: 'announcement', body: v }); ui.toast('Posted'); STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } };
      wirePosts();
    }

    if (tab === 'work') {
      const work = posts.filter(p => p.kind !== 'announcement');
      body.innerHTML = `${staff ? '<div class="row"><button class="btn y addw">+ Create classwork</button></div>' : ''}
        ${work.length ? ['course', 'lab', 'exam', 'assignment', 'material'].map(k => { const list = work.filter(p => p.kind === k); return list.length ? `<h3 class="sec">${KINDS[k][0]} ${KINDS[k][1]}s</h3>${list.map(p => postHTML(p, true)).join('')}` : ''; }).join('') : `<p class="empty">No classwork yet.${staff ? ' Add a course, lab, exam, assignment or material.' : ''}</p>`}`;
      wirePosts();
      const aw = body.querySelector('.addw'); if (aw) aw.onclick = () => workDialog(id);
    }

    if (tab === 'people') {
      const teachers = people.filter(p => p.role === 'teacher'), students = people.filter(p => p.role === 'student');
      body.innerHTML = `<h3 class="sec">Teachers</h3><ul class="plist">${teachers.map(p => `<li><span class="av">${E((p.full_name || '?')[0])}</span>${E(p.full_name || p.username)}</li>`).join('') || '<li class="empty">None</li>'}</ul>
        <div class="row between"><h3 class="sec">Students <small class="muted">${students.length}</small></h3>${staff ? '<button class="btn ghost adds">+ Add students</button>' : ''}</div>
        <ul class="plist">${students.map(p => `<li><span class="av">${E((p.full_name || '?')[0])}</span><span>${E(p.full_name)}${staff ? ` <small class="muted">${E(p.username)} · ${E(p.grade || '')}</small>` : ''}</span>${staff ? `<a class="linkbtn" href="#student-${E(p.user_id)}">Report</a><button class="linkbtn rmst" data-u="${E(p.user_id)}">Remove</button>` : ''}</li>`).join('') || `<li class="empty">No students yet.${staff ? ` Share the class code <b>${E(c.code)}</b>: students type it on the Classes page, or when they sign up.` : ''}</li>`}</ul>
        ${!staff ? '<p><button class="btn ghost leave">Leave this class</button></p>' : ''}`;
      body.querySelectorAll('.rmst').forEach(b => b.onclick = async () => { if (!await ui.confirm('Remove this student from the class? Their work is kept.', 'Remove')) return; try { await store().removeClassMember(id, b.dataset.u); STEM.route({ keepScroll: true }); } catch (e) { ui.toast(ui.err(e), 'bad'); } });
      const lv = body.querySelector('.leave'); if (lv) lv.onclick = async () => { if (!await ui.confirm('Leave this class?', 'Leave')) return; try { await store().leaveClass(id); location.hash = 'classes'; } catch (e) { ui.toast(ui.err(e), 'bad'); } };
      const ad = body.querySelector('.adds'); if (ad) ad.onclick = async () => {
        const all = (await store().listProfiles()).filter(p => p.role === 'student' && !people.some(x => x.user_id === p.id)).sort((a, b) => a.full_name.localeCompare(b.full_name));
        const m = ui.modal(`<h3>Add students</h3><p class="note">Tick students who already have an account. New students can also join with the code <b>${E(c.code)}</b>.</p>
          <input type="search" class="fs2" placeholder="Search" aria-label="Search students"><div class="picklist">${all.map(p => `<label class="check"><input type="checkbox" value="${E(p.id)}"> ${E(p.full_name)} <small class="muted">${E(p.grade || '')}</small></label>`).join('') || '<p class="empty">Every student is already in this class.</p>'}</div>
          <div class="row end"><button class="btn ghost c">Cancel</button><button class="btn y a">Add</button></div>`, { wide: true });
        m.el.querySelector('.fs2').oninput = e => { const q = e.target.value.toLowerCase(); m.el.querySelectorAll('.picklist label').forEach(l => l.hidden = !l.textContent.toLowerCase().includes(q)); };
        m.el.querySelector('.c').onclick = m.close;
        m.el.querySelector('.a').onclick = async () => { const ids = [...m.el.querySelectorAll('.picklist input:checked')].map(i => i.value); if (!ids.length) return m.close(); try { await store().addClassMembers(id, ids); m.close(); ui.toast(`${ids.length} added`); STEM.route({ keepScroll: true }); } catch (e) { ui.toast(ui.err(e), 'bad'); } };
      };
    }

    if (tab === 'grades' && staff) {
      const work = posts.filter(p => ['exam', 'assignment', 'course', 'lab'].includes(p.kind)).reverse(), students = people.filter(p => p.role === 'student');
      const [att, subs, lp, prog] = await Promise.all([store().allAttempts(), store().allSubmissions(), store().allLessonProgress(), store().allProgress()]);
      const lessonsN = {}; for (const p of work.filter(x => x.kind === 'course')) { try { lessonsN[p.ref_id] = (await store().getCourse(p.ref_id)).lessons.length; } catch (e) { lessonsN[p.ref_id] = 0; } }
      const cell = (p, u) => {
        if (p.kind === 'exam') { const a = att.filter(x => x.exam_id === p.ref_id && x.user_id === u); return a.length ? `<span class="${a.some(x => x.passed) ? 'gok' : 'gbad'}">${Math.max(...a.map(x => +x.percent))}%</span>` : '<span class="muted">–</span>'; }
        if (p.kind === 'assignment') { const s = subs.find(x => x.assignment_id === p.ref_id && x.user_id === u); return s ? (s.grade != null ? `<b>${s.grade}</b>` : `<a href="#assignment-${E(p.ref_id)}">to mark</a>`) : '<span class="muted">–</span>'; }
        if (p.kind === 'course') { const n = lessonsN[p.ref_id] || 0, dn = lp.filter(x => x.course_id === p.ref_id && x.user_id === u).length; return n ? `${Math.round(100 * dn / n)}%` : '–'; }
        if (p.kind === 'lab') { const x = prog.find(y => y.lab_id === p.ref_id && y.user_id === u); return x ? (x.completed ? '<span class="gok">✓</span>' : '<span class="muted">started</span>') : '<span class="muted">–</span>'; }
      };
      body.innerHTML = work.length && students.length ? `<div class="row end"><button class="btn ghost csv">Download CSV</button></div><div class="tablewrap gradebook"><table><thead><tr><th>Student</th>${work.map(p => `<th title="${E(p.title)}">${KINDS[p.kind][0]} ${E(p.title.length > 18 ? p.title.slice(0, 17) + '…' : p.title)}</th>`).join('')}</tr></thead><tbody>${students.map(s => `<tr><td><a href="#student-${E(s.user_id)}">${E(s.full_name)}</a></td>${work.map(p => `<td class="num">${cell(p, s.user_id)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="note">Exams: best score (green = passed). Assignments: grade. Courses: share of lessons done. Labs: ✓ when completed.</p>` : '<p class="empty">Grades appear here once the class has students and classwork.</p>';
      const cb = body.querySelector('.csv'); if (cb) cb.onclick = () => { const strip = h => h.replace(/<[^>]+>/g, '').replace('–', ''); ui.download(`${c.name.replace(/\W+/g, '-')}-grades.csv`, ui.csv([['Student', ...work.map(p => `${KINDS[p.kind][1]}: ${p.title}`)], ...students.map(s => [s.full_name, ...work.map(p => strip(cell(p, s.user_id)))])])); };
    }
  }
});

async function workDialog(classId) {
  const [courses, exams] = await Promise.all([store().listCourses(), store().listExams()]);
  const asg = []; for (const c of courses) { try { (await store().getCourse(c.id)).assignments.forEach(a => asg.push({ ...a, course: c.title })); } catch (e) {} }
  const labs = STEM.state.labs.filter(l => l.published);
  const opts = { course: courses.map(c => [c.id, c.title]), exam: exams.map(e => [e.id, e.title + (e.published ? '' : ' (draft)')]), assignment: asg.map(a => [a.id, `${a.title} (${a.course})`]), lab: labs.map(l => [l.id, `${l.title} (${subj(l.subject_id).name})`]) };
  const m = ui.modal(`<h3>Create classwork</h3><form class="stackform">
    <label>Type<select name="kind"><option value="course">📚 Course</option><option value="lab">🔬 Lab</option><option value="exam">📝 Exam</option><option value="assignment">✍️ Assignment (from a course)</option><option value="material">📄 Material (notes or a link)</option></select></label>
    <label class="pick">Choose<select name="ref"></select></label>
    <label class="mat">Title<input name="title" maxlength="120"></label>
    <label>Instructions for students (optional)<textarea name="body" rows="3" maxlength="4000"></textarea></label>
    <label class="mat">Link (optional, https)<input name="link" placeholder="https://…"></label>
    <label>Due date (optional)<input name="due" type="date"></label>
    <p class="note">Exams and assignments must be published to be visible. Make new ones in the Exam builder or in a course.</p>
    <div class="row end"><button type="button" class="btn ghost c">Cancel</button><button class="btn y">Post to class</button></div></form>`, { wide: true });
  const f = m.el.querySelector('form'); m.el.querySelector('.c').onclick = m.close;
  const sync = () => { const k = f.kind.value, mat = k === 'material'; m.el.querySelector('.pick').hidden = mat; m.el.querySelectorAll('.mat').forEach(x => x.hidden = !mat);
    if (!mat) f.ref.innerHTML = (opts[k] || []).map(([v, t]) => `<option value="${E(v)}">${E(t)}</option>`).join('') || '<option value="">Nothing to choose yet</option>'; };
  f.kind.onchange = sync; sync();
  f.onsubmit = async e => { e.preventDefault(); const k = f.kind.value;
    if (k !== 'material' && !f.ref.value) { ui.toast('Nothing to choose: create it first', 'bad'); return; }
    if (k === 'material' && !f.title.value.trim()) { ui.toast('Give the material a title', 'bad'); return; }
    if (f.link.value && !/^https:\/\//i.test(f.link.value.trim())) { ui.toast('The link must start with https://', 'bad'); return; }
    const title = k === 'material' ? f.title.value.trim() : (opts[k].find(o => o[0] === f.ref.value) || [, ''])[1].replace(/ \((draft|.*)\)$/, '');
    try { await store().savePost({ class_id: classId, kind: k, title, body: f.body.value.trim(), ref_id: k === 'material' ? '' : f.ref.value, link: k === 'material' ? f.link.value.trim() : '', due_date: f.due.value || null }); m.close(); ui.toast('Posted to the class'); tabByClass[classId] = 'work'; STEM.route({ keepScroll: true }); }
    catch (er) { ui.toast(ui.err(er), 'bad'); } };
}

/* ---------- Student sign-up ---------- */
STEM.pages.push({
  name: 'signup', match: r => r === 'signup' ? {} : null,
  render(el) {
    if (STEM.state.user) { location.hash = 'classes'; return; }
    el.innerHTML = `<div class="band loginband"><div class="wrap narrow"><form class="card login stackform">
      <h2>Create a student account</h2><p class="note">You need the class code from your teacher.</p>
      <label>Class code<input name="code" required maxlength="8" autocapitalize="characters" spellcheck="false" placeholder="e.g. TANA26"></label>
      <label>Full name<input name="full_name" required maxlength="80" autocomplete="name"></label>
      <label>Grade<select name="grade"><option value="">Choose…</option>${ui.grades.map(g => `<option>${g}</option>`).join('')}</select></label>
      <label>Choose a username<input name="username" required minlength="3" maxlength="24" autocapitalize="none" spellcheck="false" autocomplete="username" placeholder="letters and numbers, e.g. abebe.k"></label>
      <label>Choose a password<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
      <label>Type the password again<input name="password2" type="password" required minlength="6" autocomplete="new-password"></label>
      <button class="btn y">Create my account</button><p class="formmsg" aria-live="polite"></p>
      <p class="note">Already have an account? <a href="#login">Log in</a></p></form></div></div>`;
    const f = el.querySelector('form'), msg = f.querySelector('.formmsg');
    f.username.oninput = () => { f.username.value = f.username.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''); };
    f.onsubmit = async e => { e.preventDefault();
      if (f.password.value !== f.password2.value) { msg.textContent = 'The two passwords are different.'; return; }
      msg.textContent = 'Creating your account…';
      try { const r = await store().signup({ code: f.code.value, full_name: f.full_name.value, grade: f.grade.value, username: f.username.value, password: f.password.value });
        msg.textContent = 'Account created. Logging in…'; await store().signIn(r.username, f.password.value); ui.toast(`Welcome! You joined ${r.class_name}.`); location.hash = 'classes';
      } catch (er) { msg.textContent = ui.err(er); } };
  }
});
})();
