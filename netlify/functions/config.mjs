// Gives the website its public settings from Netlify environment variables,
// so nobody has to edit assets/js/config.js. The anon key is public by design (row-level security protects the data).
const normUrl = u => { u = String(u || '').trim(); const m = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i.exec(u); if (m) return `https://${m[1].toLowerCase()}.supabase.co`; const d = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(u); if (d) return `https://${d[1].toLowerCase()}.supabase.co`; return u.replace(/\/+$/, ''); };
export default async () => {
  const url = normUrl(process.env.SUPABASE_URL);
  const anon = (process.env.SUPABASE_ANON_KEY || '').trim();
  return new Response(JSON.stringify({ supabaseUrl: url, supabaseAnonKey: anon, loginDomain: (process.env.LOGIN_DOMAIN || 'dangila-stem.netlify.app').trim() }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
export const config = { path: '/api/config' };
