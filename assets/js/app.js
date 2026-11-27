/* Starts the site: menus, router, home page, notices, forms and the animation loop. Loaded last. */
(async () => {
const { $, readTheme } = STEM, ui = STEM.ui, { E } = ui;
STEM.configSource = await STEM.resolveConfig();
STEM.store = STEM.makeStore();
const store = STEM.store;
STEM.onLeave = STEM.onLeave || [];

/* ---------- Menus ---------- */
STEM.renderNav = () => {
  const u = STEM.state.user;
  $('#nav').innerHTML = `<a href="#home">Home</a>` + STEM.state.subjects.filter(s => s.published !== false).map(s => `<a href="#${E(s.id)}"><i style="background:${E(s.color)}"></i>${E(s.name)}</a>`).join('') + `<a href="#club">Club</a>`;
  $('#acctBtn').innerHTML = u ? `<a class="btn y sm" href="#dashboard">${E((u.full_name || u.username).split(' ')[0])}</a>` : `<a class="btn y sm" href="#login">Log in</a>`;
  const links = !u ? [] : u.role === 'student'
    ? [['dashboard', 'My progress'], ['learn', 'Courses'], ['exams', 'Exams'], ['ai', 'AI Studio'], ['certificates', 'Certificates']]
    : [['dashboard', 'Overview'], ['students', 'Students'], ['learn', 'Courses'], ['exams', 'Exam builder'], ['ai', 'AI Studio'], ['admin', u.role === 'admin' ? 'Admin' : 'Notices']];
  $('#acct').hidden = !u;
  $('#acct').innerHTML = u ? `<div class="wrap"><span class="who">${E(u.full_name || u.username)} <small>${E(u.role)}${u.grade ? ' · ' + E(u.grade) : ''}</small></span><nav>${links.map(([h, t]) => `<a href="#${h}">${t}</a>`).join('')}<button class="linkbtn out">Log out</button></nav></div>` : '';
  const out = $('#acct .out'); if (out) out.onclick = async () => { await store.signOut(); ui.toast('Logged out'); location.hash = 'home'; };
  $('#heroCtas').innerHTML = (u ? `<a class="btn y" href="#dashboard">My dashboard</a>` : `<a class="btn y" href="#login">Log in</a>`) + STEM.state.subjects.filter(s => s.published !== false).slice(0, 4).map(s => `<a class="btn ghost" href="#${E(s.id)}">${E(s.name)}</a>`).join('');
};

/* ---------- Notices ---------- */
const noticeHTML = n => `<article class="notice"><div class="nd"><b>${ui.fmtDate(n.date)}</b>${n.tag ? `<span>${E(n.tag)}</span>` : ''}</div><div><h3>${E(n.title)}</h3><p>${E(n.body)}</p>${n.link ? `<a href="${/^(https:\/\/|#)/.test(n.link) ? E(n.link) : '#'}">${E(n.link_text || 'Open')}</a>` : ''}</div></article>`;
const renderNews = async (sel, max) => {
  try { const n = await store.getNews(); $(sel).innerHTML = n.length ? n.slice(0, max).map(noticeHTML).join('') : '<p class="empty">No notices yet.</p>'; }
  catch (e) { $(sel).innerHTML = '<p class="empty">Notices could not be loaded.</p>'; }
};

/* ---------- Netlify forms (join club, suggest experiment) ---------- */
document.querySelectorAll('form[data-netlify]').forEach(form => form.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = form.querySelector('.formmsg'), btn = form.querySelector('[type=submit]'); btn.disabled = true; msg.textContent = 'Sending…';
  try {
    const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
    if (!res.ok) throw new Error(res.status); form.reset(); msg.textContent = 'Thank you! The club leaders will see your message.';
  } catch (err) { msg.textContent = 'Could not send right now. Please try again, or tell a club leader in person.'; }
  btn.disabled = false;
}));

/* ---------- Router ---------- */
let routeNo = 0;
STEM.route = async (opts = {}) => {
  const no = ++routeNo;
  STEM.onLeave.forEach(f => { try { f(); } catch (e) {} });
  STEM.tracker.stop(); STEM.activeSims = [];
  if (STEM.tutor) STEM.tutor.hideAll();
  if (!opts.keepModal) document.querySelectorAll('.modal').forEach(m => m.remove());
  const r = decodeURIComponent((location.hash || '#home').slice(1)) || 'home';
  const u = STEM.state.user;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  document.querySelectorAll('#nav a, #acct a').forEach(a => a.getAttribute('href') === '#' + r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const fixed = document.querySelector(`.view[data-view="${CSS.escape(r)}"]:not(#dyn)`);
  let title = '';
  if (fixed) {
    fixed.classList.add('on');
    if (r === 'home') { renderNews('#homeNews', 3); let prog = []; if (u) { try { prog = await store.myProgress(); } catch (e) {} } if (no === routeNo) STEM.renderHomeLabs(prog); }
    if (r === 'club') renderNews('#allNews', 50);
    title = r === 'home' ? '' : r[0].toUpperCase() + r.slice(1);
  } else {
    const dyn = $('#dyn'); dyn.classList.add('on');
    let page = null, params = null;
    for (const p of STEM.pages) { params = p.match(r); if (params) { page = p; break; } }
    const holder = document.createElement('div'); dyn.replaceChildren(holder);
    if (!page) { holder.innerHTML = ui.band('Page not found', 'That page does not exist.') + '<div class="band"><div class="wrap"><a class="btn" href="#home">Go home</a></div></div>'; }
    else if (page.roles && !u) { sessionStorage.setItem('dscNext', r); location.hash = 'login'; return; }
    else if (page.roles && !page.roles.includes(u.role)) { holder.innerHTML = ui.band('Not available', 'Your account does not have access to this page.') + '<div class="band"><div class="wrap"><a class="btn" href="#dashboard">Go to my dashboard</a></div></div>'; }
    else {
      try { await page.render(holder, params); } catch (e) { console.error(e); holder.innerHTML = ui.band('Something went wrong', E(ui.err(e))) + '<div class="band"><div class="wrap"><button class="btn" onclick="STEM.route()">Try again</button></div></div>'; }
      title = page.name === 'subject' ? params.s.name : (holder.querySelector('h2') || {}).textContent || '';
    }
  }
  document.title = (title ? title + ' · ' : '') + STEM.CONFIG.clubName;
  if (!opts.keepScroll) window.scrollTo(0, 0);
};
window.addEventListener('hashchange', () => STEM.route());

/* ---------- Start ---------- */
if (store.mode === 'demo') {
  $('#demoBar').hidden = false;
  $('#demoBar .reset').onclick = async () => { if (await ui.confirm('Reset all demo data (accounts, results, labs) to the starting example?', 'Reset', true)) { store.resetDemo(); await ui.loadSiteData(); STEM.state.user = null; STEM.renderNav(); location.hash = 'home'; STEM.route(); } };
}
try { STEM.state.user = await store.init(); } catch (e) { console.error(e); ui.toast('Could not connect to the database. Showing labs only.', 'bad'); }
await ui.loadSiteData();
store.onChange(async u => {
  STEM.state.user = u; await ui.loadSiteData(); STEM.renderNav();
  if (u) { const next = sessionStorage.getItem('dscNext'); if (next) { sessionStorage.removeItem('dscNext'); location.hash = next; } }
});
STEM.renderNav();
document.querySelectorAll('.themebtn').forEach(b => b.onclick = () => STEM.theme.toggle());
document.querySelectorAll('.langbtn').forEach(b => b.onclick = () => STEM.i18n.set(STEM.i18n.lang === 'am' ? 'en' : 'am'));
STEM.theme.apply();
await STEM.route();
STEM.i18n.set(STEM.i18n.lang);

/* ---------- Animation loop for the simulations ---------- */
let last = 0;
const loop = t => {
  const dt = Math.min(.05, last ? (t - last) / 1000 : 0); last = t;
  if (STEM.activeSims && STEM.activeSims.length) { readTheme(); for (const s of STEM.activeSims) if (s.frame) { try { s.frame(dt); } catch (e) {} } }
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
})();
