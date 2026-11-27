/* Core helpers shared by every simulation. Loaded first. */
window.STEM = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Theme colours for canvas drawing (updated every frame, same object so sims can keep a reference)
  const T = { ink: '#141a2c', bg: '#fff', card: '#f2f4f9', mut: '#566079' };
  const readTheme = () => {
    const cs = getComputedStyle(document.body);
    T.ink = cs.color; T.bg = cs.backgroundColor;
    const fig = $('.view.on .fig'); if (fig) T.card = getComputedStyle(fig).backgroundColor;
    const probe = $('#probe'); if (probe) T.mut = getComputedStyle(probe).color;
  };

  // Make a canvas sharp on any screen and return its 2D context and size in CSS pixels
  const fit = cv => {
    const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    return { c, w, h };
  };

  // Labelled slider: the live value shows in an element with class "<cls>v"
  const slider = (cls, label, min, max, step, val, unit = '') =>
    `<label><b>${label}<em class="${cls}v">${val}${unit}</em></b><input type="range" class="${cls}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;

  // Remember which simulations this student has opened (in their own browser only)
  let tried = {};
  try { tried = JSON.parse(localStorage.getItem('stemTried') || '{}'); } catch (e) {}
  const markTried = id => { tried[id] = 1; try { localStorage.setItem('stemTried', JSON.stringify(tried)); } catch (e) {} };

  const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // Every simulation file calls SIMS.push({...})
  const SIMS = [];

  return { $, clamp, lerp, T, readTheme, fit, slider, tried, markTried, escapeHTML, SIMS };
})();
