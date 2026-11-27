// Gives the website its public settings from Netlify environment variables,
// so nobody has to edit assets/js/config.js. The anon key is public by design (row-level security protects the data).
export default async () => {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anon = (process.env.SUPABASE_ANON_KEY || '').trim();
  return new Response(JSON.stringify({ supabaseUrl: url, supabaseAnonKey: anon, loginDomain: (process.env.LOGIN_DOMAIN || 'dangila-stem.netlify.app').trim() }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};
export const config = { path: '/api/config' };
