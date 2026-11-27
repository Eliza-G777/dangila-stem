/* =====================================================================
   SITE SETTINGS — the only file you need to edit to go live.
   ===================================================================== */
STEM.CONFIG = {
  // From Supabase → Project Settings → API. Leave both empty to run in DEMO mode.
  supabaseUrl: 'https://yvehjvylxnyudxlkoobt.supabase.co/rest/v1/',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZWhqdnlseG55dWR4bGtvb2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3MzE3NzcsImV4cCI6MjExMTMwNzc3N30._BTJWnPpXu1_xzgtOBJELJ783RnWy1CUtgzAOqHT0uA',        // the "anon public" key (safe to put here)
  loginDomain: 'dangila-stem.netlify.app', // must match LOGIN_DOMAIN in Netlify (usernames become name@this-domain)
  usersApi: '/api/users',      // the Netlify function that creates accounts
  schoolName: 'Danglila Secondary School',
  clubName: 'Danglila STEM Club'
};

/* Labs shown before the database loads (and in demo mode). In live mode the admin
   manages subjects and labs on the Admin page instead. */
STEM.DEFAULT_SUBJECTS = [
  { id: 'chemistry',   name: 'Chemistry',   am: 'ኬሚስትሪ',  color: '#e5483a', description: 'Mix chemicals in a virtual beaker, watch what forms, and read the balanced equation.' },
  { id: 'electricity', name: 'Electricity', am: 'ኤሌክትሪክ', color: '#e9a400', description: 'Build circuits, change voltage and resistance, and see current flow.' },
  { id: 'biology',     name: 'Biology',     am: 'ባዮሎጂ',    color: '#2c9a59', description: 'Watch populations rise and fall, and molecules move across a cell membrane.' },
  { id: 'math',        name: 'Mathematics', am: 'ሂሳብ',     color: '#3d6fe6', description: 'Move graphs with sliders, spin the unit circle, and test probability with dice.' }
];

/* Certificate levels (the club's brand). */
STEM.LEVELS = {
  1: { name: 'Explorer',     color: '#b4703a', rule: 'Open every lab in the subject' },
  2: { name: 'Investigator', color: '#7d8796', rule: 'Complete every lab and pass at least one exam in the subject' },
  3: { name: 'Scientist',    color: '#c99a06', rule: 'Pass at least two exams with a best-score average of 85% or more' },
  scholar: { name: 'STEM Scholar', color: '#5a3fa8', rule: 'Reach Investigator in every subject' }
};

STEM.ICONS = {
  chemistry: '<svg viewBox="0 0 56 56"><path d="M22 6v16L9 44q-2 6 4 6h30q6 0 4-6L34 22V6z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 36h26l5 9q1 3-3 3H13q-4 0-3-3z" fill="var(--c)"/><path d="M19 6h18" stroke="currentColor" stroke-width="3"/></svg>',
  electricity: '<svg viewBox="0 0 56 56"><circle cx="28" cy="22" r="14" fill="var(--c)"/><rect x="21" y="36" width="14" height="10" rx="2" fill="currentColor"/><path d="M23 22l5-6 0 7 5-1-5 7" fill="none" stroke="#fff" stroke-width="2.5"/></svg>',
  biology: '<svg viewBox="0 0 56 56"><ellipse cx="28" cy="28" rx="22" ry="16" fill="var(--c)"/><circle cx="31" cy="26" r="6" fill="currentColor"/><circle cx="16" cy="32" r="2.5" fill="#fff"/><circle cx="40" cy="34" r="2" fill="#fff"/></svg>',
  math: '<svg viewBox="0 0 56 56"><path d="M6 46h44M10 50V6" stroke="currentColor" stroke-width="3"/><path d="M10 40q10-34 20-14t18-18" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/></svg>',
  default: '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="20" fill="var(--c)"/><circle cx="28" cy="28" r="8" fill="currentColor"/></svg>'
};
