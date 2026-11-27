/* Small helpers used by every page. */
(() => {
const E = STEM.escapeHTML;
const $ = STEM.$;
STEM.pages = [];                 // each page file adds { name, match(route) → params|null, roles, render(el, params) }
STEM.state = { subjects: [], labs: [], user: null };

const ui = STEM.ui = {
  E,
  fmtDate: d => { if (!d) return ''; const t = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(t) ? E(d) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); },
  fmtDur: s => { s = Math.round(s || 0); if (s < 60) return s + ' s'; const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; },
  pct: (a, b) => b ? Math.round(100 * a / b) : 0,
  subj: id => STEM.state.subjects.find(s => s.id === id) || { id, name: id === 'all' ? 'All subjects' : (id || 'General'), color: '#5a6278', am: '' },
  // readable text colour on a background colour
  onColor: hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff'; const n = parseInt(m[1], 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#141a2c' : '#fff'; },
  icon: id => STEM.ICONS[id] || STEM.ICONS.default,
  bar: (v, max, color) => `<div class="meter" role="img" aria-label="${ui.pct(v, max)}%"><i style="width:${Math.min(100, ui.pct(v, max))}%;${color ? 'background:' + color : ''}"></i></div>`,
  isStaff: () => !!STEM.state.user && ['teacher', 'admin'].includes(STEM.state.user.role),
  isAdmin: () => !!STEM.state.user && STEM.state.user.role === 'admin',
  levelName: (sub, l) => sub === 'all' ? STEM.LEVELS.scholar.name : (STEM.LEVELS[l] || {}).name || '',
  levelColor: (sub, l) => sub === 'all' ? STEM.LEVELS.scholar.color : (STEM.LEVELS[l] || {}).color || '#888',
  grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],

  toast(msg, kind = '') {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast on ' + kind;
    clearTimeout(ui._tt); ui._tt = setTimeout(() => t.className = 'toast', 3600);
  },
  // in-page dialog (browser alert/confirm are not used)
  modal(html, { wide = false } = {}) {
    const wrap = document.createElement('div'); wrap.className = 'modal';
    wrap.innerHTML = `<div class="box ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="x" aria-label="Close">×</button>${html}</div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('x')) close(); });
    const f = wrap.querySelector('input,select,textarea,button:not(.x)'); if (f) setTimeout(() => f.focus(), 30);
    return { el: wrap.querySelector('.box'), close };
  },
  confirm(msg, yes = 'Yes', danger = false) {
    return new Promise(res => {
      const m = ui.modal(`<p class="lead">${E(msg)}</p><div class="row end"><button class="btn ghost no">Cancel</button><button class="btn ${danger ? 'danger' : ''} yes">${E(yes)}</button></div>`);
      m.el.querySelector('.no').onclick = () => { m.close(); res(false); };
      m.el.querySelector('.yes').onclick = () => { m.close(); res(true); };
    });
  },
  download(name, text, type = 'text/csv') {
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([(type.includes('csv') ? '\ufeff' : '') + text], { type })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { ui.copy(text); }
  },
  async copy(text) { try { await navigator.clipboard.writeText(text); ui.toast('Copied'); } catch (e) { ui.toast('Could not copy. Select the text and copy it yourself.'); } },
  csv: rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'),
  // table: cols = [{h:'Name', v: row => html, cls}], rows
  table(cols, rows, empty = 'Nothing here yet.') {
    if (!rows.length) return `<p class="empty">${empty}</p>`;
    return `<div class="tablewrap"><table class="stack"><thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  },
  band: (title, sub = '', color = 'var(--blue)', extra = '') =>
    `<div class="band subhead" style="--c:${color};--on:${ui.onColor(color.startsWith('#') ? color : '')}"><div class="wrap">${extra}<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`,
  err: e => (e && e.message) || String(e),
  loading: '<p class="empty">Loading…</p>',

  // subjects + labs from the database, falling back to the built-in list
  async loadSiteData() {
    const st = STEM.state;
    try { st.subjects = await STEM.store.getSubjects(); } catch (e) { console.warn(e); st.subjects = []; }
    try { st.labs = await STEM.store.getLabs(); } catch (e) { console.warn(e); st.labs = []; }
    if (!st.subjects.length) st.subjects = STEM.DEFAULT_SUBJECTS.map((s, i) => ({ ...s, position: i, published: true }));
    if (!st.labs.length) st.labs = STEM.SIMS.map((x, i) => ({ id: x.id, subject_id: x.subject, kind: 'builtin', title: x.title, level: x.level, blurb: x.blurb, position: i, published: true }));
  },
  labsOf: (subjectId, includeHidden = false) => STEM.state.labs.filter(l => l.subject_id === subjectId && (includeHidden || l.published)).sort((a, b) => (a.position || 0) - (b.position || 0)),
  // text with line breaks and numbered steps → HTML
  richText(t) {
    const lines = String(t || '').split(/\n/).map(s => s.trim()).filter(Boolean);
    let out = '', list = null;
    lines.forEach(l => {
      const m = /^(\d+)[.)]\s+(.*)$/.exec(l) || /^[-•*]\s+(.*)$/.exec(l);
      if (m) { const type = /^\d/.test(l) ? 'ol' : 'ul'; if (list !== type) { if (list) out += `</${list}>`; out += `<${type}>`; list = type; } out += `<li>${E(m[m.length - 1])}</li>`; }
      else { if (list) { out += `</${list}>`; list = null; } out += `<p>${E(l)}</p>`; }
    });
    if (list) out += `</${list}>`; return out;
  }
};
})();
/* On phones, tables become stacked cards: label each cell with its column heading. */
new MutationObserver(() => {
  for (const c of document.querySelectorAll('.stack td:not([data-l])')) {
    let i = 0, p = c; while ((p = p.previousElementSibling)) i += p.colSpan;
    c.dataset.l = (c.closest('table').rows[0].cells[i] || {}).textContent || '';
  }
}).observe(document.documentElement, { childList: true, subtree: true });
