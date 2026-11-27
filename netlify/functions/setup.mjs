// Setup checks and admin account creation.
// GET  /api/setup                → a checklist (only yes/no and counts; never names, emails or keys)
// POST /api/setup { code, username, full_name, password }
//      → creates the admin account, or resets its password and makes sure it is admin.
//        Needs SETUP_CODE (a secret word you choose) in Netlify environment variables.
const normUrl = u => { u = String(u || '').trim(); const m = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i.exec(u); if (m) return `https://${m[1].toLowerCase()}.supabase.co`; const d = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(u); if (d) return `https://${d[1].toLowerCase()}.supabase.co`; return u.replace(/\/+$/, ''); };
const URL_ = normUrl(process.env.SUPABASE_URL);
const ANON = (process.env.SUPABASE_ANON_KEY || '').trim();
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const DOMAIN = (process.env.LOGIN_DOMAIN || 'dangila-stem.netlify.app').trim().toLowerCase();
const CODE = (process.env.SETUP_CODE || '').trim();

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const svc = (path, opt = {}) => fetch(URL_ + path, { ...opt, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const safe = async f => { try { return await f(); } catch (e) { return { error: String(e.message || e) }; } };
const slug = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9._-]+/g, '').slice(0, 30);

async function listAuthUsers() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const r = await svc(`/auth/v1/admin/users?page=${page}&per_page=200`);
    if (!r.ok) throw new Error('service key rejected (' + r.status + ')');
    const d = await r.json(); const users = d.users || d || [];
    out.push(...users); if (users.length < 200) break;
  }
  return out;
}
const tableOk = async t => { const r = await svc(`/rest/v1/${t}?select=*&limit=1`); return r.ok; };
const tableWhy = async t => { const r = await svc(`/rest/v1/${t}?select=*&limit=1`); if (r.ok) return ''; let m = ''; try { const j = await r.json(); m = j.message || j.hint || j.code || ''; } catch (e) {} return `HTTP ${r.status}${m ? ': ' + String(m).slice(0, 140) : ''}`; };

async function health() {
  const h = {
    env: { SUPABASE_URL: !!URL_, SUPABASE_ANON_KEY: !!ANON, SUPABASE_SERVICE_ROLE_KEY: !!KEY, LOGIN_DOMAIN: DOMAIN, SETUP_CODE: !!CODE },
    urlLooksRight: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(URL_), urlWasFixed: URL_ !== String(process.env.SUPABASE_URL || '').trim(),
    anonOk: null, serviceOk: null, schema: null, phase2: null, phase3: null, admins: null, users: null, usersWithoutProfile: null, usersOtherDomain: null, ai: !!(process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_API_KEY)
  };
  if (!URL_) return h;
  if (ANON) h.anonOk = await safe(async () => (await fetch(URL_ + '/auth/v1/settings', { headers: { apikey: ANON } })).ok);
  if (!KEY) return h;
  const users = await safe(listAuthUsers);
  h.serviceOk = !users.error;
  if (users.error) return h;
  h.users = users.length;
  h.usersOtherDomain = users.filter(u => !String(u.email || '').toLowerCase().endsWith('@' + DOMAIN)).length;
  h.project = (/^https:\/\/([a-z0-9-]+)\.supabase\.co$/.exec(URL_) || [])[1] || '';
  h.schema = await safe(() => tableOk('profiles'));
  if (h.schema !== true) h.schemaWhy = await safe(() => tableWhy('profiles'));
  h.phase2 = await safe(() => tableOk('app_settings'));
  h.phase3 = await safe(() => tableOk('courses'));
  if (h.schema === true) {
    const r = await svc('/rest/v1/profiles?select=id,role');
    const profiles = r.ok ? await r.json() : [];
    h.admins = profiles.filter(p => p.role === 'admin').length;
    const ids = new Set(profiles.map(p => p.id));
    h.usersWithoutProfile = users.filter(u => !ids.has(u.id)).length;
  }
  return h;
}

export default async (req) => {
  if (req.method === 'GET') return json(await health());
  if (req.method !== 'POST') return json({ error: 'Use GET or POST' }, 405);
  if (!URL_ || !KEY) return json({ error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Netlify first, then redeploy.' }, 400);
  if (!CODE) return json({ error: 'Add a SETUP_CODE environment variable in Netlify (any secret word you choose), redeploy, then try again.' }, 400);
  let b; try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (String(b.code || '').trim() !== CODE) return json({ error: 'The setup code is wrong.' }, 403);
  const username = slug(b.username), full_name = String(b.full_name || '').trim().slice(0, 80), password = String(b.password || '');
  if (!username) return json({ error: 'Choose a username (letters and numbers).' }, 400);
  if (password.length < 6) return json({ error: 'The password must have at least 6 characters.' }, 400);
  if (!(await tableOk('profiles'))) { const why = await tableWhy('profiles'); const ref = (/^https:\/\/([a-z0-9-]+)\.supabase\.co$/.exec(URL_) || [])[1] || '?'; return json({ error: `The database is not ready in Supabase project "${ref}" (${why}). Run supabase/ALL_IN_ONE.sql in the SQL Editor of THAT project; the last result must say club_tables_found = 15.` }, 400); }

  const email = `${username}@${DOMAIN}`;
  let users; try { users = await listAuthUsers(); } catch (e) { return json({ error: 'Supabase rejected the service_role key. Copy it again from Supabase → Project Settings → API Keys (Legacy) and redeploy.' }, 400); }
  let user = users.find(u => String(u.email || '').toLowerCase() === email);
  // an older account may already use this username (e.g. created with another spelling): rename its profile so the name is free
  await svc(`/rest/v1/profiles?username=eq.${encodeURIComponent(username)}${user ? '&id=neq.' + user.id : ''}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ username: `${username}-old-${Date.now().toString(36).slice(-4)}` }) });
  let action;
  if (user) {
    const r = await svc(`/auth/v1/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password, email_confirm: true }) });
    if (!r.ok) return json({ error: 'Could not update the password: ' + (await r.text()).slice(0, 200) }, 500);
    action = 'updated';
  } else {
    const r = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, full_name: full_name || username } }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: 'Could not create the account: ' + (d.msg || d.message || r.status) }, 500);
    user = d; action = 'created';
  }
  // make sure the profile exists and is admin (fixes accounts created before schema.sql was run)
  const p = await svc('/rest/v1/profiles?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: user.id, username, role: 'admin', ...(full_name ? { full_name } : {}) }) });
  if (!p.ok) return json({ error: 'The login works, but the profile could not be saved: ' + (await p.text()).slice(0, 200) }, 500);
  return json({ ok: true, action, username });
};

export const config = { path: '/api/setup' };
