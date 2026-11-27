/* E-learning: course catalog, lessons, assignments, course editor, marking and reports. */
(() => {
const ui = STEM.ui, { E, subj, fmtDate } = ui, store = () => STEM.store;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// YouTube links become privacy-friendly embeds; other https links embed as they are
const embedURL = u => {
  u = String(u || '').trim(); if (!/^https:\/\//i.test(u)) return '';
  const y = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i.exec(u);
  return y ? `https://www.youtube-nocookie.com/embed/${y[1]}` : u;
};
const resourcesHTML = t => {
  const rows = String(t || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [a, b] = l.includes('|') ? l.split('|').map(x => x.trim()) : [l, l]; return /^https:\/\//i.test(b) ? `<li><a href="${E(b)}" target="_blank" rel="noopener">${E(a)} ↗</a></li>` : `<li>${E(a)}</li>`; });
  return rows.length ? `<h3 class="sec">Resources</h3><ul class="res">${rows.join('')}</ul>` : '';
};
const pctOf = (done, total) => total ? Math.round(100 * done / total) : 0;

/* used on the student dashboard */
STEM.coursesSummary = async () => {
  try {
    const [courses, prog] = await Promise.all([store().listCourses(), store().myLessonProgress()]);
    const pub = courses.filter(c => c.published); if (!pub.length) return '';
    const counts = await Promise.all(pub.map(c => store().getCourse(c.id).then(d => d.lessons.length).catch(() => 0)));
    return `<h3 class="sec">My courses</h3><div class="cgrid">${pub.map((c, i) => { const done = prog.filter(p => p.course_id === c.id).length;
      return `<a class="ccard" href="#course-${E(c.id)}" style="--c:${E(c.color)}"><b>${E(c.title)}</b><small>${E(subj(c.subject_id).name)}${c.grade ? ' · ' + E(c.grade) : ''}</small>${ui.bar(done, counts[i], c.color)}<small>${done} of ${counts[i]} lessons done</small></a>`; }).join('')}</div>`;
  } catch (e) { return ''; }
};

/* ---------- Catalog ---------- */
STEM.pages.push({
  name: 'learn', match: r => r === 'learn' ? {} : null, roles: ['student', 'teacher', 'admin'],
  async render(el) {
    const staff = ui.isStaff();
    el.innerHTML = ui.band('Courses', 'Short courses that combine lessons, videos, labs, assignments and exams.', '#1f3f99') + `<div class="band"><div class="wrap">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.band:last-child .wrap');
    const [courses, prog] = await Promise.all([store().listCourses(), store().myLessonProgress()]);
    const details = await Promise.all(courses.map(c => store().getCourse(c.id).catch(() => ({ lessons: [], assignments: [] }))));
    wrap.innerHTML = `${staff ? '<div class="row end"><a class="btn y" href="#course-edit-new">+ New course</a></div>' : ''}
      ${courses.length ? `<div class="cgrid big">${courses.map((c, i) => { const n = details[i].lessons.length, done = prog.filter(p => p.course_id === c.id).length;
        return `<a class="ccard" href="#course-${E(c.id)}" style="--c:${E(c.color)}"><span class="ctop"></span><small>${E(subj(c.subject_id).name)}${c.grade ? ' · ' + E(c.grade) : ''}${c.published ? '' : ' · <b>Draft</b>'}</small><b>${E(c.title)}</b><span class="cdesc">${E(c.description)}</span>
          <small>${n} lessons${details[i].assignments.length ? ` · ${details[i].assignments.length} assignment${details[i].assignments.length > 1 ? 's' : ''}` : ''}</small>${ui.bar(done, n, c.color)}<small>${done} of ${n} lessons done</small></a>`; }).join('')}</div>`
        : `<p class="empty">No courses yet.${staff ? ' Create the first one.' : ''}</p>`}`;
  }
});

/* ---------- Course page ---------- */
STEM.pages.push({
  name: 'course', match: r => r.startsWith('course-') && !r.startsWith('course-edit-') && !r.startsWith('course-report-') ? { id: r.slice(7) } : null, roles: ['student', 'teacher', 'admin'],
  async render(el, { id }) {
    const staff = ui.isStaff();
    let d; try { d = await store().getCourse(id); } catch (e) { el.innerHTML = ui.band('Course not found') + '<div class="band"><div class="wrap"><a href="#learn">All courses</a></div></div>'; return; }
    const { course: c, lessons, assignments } = d;
    const [prog, subs] = await Promise.all([store().myLessonProgress(), store().mySubmissions()]);
    const done = new Set(prog.filter(p => p.course_id === id).map(p => p.lesson_id)), next = lessons.find(l => !done.has(l.id)) || lessons[0];
    const sub = aid => subs.find(s => s.assignment_id === aid);
    el.innerHTML = ui.band(E(c.title), `${E(subj(c.subject_id).name)}${c.grade ? ' · ' + E(c.grade) : ''}${c.published ? '' : ' · Draft'}`, c.color) + `<div class="band"><div class="wrap">
      <div class="row between"><a class="btn ghost" href="#learn">← All courses</a>${staff ? `<div class="row"><a class="btn ghost" href="#course-report-${E(id)}">Progress report</a><a class="btn" href="#course-edit-${E(id)}">Edit course</a><button class="btn ghost del">Delete</button></div>` : ''}</div>
      <div class="coursehead"><div><p class="lead">${E(c.description)}</p>${ui.bar(done.size, lessons.length, c.color)}<p class="note">${done.size} of ${lessons.length} lessons done</p></div>
        ${next ? `<a class="btn y big" href="#lesson-${E(id)}-${E(next.id)}">${done.size ? 'Continue' : 'Start course'}</a>` : ''}</div>
      <h3 class="sec">Lessons</h3>
      <ol class="lessonlist">${lessons.map(l => `<li class="${done.has(l.id) ? 'done' : ''}"><a href="#lesson-${E(id)}-${E(l.id)}"><span class="lk">${done.has(l.id) ? '✓' : ''}</span><b>${E(l.title)}</b><small>${l.minutes} min${l.video_url ? ' · video' : ''}${l.lab_id ? ' · lab' : ''}${l.exam_id ? ' · exam' : ''}</small></a></li>`).join('') || '<li class="empty">No lessons yet.</li>'}</ol>
      ${assignments.length ? `<h3 class="sec">Assignments</h3><div class="alist">${assignments.map(a => { const s = sub(a.id);
        return `<a class="acard" href="#assignment-${E(a.id)}"><b>${E(a.title)}</b><small>${a.points} points${a.due_date ? ' · Due ' + fmtDate(a.due_date) : ''}${a.published ? '' : ' · hidden'}</small>${staff ? '<span class="badge soft">Mark work →</span>' : s ? (s.grade != null ? `<span class="badge ok">Graded ${s.grade}/${a.points}</span>` : '<span class="badge">Submitted</span>') : '<span class="badge soft">Not submitted</span>'}</a>`; }).join('')}</div>` : ''}
    </div></div>`;
    const del = el.querySelector('.del');
    if (del) del.onclick = async () => { if (!await ui.confirm('Delete this course with all its lessons, assignments and student work?', 'Delete', true)) return; try { await store().deleteCourse(id); ui.toast('Course deleted'); location.hash = 'learn'; } catch (e) { ui.toast(ui.err(e), 'bad'); } };
  }
});

/* ---------- Lesson ---------- */
STEM.pages.push({
  name: 'lesson', match: r => { if (!r.startsWith('lesson-')) return null; const rest = r.slice(7); return UUID.test(rest.slice(0, 36)) && rest[36] === '-' ? { cid: rest.slice(0, 36), lid: rest.slice(37) } : null; }, roles: ['student', 'teacher', 'admin'],
  async render(el, { cid, lid }) {
    let d; try { d = await store().getCourse(cid); } catch (e) { el.innerHTML = ui.band('Lesson not found'); return; }
    const { course: c, lessons } = d, i = lessons.findIndex(l => l.id === lid), l = lessons[i];
    if (!l) { el.innerHTML = ui.band('Lesson not found') + `<div class="band"><div class="wrap"><a href="#course-${E(cid)}">Back to the course</a></div></div>`; return; }
    const prog = await store().myLessonProgress(); const done = new Set(prog.map(p => p.lesson_id));
    const lab = l.lab_id && STEM.state.labs.find(x => x.id === l.lab_id);
    let exam = null; if (l.exam_id) { try { exam = (await store().listExams()).find(e => e.id === l.exam_id && (e.published || ui.isStaff())); } catch (e) {} }
    const vid = embedURL(l.video_url), prev = lessons[i - 1], next = lessons[i + 1];
    el.innerHTML = `<div class="band lessonband" style="--c:${E(c.color)}"><div class="wrap lessonwrap">
      <aside class="lside"><a href="#course-${E(cid)}" class="ctitle">← ${E(c.title)}</a><ol>${lessons.map(x => `<li class="${x.id === lid ? 'cur' : ''} ${done.has(x.id) ? 'done' : ''}"><a href="#lesson-${E(cid)}-${E(x.id)}"><span class="lk">${done.has(x.id) ? '✓' : ''}</span>${E(x.title)}</a></li>`).join('')}</ol></aside>
      <article class="lmain">
        <small class="muted">Lesson ${i + 1} of ${lessons.length} · ${l.minutes} min</small><h2>${E(l.title)}</h2>
        ${vid ? `<div class="embed video"><iframe src="${E(vid)}" title="${E(l.title)}" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
        <div class="lbody">${ui.richText(l.body)}</div>
        ${lab ? `<a class="linkcard" href="#${E(lab.id)}" style="--c:${E(subj(lab.subject_id).color)}"><small>Lab for this lesson</small><b>${E(lab.title)}</b><span>Open the lab →</span></a>` : ''}
        ${exam ? `<a class="linkcard" href="#exam-${E(exam.id)}" style="--c:#5a3fa8"><small>Check your understanding</small><b>${E(exam.title)}</b><span>Take the exam →</span></a>` : ''}
        ${resourcesHTML(l.resources)}
        <div class="row between lnav"><div>${prev ? `<a class="btn ghost" href="#lesson-${E(cid)}-${E(prev.id)}">← Previous lesson</a>` : ''}</div>
          <div class="row"><button class="btn ghost askl">✦ Ask the tutor</button><button class="btn ${done.has(l.id) ? 'ghost' : 'y'} mk">${done.has(l.id) ? '✓ Lesson complete' : 'Mark as complete'}</button>${next ? `<a class="btn" href="#lesson-${E(cid)}-${E(next.id)}">Next lesson →</a>` : `<a class="btn" href="#course-${E(cid)}">Back to the course</a>`}</div></div>
      </article></div></div>`;
    el.querySelector('.mk').onclick = async e => {
      try {
        if (done.has(l.id)) { await store().uncompleteLesson(l.id); done.delete(l.id); }
        else { await store().completeLesson(l.id, cid); done.add(l.id); ui.toast(next ? 'Lesson complete. On to the next one!' : 'Course finished. Well done!'); }
        STEM.route({ keepScroll: true });
      } catch (er) { ui.toast(ui.err(er), 'bad'); }
    };
    el.querySelector('.askl').onclick = () => STEM.tutor.open({ subjectId: c.subject_id || null, labId: l.lab_id || null, context: `${l.title}\n${l.body}` });
  }
});

/* ---------- Assignment (students answer, teachers mark) ---------- */
STEM.pages.push({
  name: 'assignment', match: r => r.startsWith('assignment-') ? { id: r.slice(11) } : null, roles: ['student', 'teacher', 'admin'],
  async render(el, { id }) {
    let d; try { d = await store().getAssignment(id); } catch (e) { el.innerHTML = ui.band('Assignment not found'); return; }
    const { assignment: a, course: c } = d;
    const head = ui.band(E(a.title), `${E(c ? c.title : '')} · ${a.points} points${a.due_date ? ' · Due ' + fmtDate(a.due_date) : ''}`, c ? c.color : undefined);
    const back = c ? `<a class="btn ghost" href="#course-${E(c.id)}">← ${E(c.title)}</a>` : '';
    if (ui.isStaff()) {
      const [subs, people] = await Promise.all([store().submissionsFor(id), store().listProfiles()]);
      const who = u => people.find(p => p.id === u) || { full_name: 'Deleted user', grade: '' };
      const students = people.filter(p => p.role === 'student').length;
      el.innerHTML = head + `<div class="band"><div class="wrap">${back}
        <div class="out task"><b>Instructions</b>${ui.richText(a.instructions)}</div>
        <div class="stats four"><div class="stat"><small>Submitted</small><b>${subs.length} / ${students}</b></div><div class="stat"><small>Marked</small><b>${subs.filter(s => s.grade != null).length}</b></div><div class="stat"><small>Average</small><b>${subs.some(s => s.grade != null) ? Math.round(10 * subs.filter(s => s.grade != null).reduce((t, s) => t + s.grade, 0) / subs.filter(s => s.grade != null).length) / 10 + ' / ' + a.points : '—'}</b></div><div class="stat"><small>Points</small><b>${a.points}</b></div></div>
        <h3 class="sec">Submissions</h3>
        ${subs.length ? subs.sort((x, y) => (x.grade != null) - (y.grade != null) || String(y.submitted_at).localeCompare(String(x.submitted_at))).map(s => `<div class="card subcard" data-id="${E(s.id)}">
          <div class="row between"><b>${E(who(s.user_id).full_name)} <small class="muted">${E(who(s.user_id).grade)}</small></b><small class="muted">Submitted ${fmtDate(s.submitted_at)}</small></div>
          <div class="answerbox">${E(s.answer).replace(/\n/g, '<br>')}</div>
          <div class="gradeRow"><label class="inline">Grade <input type="number" class="gv" min="0" max="${a.points}" value="${s.grade ?? ''}"> / ${a.points}</label>
          <label class="grow">Feedback<textarea class="fbk" rows="2">${E(s.feedback || '')}</textarea></label><button class="btn ${s.grade != null ? 'ghost' : 'y'} sg">Save grade</button></div></div>`).join('') : '<p class="empty">No one has submitted yet.</p>'}
      </div></div>`;
      el.querySelectorAll('.subcard').forEach(card => card.querySelector('.sg').onclick = async () => {
        const g = card.querySelector('.gv').value; if (g === '' || +g < 0 || +g > a.points) { ui.toast(`Enter a grade from 0 to ${a.points}`, 'bad'); return; }
        try { await store().gradeSubmission(card.dataset.id, Math.round(+g), card.querySelector('.fbk').value.trim()); ui.toast('Grade saved'); card.querySelector('.sg').className = 'btn ghost sg'; } catch (e) { ui.toast(ui.err(e), 'bad'); }
      });
      return;
    }
    const mine = (await store().mySubmissions()).find(s => s.assignment_id === id), graded = mine && mine.grade != null;
    el.innerHTML = head + `<div class="band"><div class="wrap narrow2">${back}
      <div class="out task"><b>Instructions</b>${ui.richText(a.instructions)}</div>
      ${graded ? `<div class="out okbox"><p class="eq">Grade: ${mine.grade} / ${a.points}</p>${mine.feedback ? `<p><b>Feedback from your teacher:</b> ${E(mine.feedback)}</p>` : ''}</div>` : ''}
      <form class="card stackform"><label>Your answer<textarea name="ans" rows="10" ${graded ? 'disabled' : ''}>${E(mine ? mine.answer : '')}</textarea></label>
        ${graded ? '<p class="note">This work has been marked, so it can no longer be changed.</p>' : `<div class="row between"><span class="note">${mine ? 'Submitted ' + fmtDate(mine.submitted_at) + '. You can update your answer until it is marked.' : 'Not submitted'}</span><button class="btn y">${mine ? 'Update answer' : 'Submit'}</button></div>`}
      </form><p class="note">Write in your own words. You may ask the AI tutor for hints, but your teacher wants to see your thinking.</p></div></div>`;
    const f = el.querySelector('form');
    f.onsubmit = async e => { e.preventDefault(); const ans = f.ans.value.trim(); if (!ans) { ui.toast('Write your answer first', 'bad'); return; }
      try { await store().submitAssignment(id, ans); ui.toast('Submitted. Your teacher will mark it.'); STEM.route({ keepScroll: true }); } catch (er) { ui.toast(ui.err(er), 'bad'); } };
  }
});

/* ---------- Course editor (teachers) ---------- */
STEM.pages.push({
  name: 'course-edit', match: r => r.startsWith('course-edit-') ? { id: r.slice(12) } : null, roles: ['teacher', 'admin'],
  async render(el, { id }) {
    let c = { title: '', subject_id: STEM.state.subjects[0] ? STEM.state.subjects[0].id : '', grade: '', description: '', color: '#1f3f99', published: false, position: 0 }, lessons = [], asg = [];
    if (id !== 'new') { try { const d = await store().getCourse(id); c = d.course; lessons = d.lessons.map(x => ({ ...x })); asg = d.assignments.map(x => ({ ...x })); } catch (e) { el.innerHTML = ui.band('Course not found'); return; } }
    if (!lessons.length) lessons.push({ title: '', body: '', video_url: '', resources: '', lab_id: '', exam_id: null, minutes: 10 });
    const exams = await store().listExams().catch(() => []);
    el.innerHTML = ui.band(id === 'new' ? 'New course' : 'Edit course', 'Lessons can have text, a video, links, a lab and an exam. Students mark each lesson complete.') + `<div class="band"><div class="wrap">
      <form class="card editor cform"><div class="grid2">
        <label>Title<input name="title" required maxlength="120"></label>
        <label>Subject<select name="subject_id"><option value="">General</option>${STEM.state.subjects.map(s => `<option value="${E(s.id)}">${E(s.name)}</option>`).join('')}</select></label>
        <label>For grade<input name="grade" maxlength="30" placeholder="e.g. Grade 9–10"></label>
        <label>Colour<input name="color" type="color"></label></div>
        <label>Short description<textarea name="description" rows="2" maxlength="500"></textarea></label>
        <label class="check"><input type="checkbox" name="published"> Published (students can see it)</label></form>
      <div class="row between"><h3 class="sec">Lessons</h3><button class="btn ghost addl">+ Add lesson</button></div><ol class="qedit les"></ol>
      <div class="row between"><h3 class="sec">Assignments</h3><button class="btn ghost adda">+ Add assignment</button></div><ol class="qedit asg"></ol>
      <div class="row end"><a class="btn ghost" href="${id === 'new' ? '#learn' : '#course-' + E(id)}">Cancel</a><button class="btn y save">Save course</button></div>
    </div></div>`;
    const f = el.querySelector('.cform');
    ['title', 'subject_id', 'grade', 'description', 'color'].forEach(k => f[k].value = c[k] || ''); f.published.checked = !!c.published;
    const labOpts = sel => `<option value="">None</option>${STEM.state.subjects.map(s => `<optgroup label="${E(s.name)}">${ui.labsOf(s.id, true).map(l => `<option value="${E(l.id)}" ${l.id === sel ? 'selected' : ''}>${E(l.title)}</option>`).join('')}</optgroup>`).join('')}`;
    const examOpts = sel => `<option value="">None</option>${exams.map(e => `<option value="${E(e.id)}" ${e.id === sel ? 'selected' : ''}>${E(e.title)}${e.published ? '' : ' (draft)'}</option>`).join('')}`;
    const move = (arr, i, d, draw) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; draw(); };
    const drawL = () => {
      const box = el.querySelector('.les');
      box.innerHTML = lessons.map((l, i) => `<li class="card qitem" data-i="${i}"><div class="row between"><b>Lesson ${i + 1}</b><div class="row tight"><button class="btn ghost sm up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn ghost sm dn" ${i < lessons.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button class="btn ghost sm rm">Remove</button></div></div>
        <div class="grid2"><label>Title<input class="lt" value="${E(l.title)}"></label><label>Minutes<input class="lm" type="number" min="1" max="240" value="${l.minutes || 10}"></label></div>
        <label>Lesson text <small class="muted">(lines starting 1. 2. make numbered steps; lines starting - make bullets)</small><textarea class="lb" rows="6">${E(l.body || '')}</textarea></label>
        <div class="grid2"><label>Video link (YouTube or https)<input class="lv" value="${E(l.video_url || '')}" placeholder="https://www.youtube.com/watch?v=…"></label>
          <label>Lab for this lesson<select class="ll">${labOpts(l.lab_id)}</select></label>
          <label>Exam for this lesson<select class="le">${examOpts(l.exam_id)}</select></label>
          <label>Resources <small class="muted">(one per line: Title | https://link)</small><textarea class="lr" rows="2">${E(l.resources || '')}</textarea></label></div></li>`).join('');
      box.querySelectorAll('.qitem').forEach(li => { const i = +li.dataset.i, l = lessons[i];
        li.querySelector('.lt').oninput = e => l.title = e.target.value; li.querySelector('.lm').oninput = e => l.minutes = +e.target.value || 10;
        li.querySelector('.lb').oninput = e => l.body = e.target.value; li.querySelector('.lv').oninput = e => l.video_url = e.target.value.trim();
        li.querySelector('.ll').onchange = e => l.lab_id = e.target.value; li.querySelector('.le').onchange = e => l.exam_id = e.target.value || null;
        li.querySelector('.lr').oninput = e => l.resources = e.target.value;
        li.querySelector('.up').onclick = () => move(lessons, i, -1, drawL); li.querySelector('.dn').onclick = () => move(lessons, i, 1, drawL);
        li.querySelector('.rm').onclick = async () => { if (l.id && !await ui.confirm('Remove this lesson? Students’ progress on it will be lost when you save.', 'Remove', true)) return; lessons.splice(i, 1); drawL(); }; });
    };
    const drawA = () => {
      const box = el.querySelector('.asg');
      box.innerHTML = asg.map((a, i) => `<li class="card qitem" data-i="${i}"><div class="row between"><b>Assignment ${i + 1}</b><div class="row tight"><button class="btn ghost sm up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn ghost sm dn" ${i < asg.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button class="btn ghost sm rm">Remove</button></div></div>
        <label>Title<input class="at" value="${E(a.title)}"></label><label>Instructions<textarea class="ai" rows="4">${E(a.instructions || '')}</textarea></label>
        <div class="grid2"><label>Due date (optional)<input class="ad" type="date" value="${E(a.due_date || '')}"></label><label>Points<input class="ap" type="number" min="1" max="100" value="${a.points || 10}"></label></div>
        <label class="check"><input type="checkbox" class="apub" ${a.published !== false ? 'checked' : ''}> Visible to students</label></li>`).join('') || '<p class="empty">No assignments. They are optional.</p>';
      box.querySelectorAll('.qitem').forEach(li => { const i = +li.dataset.i, a = asg[i];
        li.querySelector('.at').oninput = e => a.title = e.target.value; li.querySelector('.ai').oninput = e => a.instructions = e.target.value;
        li.querySelector('.ad').onchange = e => a.due_date = e.target.value || null; li.querySelector('.ap').oninput = e => a.points = +e.target.value || 10;
        li.querySelector('.apub').onchange = e => a.published = e.target.checked;
        li.querySelector('.up').onclick = () => move(asg, i, -1, drawA); li.querySelector('.dn').onclick = () => move(asg, i, 1, drawA);
        li.querySelector('.rm').onclick = async () => { if (a.id && !await ui.confirm('Remove this assignment and all student answers to it when you save?', 'Remove', true)) return; asg.splice(i, 1); drawA(); }; });
    };
    drawL(); drawA();
    el.querySelector('.addl').onclick = () => { lessons.push({ title: '', body: '', video_url: '', resources: '', lab_id: '', exam_id: null, minutes: 10 }); drawL(); el.querySelector('.les').lastElementChild.querySelector('.lt').focus(); };
    el.querySelector('.adda').onclick = () => { asg.push({ title: '', instructions: '', due_date: null, points: 10, published: true }); drawA(); el.querySelector('.asg').lastElementChild.querySelector('.at').focus(); };
    el.querySelector('.save').onclick = async () => {
      const data = { id: id === 'new' ? null : id, title: f.title.value.trim(), subject_id: f.subject_id.value, grade: f.grade.value.trim(), description: f.description.value.trim(), color: f.color.value, published: f.published.checked, position: c.position || 0 };
      if (!data.title) { ui.toast('Give the course a title', 'bad'); f.title.focus(); return; }
      const ls = lessons.filter(l => (l.title || '').trim()), as = asg.filter(a => (a.title || '').trim());
      if (!ls.length) { ui.toast('Add at least one lesson with a title', 'bad'); return; }
      const bad = ls.find(l => l.video_url && !/^https:\/\//i.test(l.video_url)); if (bad) { ui.toast(`The video link in "${bad.title}" must start with https://`, 'bad'); return; }
      try { const nid = await store().saveCourse(data, ls, as); ui.toast(data.published ? 'Course saved and published' : 'Course saved as draft'); location.hash = 'course-' + nid; }
      catch (e) { ui.toast(ui.err(e), 'bad'); }
    };
  }
});

/* ---------- Course progress report (teachers) ---------- */
STEM.pages.push({
  name: 'course-report', match: r => r.startsWith('course-report-') ? { id: r.slice(14) } : null, roles: ['teacher', 'admin'],
  async render(el, { id }) {
    let d; try { d = await store().getCourse(id); } catch (e) { el.innerHTML = ui.band('Course not found'); return; }
    const [prog, subs, people] = await Promise.all([store().allLessonProgress(), store().allSubmissions(), store().listProfiles()]);
    const { course: c, lessons, assignments } = d, aIds = new Set(assignments.map(a => a.id));
    const rows = people.filter(p => p.role === 'student').map(p => { const lp = prog.filter(x => x.user_id === p.id && x.course_id === id), ss = subs.filter(s => s.user_id === p.id && aIds.has(s.assignment_id)), g = ss.filter(s => s.grade != null);
      const pts = g.reduce((t, s) => t + s.grade, 0), max = g.reduce((t, s) => t + ((assignments.find(a => a.id === s.assignment_id) || {}).points || 0), 0);
      return { p, done: lp.length, subs: ss.length, marked: g.length, pct: max ? Math.round(100 * pts / max) : null }; }).sort((a, b) => b.done - a.done || a.p.full_name.localeCompare(b.p.full_name));
    el.innerHTML = ui.band(`Progress: ${E(c.title)}`, `${lessons.length} lessons · ${assignments.length} assignments`, c.color) + `<div class="band"><div class="wrap">
      <div class="row between"><a class="btn ghost" href="#course-${E(id)}">← Course</a><button class="btn ghost csv">Download CSV</button></div>
      <div class="stats four"><div class="stat"><small>Students started</small><b>${rows.filter(r => r.done).length} / ${rows.length}</b></div><div class="stat"><small>Finished all lessons</small><b>${rows.filter(r => lessons.length && r.done >= lessons.length).length}</b></div><div class="stat"><small>Assignments submitted</small><b>${subs.filter(s => aIds.has(s.assignment_id)).length}</b></div><div class="stat"><small>Waiting to be marked</small><b>${subs.filter(s => aIds.has(s.assignment_id) && s.grade == null).length}</b></div></div>
      ${ui.table([{ h: 'Student', v: r => `<a href="#student-${E(r.p.id)}">${E(r.p.full_name)}</a>` }, { h: 'Grade', v: r => E(r.p.grade) },
        { h: 'Lessons done', v: r => `${ui.bar(r.done, lessons.length || 1, c.color)}<small>${r.done} / ${lessons.length}</small>` },
        { h: 'Assignments', v: r => `${r.subs} / ${assignments.length}${r.marked ? ` (${r.marked} marked)` : ''}`, cls: 'num' }, { h: 'Assignment score', v: r => r.pct == null ? '—' : r.pct + '%', cls: 'num' }], rows, 'No students yet.')}
      ${assignments.length ? `<h3 class="sec">Mark assignments</h3><div class="alist">${assignments.map(a => `<a class="acard" href="#assignment-${E(a.id)}"><b>${E(a.title)}</b><small>${subs.filter(s => s.assignment_id === a.id).length} submitted · ${subs.filter(s => s.assignment_id === a.id && s.grade == null).length} to mark</small></a>`).join('')}</div>` : ''}
    </div></div>`;
    el.querySelector('.csv').onclick = () => ui.download(`${c.title.replace(/\W+/g, '-')}-progress.csv`, ui.csv([['Student', 'Username', 'Grade', 'Lessons done', 'Lessons total', 'Assignments submitted', 'Assignments marked', 'Assignment score %'], ...rows.map(r => [r.p.full_name, r.p.username, r.p.grade, r.done, lessons.length, r.subs, r.marked, r.pct ?? ''])]));
  }
});
})();
