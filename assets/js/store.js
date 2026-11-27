/* Data layer. Two versions with the same functions:
   - LIVE: Supabase (when STEM.CONFIG.supabaseUrl is filled in)
   - DEMO: everything saved in this browser only, so the site can be tried before Supabase is set up.
   Pages only ever call STEM.store.<function>(), so they work the same with either. */
(() => {
const CFG = STEM.CONFIG;
const COMPLETE_SECONDS = 120, COMPLETE_INTERACTIONS = 10;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowISO = () => new Date().toISOString();
const listeners = STEM.userListeners = [];
const emit = u => listeners.forEach(f => { try { f(u); } catch (e) { console.error(e); } });
const levelFor = s => { let l = 0; if (s.labs_total > 0 && s.labs_opened >= s.labs_total) l = 1; if (l === 1 && s.labs_completed >= s.labs_total && s.exams_passed >= 1) l = 2; if (l === 2 && s.exams_passed >= 2 && s.avg_best >= 85) l = 3; return l; };

/* =================================================================== DEMO */
function demoStore() {
  const KEY = 'dscDemoDB_v4', SKEY = 'dscDemoSession';
  let db;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const code = (sub, l) => 'DSC-' + (sub === 'all' ? 'STEM-S' : sub.slice(0, 4).toUpperCase() + '-' + l) + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  function seed() {
    const subjects = STEM.DEFAULT_SUBJECTS.map((s, i) => ({ ...s, position: i + 1, published: true }));
    const labs = STEM.SIMS.map((x, i) => ({ id: x.id, subject_id: x.subject, kind: 'builtin', title: x.title, level: x.level, blurb: x.blurb, instructions: '', embed_url: '', position: i + 1, published: true }));
    labs.push({ id: 'phet-circuit-kit', subject_id: 'electricity', kind: 'embed', title: 'Circuit construction kit (PhET)', level: 'Grade 9–12', blurb: 'Build any circuit you like with wires, batteries, bulbs and switches. A free simulation from the University of Colorado.', instructions: 'Build a circuit with one battery and two bulbs in series. Then rebuild it in parallel. Which bulbs are brighter, and why?', embed_url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html', position: 30, published: true });
    subjects.push({ id: 'coding', name: 'Coding', am: 'ፕሮግራሚንግ', color: '#0e8a8a', description: 'Write real Python in your browser: solve science and maths problems with code, and get your work checked straight away.', position: 5, published: true, ai_enabled: true, ai_instructions: '' });
    STEM.SEED_CODE_LABS.forEach((l, i) => labs.push({ ...l, subject_id: 'coding', kind: 'code', embed_url: '', position: i + 1, published: true }));
    labs.push({ id: 'hands-on-fizz', subject_id: 'chemistry', kind: 'guide', title: 'Hands-on: vinegar and baking soda', level: 'Grade 9', blurb: 'A safe real experiment to do in class after the reaction mixer.', instructions: 'You need: vinegar, baking soda, a clear cup, a spoon, a balloon and a small bottle.\n1. Put two spoons of baking soda in the cup.\n2. Predict what will happen when you add vinegar. Write it down.\n3. Slowly pour in half a cup of vinegar and watch.\n4. Now put baking soda inside a balloon, vinegar in the bottle, and stretch the balloon over the bottle neck.\n5. Lift the balloon so the powder falls in. What fills the balloon?\nSafety: wear goggles and do not taste anything.', embed_url: '', position: 30, published: true });
    const U = (username, password, full_name, role, grade) => ({ id: uid(), username, password, full_name, role, grade, created_at: nowISO() });
    const users = [U('elizabeth', 'admin123', 'Elizabeth Genetu', 'admin', ''), U('teacher', 'teacher123', 'Demo Teacher', 'teacher', ''),
      U('abebe', 'student123', 'Abebe Kebede', 'student', 'Grade 10'), U('hana', 'student123', 'Hana Mekonnen', 'student', 'Grade 9'),
      U('dawit', 'student123', 'Dawit Alemu', 'student', 'Grade 10'), U('meron', 'student123', 'Meron Tesfaye', 'student', 'Grade 11')];
    const teacher = users[1].id;
    const Q = (question, options, answer, points = 1) => ({ id: uid(), question, options, answer, points });
    const exams = [], questions = [];
    const addExam = (e, qs) => { const id = uid(); exams.push({ id, grade: '', description: '', time_limit: 15, pass_mark: 60, max_attempts: 2, published: true, created_by: teacher, created_at: nowISO(), updated_at: nowISO(), ...e }); qs.forEach((q, i) => questions.push({ ...q, exam_id: id, position: i })); return id; };
    const chem = addExam({ title: 'Chemistry basics', subject_id: 'chemistry', grade: 'Grade 9–10', description: 'Reactions, acids and the pH scale.' }, [
      Q('What gas is given off when an acid reacts with baking soda?', ['Oxygen', 'Hydrogen', 'Carbon dioxide', 'Nitrogen'], 2),
      Q('What is the pH of pure water?', ['0', '7', '10', '14'], 1),
      Q('Which of these is a sign that a chemical reaction has happened?', ['The liquid is poured', 'A precipitate forms', 'The beaker is moved', 'The lid is closed'], 1),
      Q('Iron displaces copper from copper(II) sulfate because…', ['iron is more reactive than copper', 'copper is more reactive than iron', 'the solution is blue', 'iron is heavier'], 0),
      Q('Lemon juice has a pH of about 2. It is…', ['strongly acidic', 'neutral', 'weakly alkaline', 'strongly alkaline'], 0, 2)]);
    const elec = addExam({ title: 'Circuits check', subject_id: 'electricity', grade: 'Grade 9–10', description: 'Ohm’s law, series and parallel circuits.', time_limit: 10 }, [
      Q('A 12 V battery drives current through a 4 Ω resistor. What is the current?', ['48 A', '3 A', '0.33 A', '16 A'], 1),
      Q('In a series circuit, the current through each bulb is…', ['the same', 'different', 'zero', 'doubled'], 0),
      Q('Adding another bulb in parallel makes the total resistance…', ['bigger', 'smaller', 'stay the same'], 1)]);
    addExam({ title: 'Biology practice', subject_id: 'biology', description: 'Practice as many times as you like.', max_attempts: 0, time_limit: 0 }, [
      Q('Diffusion moves particles from…', ['low to high concentration', 'high to low concentration'], 1),
      Q('Raising the temperature makes diffusion…', ['slower', 'faster', 'stop'], 1)]);
    addExam({ title: 'Graphs and trigonometry (draft)', subject_id: 'math', published: false }, [Q('sin 90° = ?', ['0', '1', '−1'], 1)]);
    // some history so the teacher pages have something to show
    const progress = [], attempts = [];
    const P = (u, lab, sub, secs, inter) => progress.push({ user_id: u.id, lab_id: lab, subject_id: sub, seconds: secs, interactions: inter, completed: secs >= COMPLETE_SECONDS && inter >= COMPLETE_INTERACTIONS, first_at: nowISO(), last_at: new Date(Date.now() - Math.random() * 5 * 864e5).toISOString() });
    const [ , , abebe, hana, dawit, meron] = users;
    P(abebe, 'reaction-mixer', 'chemistry', 300, 40); P(abebe, 'ph-scale', 'chemistry', 200, 25); P(abebe, 'hands-on-fizz', 'chemistry', 60, 0); P(abebe, 'circuit-builder', 'electricity', 90, 12);
    P(hana, 'reaction-mixer', 'chemistry', 150, 15); P(hana, 'predator-prey', 'biology', 400, 30);
    P(dawit, 'circuit-builder', 'electricity', 500, 60); P(dawit, 'ohms-law', 'electricity', 260, 22); P(dawit, 'phet-circuit-kit', 'electricity', 600, 0);
    P(meron, 'graph-transformer', 'math', 180, 40);
    const A = (u, exam, pct) => { const qs = questions.filter(q => q.exam_id === exam); const max = qs.reduce((s, q) => s + q.points, 0); const score = Math.round(max * pct / 100); let left = score; const detail = qs.map(q => { const ok = left >= q.points; if (ok) left -= q.points; return { id: q.id, chosen: ok ? q.answer : (q.answer + 1) % q.options.length, correct: ok }; }); attempts.push({ id: uid(), exam_id: exam, user_id: u.id, answers: {}, detail, score, max_score: max, percent: Math.round(1000 * score / max) / 10, passed: 100 * score / max >= 60, started_at: nowISO(), submitted_at: new Date(Date.now() - Math.random() * 4 * 864e5).toISOString() }); };
    A(abebe, chem, 83); A(hana, chem, 50); A(dawit, elec, 100); A(meron, chem, 66);
    const c1 = uid(), c2 = uid(), L = (course_id, position, title, body, lab_id = '', minutes = 10, exam_id = null) => ({ id: uid(), course_id, position, title, body, video_url: '', resources: '', lab_id, exam_id, minutes });
    const courses = [
      { id: c1, title: 'Electricity basics', subject_id: 'electricity', grade: 'Grade 9–10', description: 'Current, voltage and resistance in four short lessons, with simulations, a coding task, an assignment and an exam.', color: '#e9a400', published: true, position: 1, created_at: nowISO() },
      { id: c2, title: 'Start coding with Python', subject_id: 'coding', grade: 'Grade 9', description: 'Your first steps in Python: variables, functions and loops, all in the browser.', color: '#0e8a8a', published: true, position: 2, created_at: nowISO() }];
    const lessons = [
      L(c1, 1, 'What is electric current?', 'Electric current is a flow of electric charge. In metal wires, the charges that move are tiny particles called electrons.\nWe measure current in amperes (A) with an ammeter.\nKey ideas:\n- A circuit must be a complete loop for current to flow.\n- A switch opens or closes the loop.\n- More current through a bulb makes it brighter.\nOpen the circuit builder and open and close the switch. Watch the electrons stop and start.', 'circuit-builder'),
      L(c1, 2, 'Voltage and resistance: Ohm\'s law', 'Voltage (V, in volts) is the push that drives the current. Resistance (R, in ohms Ω) is how much a component resists the current.\nOhm\'s law links them: V = I × R, so I = V ÷ R.\nExample: a 12 V battery and a 4 Ω resistor give I = 12 ÷ 4 = 3 A.\nIn the Ohm\'s law lab, take at least three readings and find the mystery resistance from the graph.', 'ohms-law', 15),
      L(c1, 3, 'Series and parallel circuits', 'In a series circuit there is one path: the same current flows through every bulb, and resistances add up.\nIn a parallel circuit each bulb has its own path: each gets the full battery voltage, and if one bulb breaks the others stay on.\nThat is why the lights in a house are connected in parallel.', 'circuit-builder', 15, elec),
      L(c1, 4, 'Build it with code', 'Scientists and engineers use code to do calculations quickly.\nWrite a Python calculator for current and power in the coding exercise.', 'py-ohms-law', 15),
      L(c2, 1, 'Your first program', 'A program is a list of instructions for the computer.\n1. Open the Python playground.\n2. Run the "Hello and input" example.\n3. Change the message and run it again.\nprint() shows text on the screen. input() asks the user a question.', '', 10),
      L(c2, 2, 'Functions: the class average', 'A function is a named set of instructions that takes inputs and gives back a result.\nIn the exercise, finish the function average(marks). Use sum() and len().', 'py-average', 15),
      L(c2, 3, 'Loops and prime numbers', 'A for loop repeats instructions. Use one to test whether a number can be divided by smaller numbers.', 'py-primes', 20)];
    const assignments = [{ id: uid(), course_id: c1, position: 1, title: 'Electricity at home', instructions: 'Look at the electrical things in your home or school.\n1. Name three devices and say what they change electrical energy into.\n2. Are the lights in your home in series or in parallel? How do you know?\n3. Give one rule for using electricity safely.', due_date: null, points: 10, published: true, created_at: nowISO() }];
    const lesson_progress = [lessons[0], lessons[1]].map(l => ({ user_id: abebe.id, lesson_id: l.id, course_id: c1, completed_at: nowISO() }));
    const submissions = [{ id: uid(), assignment_id: assignments[0].id, user_id: hana.id, answer: '1. TV: light and sound. Iron: heat. Fan: movement.\n2. Parallel, because when one bulb breaks the others stay on.\n3. Never touch sockets with wet hands.', submitted_at: nowISO(), grade: null, feedback: '', graded_at: null }];
    return { courses, lessons, lesson_progress, assignments, submissions, settings: { ai: { enabled: true, student_daily: 20, teacher_daily: 100 }, ai_models: STEM.DEFAULT_AI_MODELS }, aiUsage: [], subjects, labs, news: [
      { id: uid(), date: new Date().toISOString().slice(0, 10), tag: 'News', title: 'Student accounts are here', body: 'Log in to track your lab progress, take exams and earn Dangila STEM certificates.', link: '#login', link_text: 'Log in' },
      { id: uid(), date: new Date(Date.now() + 864e5).toISOString().slice(0, 10), tag: 'Sample', title: 'Weekly club session (sample notice: edit this)', body: 'Replace this with your real meeting day, time and room.', link: '#chemistry', link_text: 'Open the chemistry lab' }],
      users, progress, exams, questions, attempts, certificates: [] };
  }

  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
  if (!db || !db.users) { db = seed(); save(); }
  let me = null;
  try { const s = localStorage.getItem(SKEY); me = db.users.find(u => u.id === s) || null; } catch (e) {}
  const pub = u => u && ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role, grade: u.grade, created_at: u.created_at });
  const need = r => { if (!me) throw new Error('Please log in'); if (r === 'staff' && !['teacher', 'admin'].includes(me.role)) throw new Error('Teachers only'); if (r === 'admin' && me.role !== 'admin') throw new Error('Admin only'); };
  const isStaff = () => me && ['teacher', 'admin'].includes(me.role);
  const ok = v => Promise.resolve(v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const run = f => { try { return ok(f()); } catch (e) { return Promise.reject(e); } };
  const status = userId => db.subjects.filter(s => s.published).sort((a, b) => a.position - b.position).map(s => {
    const labs = db.labs.filter(l => l.subject_id === s.id && l.published).map(l => l.id);
    const pr = db.progress.filter(p => p.user_id === userId && labs.includes(p.lab_id));
    const best = {};
    db.attempts.filter(a => a.user_id === userId && (db.exams.find(e => e.id === a.exam_id) || {}).subject_id === s.id).forEach(a => {
      const b = best[a.exam_id] || (best[a.exam_id] = { best: 0, passed: false }); b.best = Math.max(b.best, a.percent); b.passed = b.passed || a.passed; });
    const passedList = Object.values(best).filter(b => b.passed);
    const st = { subject_id: s.id, labs_total: labs.length, labs_opened: pr.length, labs_completed: pr.filter(p => p.completed).length, exams_passed: passedList.length, avg_best: passedList.length ? Math.round(10 * passedList.reduce((t, b) => t + b.best, 0) / passedList.length) / 10 : 0 };
    st.level = levelFor(st); return st;
  });

  return {
    mode: 'demo',
    async init() { return pub(me); },
    user: () => pub(me),
    onChange: f => listeners.push(f),
    async signIn(username, password) {
      const name = String(username).trim().toLowerCase().split('@')[0];
      const u = db.users.find(x => x.username === name && x.password === password);
      if (!u) throw new Error('Wrong username or password. This site is still in DEMO mode, so only the demo accounts below work. To use your real account, put your Supabase keys in assets/js/config.js (see SETUP.md, step 3).');
      me = u; try { localStorage.setItem(SKEY, u.id); } catch (e) {} emit(pub(me)); return pub(me);
    },
    async signOut() { me = null; try { localStorage.removeItem(SKEY); } catch (e) {} emit(null); },
    async diag() { return { mode: 'demo', project: '(none: supabaseUrl / supabaseAnonKey in config.js are empty)', loginDomain: CFG.loginDomain, keyLooksRight: false, subjects: null, error: '' }; },
    resetDemo() { db = seed(); save(); me = null; try { localStorage.removeItem(SKEY); } catch (e) {} emit(null); },

    getSubjects: () => ok(db.subjects.filter(s => s.published || isStaff()).sort((a, b) => a.position - b.position)),
    saveSubject: s => run(() => { need('admin'); const i = db.subjects.findIndex(x => x.id === s.id); if (i >= 0) db.subjects[i] = { ...db.subjects[i], ...s }; else db.subjects.push({ published: true, position: db.subjects.length + 1, ...s }); save(); return s; }),
    deleteSubject: id => run(() => { need('admin'); db.subjects = db.subjects.filter(s => s.id !== id); db.labs = db.labs.filter(l => l.subject_id !== id); save(); }),
    getLabs: () => ok(db.labs.filter(l => l.published || isStaff()).sort((a, b) => a.position - b.position)),
    saveLab: l => run(() => { need('admin'); const i = db.labs.findIndex(x => x.id === l.id); if (i >= 0) db.labs[i] = { ...db.labs[i], ...l }; else db.labs.push({ kind: 'builtin', level: '', blurb: '', instructions: '', embed_url: '', published: true, position: 99, ...l }); save(); return l; }),
    deleteLab: id => run(() => { need('admin'); db.labs = db.labs.filter(l => l.id !== id); save(); }),
    getNews: () => ok([...db.news].sort((a, b) => String(b.date).localeCompare(String(a.date)))),
    saveNews: n => run(() => { need('staff'); if (n.id) { const i = db.news.findIndex(x => x.id === n.id); db.news[i] = { ...db.news[i], ...n }; } else db.news.push({ ...n, id: uid() }); save(); }),
    deleteNews: id => run(() => { need('staff'); db.news = db.news.filter(n => n.id !== id); save(); }),

    trackLab: (lab, subject, kind, secs, inter) => run(() => {
      need(); secs = Math.min(Math.max(secs | 0, 0), 60); inter = Math.min(Math.max(inter | 0, 0), 200);
      let p = db.progress.find(x => x.user_id === me.id && x.lab_id === lab);
      if (!p) { p = { user_id: me.id, lab_id: lab, subject_id: subject, seconds: 0, interactions: 0, completed: false, first_at: nowISO() }; db.progress.push(p); }
      p.seconds += secs; p.interactions += inter; p.last_at = nowISO();
      if (!p.completed && p.seconds >= COMPLETE_SECONDS && (p.interactions >= COMPLETE_INTERACTIONS || kind !== 'builtin')) p.completed = true;
      save(); return p;
    }),
    myProgress: () => run(() => { need(); return db.progress.filter(p => p.user_id === me.id); }),
    completeCodeLab: lab => run(() => {
      need(); const l = db.labs.find(x => x.id === lab && x.kind === 'code'); if (!l) throw new Error('Not a coding lab');
      let p = db.progress.find(x => x.user_id === me.id && x.lab_id === lab);
      if (!p) { p = { user_id: me.id, lab_id: lab, subject_id: l.subject_id, seconds: 0, interactions: 0, first_at: nowISO() }; db.progress.push(p); }
      p.completed = true; p.interactions++; p.last_at = nowISO(); save(); return p;
    }),
    getSettings: () => run(() => db.settings || {}),
    saveSettings: (key, value) => run(() => { need('admin'); db.settings = { ...(db.settings || {}), [key]: value }; save(); }),
    aiUsage: () => run(() => { need('staff'); return []; }),
    ai: () => Promise.reject(new Error('The AI works on the live site once it is set up (see SETUP.md). In demo mode there is no AI connection.')),
    aiModels: () => ok((db.settings.ai_models || STEM.DEFAULT_AI_MODELS).filter(m => m.enabled !== false && (!m.staff_only || isStaff()))),

    listCourses: () => run(() => { need(); return db.courses.filter(c => c.published || isStaff()).sort((a, b) => a.position - b.position); }),
    getCourse: id => run(() => { need(); const course = db.courses.find(c => c.id === id && (c.published || isStaff())); if (!course) throw new Error('Course not found');
      return { course, lessons: db.lessons.filter(l => l.course_id === id).sort((a, b) => a.position - b.position), assignments: db.assignments.filter(a => a.course_id === id && (a.published || isStaff())).sort((a, b) => a.position - b.position) }; }),
    saveCourse: (course, lessons, assignments) => run(() => {
      need('staff'); let id = course.id && db.courses.some(c => c.id === course.id) ? course.id : uid();
      const fields = { title: course.title, subject_id: course.subject_id || '', grade: course.grade || '', description: course.description || '', color: course.color || '#1f3f99', published: !!course.published, position: course.position || 0 };
      const i = db.courses.findIndex(c => c.id === id); if (i >= 0) db.courses[i] = { ...db.courses[i], ...fields }; else db.courses.push({ ...fields, id, created_at: nowISO() });
      const ls = lessons.map((l, k) => ({ id: l.id || uid(), course_id: id, position: k + 1, title: l.title, body: l.body || '', video_url: l.video_url || '', resources: l.resources || '', lab_id: l.lab_id || '', exam_id: l.exam_id || null, minutes: +l.minutes || 10 }));
      const keepL = new Set(ls.map(l => l.id));
      db.lesson_progress = db.lesson_progress.filter(p => p.course_id !== id || keepL.has(p.lesson_id));
      db.lessons = db.lessons.filter(l => l.course_id !== id).concat(ls);
      const as = assignments.map((a, k) => ({ id: a.id || uid(), course_id: id, position: k + 1, title: a.title, instructions: a.instructions || '', due_date: a.due_date || null, points: +a.points || 10, published: a.published !== false, created_at: a.created_at || nowISO() }));
      const keepA = new Set(as.map(a => a.id));
      db.submissions = db.submissions.filter(s => { const a = db.assignments.find(x => x.id === s.assignment_id); return !a || a.course_id !== id || keepA.has(s.assignment_id); });
      db.assignments = db.assignments.filter(a => a.course_id !== id).concat(as);
      save(); return id;
    }),
    deleteCourse: id => run(() => { need('staff'); const ls = new Set(db.lessons.filter(l => l.course_id === id).map(l => l.id)), as = new Set(db.assignments.filter(a => a.course_id === id).map(a => a.id));
      db.courses = db.courses.filter(c => c.id !== id); db.lessons = db.lessons.filter(l => !ls.has(l.id)); db.lesson_progress = db.lesson_progress.filter(p => !ls.has(p.lesson_id)); db.assignments = db.assignments.filter(a => !as.has(a.id)); db.submissions = db.submissions.filter(s => !as.has(s.assignment_id)); save(); }),
    myLessonProgress: () => run(() => { need(); return db.lesson_progress.filter(p => p.user_id === me.id); }),
    allLessonProgress: () => run(() => { need('staff'); return db.lesson_progress; }),
    completeLesson: (lessonId, courseId) => run(() => { need(); if (!db.lesson_progress.some(p => p.user_id === me.id && p.lesson_id === lessonId)) db.lesson_progress.push({ user_id: me.id, lesson_id: lessonId, course_id: courseId, completed_at: nowISO() }); save(); }),
    uncompleteLesson: lessonId => run(() => { need(); db.lesson_progress = db.lesson_progress.filter(p => !(p.user_id === me.id && p.lesson_id === lessonId)); save(); }),
    getAssignment: id => run(() => { need(); const assignment = db.assignments.find(a => a.id === id && (a.published || isStaff())); if (!assignment) throw new Error('Assignment not found'); return { assignment, course: db.courses.find(c => c.id === assignment.course_id) }; }),
    mySubmissions: () => run(() => { need(); return db.submissions.filter(s => s.user_id === me.id); }),
    submissionsFor: aid => run(() => { need('staff'); return db.submissions.filter(s => s.assignment_id === aid); }),
    allSubmissions: () => run(() => { need('staff'); return db.submissions; }),
    submitAssignment: (aid, answer) => run(() => { need(); let s = db.submissions.find(x => x.assignment_id === aid && x.user_id === me.id);
      if (s && s.grade != null) throw new Error('This assignment is already marked, so the answer cannot be changed.');
      if (s) { s.answer = answer; s.submitted_at = nowISO(); } else db.submissions.push({ id: uid(), assignment_id: aid, user_id: me.id, answer, submitted_at: nowISO(), grade: null, feedback: '', graded_at: null }); save(); }),
    gradeSubmission: (id, grade, feedback) => run(() => { need('staff'); const s = db.submissions.find(x => x.id === id); s.grade = grade; s.feedback = feedback; s.graded_at = nowISO(); s.graded_by = me.id; save(); }),

    listExams: () => run(() => { need(); return db.exams.filter(e => e.published || isStaff()).map(e => ({ ...e, question_count: db.questions.filter(q => q.exam_id === e.id).length })).sort((a, b) => b.created_at.localeCompare(a.created_at)); }),
    getExamForEdit: id => run(() => { need('staff'); return { exam: db.exams.find(e => e.id === id), questions: db.questions.filter(q => q.exam_id === id).sort((a, b) => a.position - b.position) }; }),
    saveExam: (exam, qs) => run(() => {
      need('staff'); let id = exam.id;
      const fields = ['title', 'subject_id', 'grade', 'description', 'time_limit', 'pass_mark', 'max_attempts', 'published'];
      const clean = Object.fromEntries(fields.map(f => [f, exam[f]]));
      if (id) { const i = db.exams.findIndex(e => e.id === id); db.exams[i] = { ...db.exams[i], ...clean, updated_at: nowISO() }; }
      else { id = uid(); db.exams.push({ ...clean, id, created_by: me.id, created_at: nowISO(), updated_at: nowISO() }); }
      db.questions = db.questions.filter(q => q.exam_id !== id).concat(qs.map((q, i) => ({ id: uid(), exam_id: id, position: i, question: q.question, options: q.options, answer: q.answer | 0, points: Math.max(0, q.points | 0) }))); save(); return id;
    }),
    deleteExam: id => run(() => { need('staff'); db.exams = db.exams.filter(e => e.id !== id); db.questions = db.questions.filter(q => q.exam_id !== id); db.attempts = db.attempts.filter(a => a.exam_id !== id); save(); }),
    getPaper: id => run(() => {
      need(); const e = db.exams.find(x => x.id === id); if (!e || (!e.published && !isStaff())) throw new Error('This exam is not available');
      return { exam: e, attempts_used: db.attempts.filter(a => a.exam_id === id && a.user_id === me.id).length, questions: db.questions.filter(q => q.exam_id === id).sort((a, b) => a.position - b.position).map(q => ({ id: q.id, question: q.question, options: q.options, points: q.points })) };
    }),
    submitExam: (id, answers, started) => run(() => {
      need(); const e = db.exams.find(x => x.id === id); if (!e || !e.published) throw new Error('This exam is not available');
      const used = db.attempts.filter(a => a.exam_id === id && a.user_id === me.id).length;
      if (e.max_attempts > 0 && used >= e.max_attempts) throw new Error('You have no attempts left for this exam');
      const show = e.max_attempts === 0 || used + 1 >= e.max_attempts; let s = 0, m = 0; const detail = [], key = {};
      db.questions.filter(q => q.exam_id === id).sort((a, b) => a.position - b.position).forEach(q => {
        const a = answers[q.id] === undefined || answers[q.id] === '' ? null : +answers[q.id]; const c = a !== null && a === q.answer;
        m += q.points; if (c) s += q.points; detail.push({ id: q.id, chosen: a, correct: c }); if (show) key[q.id] = q.answer; });
      const pct = m ? Math.round(1000 * s / m) / 10 : 0;
      const at = { id: uid(), exam_id: id, user_id: me.id, answers, detail, score: s, max_score: m, percent: pct, passed: pct >= e.pass_mark, started_at: started, submitted_at: nowISO() };
      db.attempts.push(at); save(); return { ...at, answers_key: key };
    }),
    myAttempts: () => run(() => { need(); return db.attempts.filter(a => a.user_id === me.id); }),

    certStatus: userId => run(() => { need(); if (userId && userId !== me.id) need('staff'); return status(userId || me.id); }),
    claimCertificates: () => run(() => {
      need(); const st = status(me.id); let n = 0, all = true;
      const add = (sub, l) => { if (!db.certificates.find(c => c.user_id === me.id && c.subject_id === sub && c.level === l)) db.certificates.push({ id: uid(), user_id: me.id, subject_id: sub, level: l, code: code(sub, l), issued_at: nowISO() }); };
      st.forEach(s => { if (s.labs_total > 0) { n++; if (s.level < 2) all = false; for (let l = 1; l <= s.level; l++) add(s.subject_id, l); } });
      if (n && all) add('all', 1); save(); return db.certificates.filter(c => c.user_id === me.id);
    }),
    myCertificates: () => run(() => { need(); return db.certificates.filter(c => c.user_id === me.id); }),
    verifyCertificate: c => run(() => {
      const x = db.certificates.find(k => k.code.toUpperCase() === String(c).trim().toUpperCase()); if (!x) return { valid: false };
      const u = db.users.find(k => k.id === x.user_id) || {}; const s = db.subjects.find(k => k.id === x.subject_id);
      return { valid: true, full_name: u.full_name, subject_id: x.subject_id, subject_name: s ? s.name : 'All subjects', level: x.level, issued_at: x.issued_at, code: x.code };
    }),

    listProfiles: () => run(() => { need('staff'); return db.users.map(pub); }),
    allProgress: () => run(() => { need('staff'); return db.progress; }),
    allAttempts: () => run(() => { need('staff'); return db.attempts; }),
    allCertificates: () => run(() => { need('staff'); return db.certificates; }),
    userProgress: id => run(() => { need('staff'); return db.progress.filter(p => p.user_id === id); }),
    userAttempts: id => run(() => { need('staff'); return db.attempts.filter(a => a.user_id === id); }),
    userCertificates: id => run(() => { need('staff'); return db.certificates.filter(c => c.user_id === id); }),

    manageUsers: body => run(() => {
      need('staff'); const admin = me.role === 'admin';
      const target = id => { const u = db.users.find(x => x.id === id); if (!u) throw new Error('User not found'); if (!admin && u.role !== 'student') throw new Error('Teachers can only manage student accounts'); return u; };
      const pw = () => ['lion', 'river', 'tana', 'atom', 'cell', 'volt', 'orbit', 'eagle'][Math.floor(Math.random() * 8)] + (1000 + Math.floor(Math.random() * 9000));
      const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'student';
      if (body.action === 'create') {
        const created = [], failed = [];
        (body.users || []).forEach(u => {
          const full_name = String(u.full_name || '').trim(); if (!full_name) return failed.push({ full_name, error: 'Missing name' });
          let base = slug(u.username || full_name), name = base, i = 2;
          if (u.username && db.users.some(x => x.username === name)) return failed.push({ full_name, error: `Username ${name} is taken` });
          while (db.users.some(x => x.username === name)) name = base + i++;
          const password = u.password && u.password.length >= 6 ? u.password : pw();
          const role = admin && ['student', 'teacher', 'admin'].includes(u.role) ? u.role : 'student';
          const nu = { id: uid(), username: name, password, full_name, role, grade: u.grade || '', created_at: nowISO() };
          db.users.push(nu); created.push({ id: nu.id, username: name, password, full_name, grade: nu.grade, role });
        });
        save(); return { created, failed };
      }
      if (body.action === 'reset') { const u = target(body.user_id); u.password = body.password && body.password.length >= 6 ? body.password : pw(); save(); return { username: u.username, password: u.password }; }
      if (body.action === 'update') { const u = target(body.user_id); if (typeof body.full_name === 'string') u.full_name = body.full_name.trim(); if (typeof body.grade === 'string') u.grade = body.grade.trim(); save(); return { ok: true }; }
      if (body.action === 'role') { need('admin'); if (body.user_id === me.id && body.role !== 'admin') throw new Error('You cannot remove your own admin role'); target(body.user_id).role = body.role; save(); return { ok: true }; }
      if (body.action === 'delete') { need('admin'); if (body.user_id === me.id) throw new Error('You cannot delete your own account'); db.users = db.users.filter(u => u.id !== body.user_id); ['progress', 'attempts', 'certificates'].forEach(t => db[t] = db[t].filter(r => r.user_id !== body.user_id)); save(); return { ok: true }; }
      throw new Error('Unknown action');
    })
  };
}

/* =================================================================== LIVE (Supabase) */
function liveStore() {
  let sb, me = null;
  const loadLib = () => new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = res; s.onerror = () => rej(new Error('Could not load Supabase')); document.head.appendChild(s);
  });
  const q = async p => { const { data, error } = await p; if (error) throw new Error(error.message); return data; };
  const all = async build => { const out = []; for (let from = 0; ; from += 1000) { const rows = await q(build().range(from, from + 999)); out.push(...rows); if (rows.length < 1000) return out; } };
  const loadMe = async session => {
    if (!session) { me = null; return null; }
    const rows = await q(sb.from('profiles').select('*').eq('id', session.user.id));
    me = rows[0] || null; return me;
  };
  const rpc = (fn, args) => q(sb.rpc(fn, args));
  return {
    mode: 'live',
    async init() {
      await loadLib();
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data } = await sb.auth.getSession(); await loadMe(data.session);
      sb.auth.onAuthStateChange(async (ev, session) => { if (ev === 'SIGNED_OUT' || ev === 'SIGNED_IN') { await loadMe(session); emit(me); } });
      return me;
    },
    user: () => me,
    onChange: f => listeners.push(f),
    async signIn(username, password) {
      const raw = String(username).trim().toLowerCase(), email = raw.includes('@') ? raw : `${raw}@${CFG.loginDomain}`;
      STEM.lastLogin = { email, error: '' };
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { STEM.lastLogin.error = error.message; throw new Error(/invalid/i.test(error.message) ? `Wrong username or password (tried ${email})` : error.message); }
      await loadMe(data.session);
      if (!me) { STEM.lastLogin.error = 'Logged in, but no profile row was found. Was supabase/schema.sql run BEFORE this user was created?'; await sb.auth.signOut(); throw new Error(STEM.lastLogin.error); }
      emit(me); return me;
    },
    async signOut() { await sb.auth.signOut(); me = null; emit(null); },
    async diag() {
      const out = { mode: 'live', project: '', loginDomain: CFG.loginDomain, keyLooksRight: /^eyJ/.test(CFG.supabaseAnonKey || '') || /^sb_publishable_/.test(CFG.supabaseAnonKey || ''), subjects: null, error: '' };
      try { out.project = new URL(CFG.supabaseUrl).host; } catch (e) { out.project = 'NOT A VALID URL: ' + CFG.supabaseUrl; }
      try { const { data, error } = await sb.from('subjects').select('id'); if (error) out.error = error.message; else out.subjects = data.length; } catch (e) { out.error = String(e.message || e); }
      return out;
    },

    getSubjects: () => q(sb.from('subjects').select('*').order('position')),
    saveSubject: s => q(sb.from('subjects').upsert(s)),
    deleteSubject: id => q(sb.from('subjects').delete().eq('id', id)),
    getLabs: () => q(sb.from('labs').select('*').order('position')),
    saveLab: l => q(sb.from('labs').upsert(l)),
    deleteLab: id => q(sb.from('labs').delete().eq('id', id)),
    getNews: () => q(sb.from('news').select('*').order('date', { ascending: false }).limit(100)),
    saveNews: n => { const { id, ...rest } = n; return id ? q(sb.from('news').update(rest).eq('id', id)) : q(sb.from('news').insert(rest)); },
    deleteNews: id => q(sb.from('news').delete().eq('id', id)),

    trackLab: (lab, subject, kind, secs, inter) => rpc('track_lab', { p_lab: lab, p_subject: subject, p_kind: kind, p_seconds: secs, p_interactions: inter }),
    myProgress: () => q(sb.from('lab_progress').select('*').eq('user_id', me.id)),
    completeCodeLab: lab => rpc('complete_code_lab', { p_lab: lab }),
    async getSettings() { const rows = await q(sb.from('app_settings').select('*')); return Object.fromEntries(rows.map(r => [r.key, r.value])); },
    saveSettings: (key, value) => q(sb.from('app_settings').upsert({ key, value })),
    aiUsage: () => q(sb.from('ai_usage').select('*').eq('day', new Date().toISOString().slice(0, 10))),
    async aiModels() { try { return (await this.ai({ mode: 'models' })).models; } catch (e) { return STEM.DEFAULT_AI_MODELS.filter(m => !m.staff_only); } },
    listCourses: () => q(sb.from('courses').select('*').order('position')),
    async getCourse(id) {
      const [course] = await q(sb.from('courses').select('*').eq('id', id)); if (!course) throw new Error('Course not found');
      const [lessons, assignments] = await Promise.all([q(sb.from('lessons').select('*').eq('course_id', id).order('position')), q(sb.from('assignments').select('*').eq('course_id', id).order('position'))]);
      return { course, lessons, assignments };
    },
    saveCourse: (course, lessons, assignments) => rpc('save_course', { p_course: course, p_lessons: lessons, p_assignments: assignments }),
    deleteCourse: id => q(sb.from('courses').delete().eq('id', id)),
    myLessonProgress: () => q(sb.from('lesson_progress').select('*').eq('user_id', me.id)),
    allLessonProgress: () => all(() => sb.from('lesson_progress').select('*')),
    completeLesson: (lessonId, courseId) => q(sb.from('lesson_progress').upsert({ user_id: me.id, lesson_id: lessonId, course_id: courseId }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true })),
    uncompleteLesson: lessonId => q(sb.from('lesson_progress').delete().eq('user_id', me.id).eq('lesson_id', lessonId)),
    async getAssignment(id) {
      const [assignment] = await q(sb.from('assignments').select('*').eq('id', id)); if (!assignment) throw new Error('Assignment not found');
      const [course] = await q(sb.from('courses').select('*').eq('id', assignment.course_id)); return { assignment, course };
    },
    mySubmissions: () => q(sb.from('submissions').select('*').eq('user_id', me.id)),
    submissionsFor: aid => q(sb.from('submissions').select('*').eq('assignment_id', aid)),
    allSubmissions: () => all(() => sb.from('submissions').select('*')),
    async submitAssignment(aid, answer) {
      const { error } = await sb.from('submissions').upsert({ assignment_id: aid, user_id: me.id, answer }, { onConflict: 'assignment_id,user_id' });
      if (error) throw new Error(/row-level|policy/i.test(error.message) ? 'This assignment is already marked, so the answer cannot be changed.' : error.message);
    },
    gradeSubmission: (id, grade, feedback) => q(sb.from('submissions').update({ grade, feedback }).eq('id', id)),
    async ai(body) {
      const { data } = await sb.auth.getSession();
      let r;
      try { r = await fetch(CFG.tutorApi, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') }, body: JSON.stringify({ lang: STEM.i18n ? STEM.i18n.lang : 'en', ...body }) }); }
      catch (e) { throw new Error('Could not reach the AI tutor. Check your internet connection.'); }
      const out = await r.json().catch(() => ({ error: 'The AI tutor did not answer. Please try again.' }));
      if (!r.ok || out.error) throw new Error(out.error || 'The AI tutor had a problem.');
      return out;
    },

    async listExams() {
      const exams = await q(sb.from('exams').select('*').order('created_at', { ascending: false }));
      if (me && ['teacher', 'admin'].includes(me.role)) {
        const qs = await all(() => sb.from('exam_questions').select('exam_id'));
        exams.forEach(e => e.question_count = qs.filter(x => x.exam_id === e.id).length);
      }
      return exams;
    },
    async getExamForEdit(id) {
      const [exam] = await q(sb.from('exams').select('*').eq('id', id));
      const questions = await q(sb.from('exam_questions').select('*').eq('exam_id', id).order('position'));
      return { exam, questions };
    },
    saveExam: (exam, qs) => rpc('save_exam', { p_exam: exam, p_questions: qs.map(x => ({ question: x.question, options: x.options, answer: x.answer, points: x.points })) }),
    deleteExam: id => q(sb.from('exams').delete().eq('id', id)),
    getPaper: id => rpc('get_exam_paper', { p_exam: id }),
    submitExam: (id, answers, started) => rpc('submit_exam', { p_exam: id, p_answers: answers, p_started: started }),
    myAttempts: () => q(sb.from('attempts').select('*').eq('user_id', me.id)),

    certStatus: userId => rpc('certificate_status', { p_user: userId || null }),
    claimCertificates: () => rpc('claim_certificates'),
    myCertificates: () => q(sb.from('certificates').select('*').eq('user_id', me.id)),
    verifyCertificate: c => rpc('verify_certificate', { p_code: c }),

    listProfiles: () => all(() => sb.from('profiles').select('id,username,full_name,role,grade,created_at').order('full_name')),
    allProgress: () => all(() => sb.from('lab_progress').select('*')),
    allAttempts: () => all(() => sb.from('attempts').select('*')),
    allCertificates: () => all(() => sb.from('certificates').select('*')),
    userProgress: id => q(sb.from('lab_progress').select('*').eq('user_id', id)),
    userAttempts: id => q(sb.from('attempts').select('*').eq('user_id', id)),
    userCertificates: id => q(sb.from('certificates').select('*').eq('user_id', id)),

    async manageUsers(body) {
      const { data } = await sb.auth.getSession();
      const r = await fetch(CFG.usersApi, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') }, body: JSON.stringify(body) });
      const out = await r.json().catch(() => ({ error: 'The server did not answer' }));
      if (!r.ok || out.error) throw new Error(out.error || 'Request failed');
      return out;
    }
  };
}

// Settings come from config.js, or (preferred) from Netlify via /api/config, so config.js can stay empty.
STEM.resolveConfig = async () => {
  if (CFG.supabaseUrl && CFG.supabaseAnonKey) return 'file';
  if (location.protocol === 'file:' || /claudeusercontent|claude\.ai/.test(location.host)) return 'none';
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('/api/config', { signal: ctl.signal, cache: 'no-store' }); clearTimeout(t);
    if (r.ok && /json/.test(r.headers.get('content-type') || '')) {
      const c = await r.json();
      if (c.supabaseUrl && c.supabaseAnonKey) { CFG.supabaseUrl = c.supabaseUrl; CFG.supabaseAnonKey = c.supabaseAnonKey; if (c.loginDomain) CFG.loginDomain = c.loginDomain; return 'netlify'; }
    }
  } catch (e) {}
  return 'none';
};
STEM.makeStore = () => (CFG.supabaseUrl && CFG.supabaseAnonKey ? liveStore() : demoStore());
STEM.levelFor = levelFor;
STEM.COMPLETE = { seconds: COMPLETE_SECONDS, interactions: COMPLETE_INTERACTIONS };
})();
