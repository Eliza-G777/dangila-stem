/* #setup: checks every connection and creates or repairs the admin account. */
(() => {
const ui = STEM.ui, { E } = ui;
const row = (ok, title, fix) => `<li class="ck ${ok === true ? 'ok' : ok === false ? 'bad' : 'unk'}"><span class="ic">${ok === true ? '✓' : ok === false ? '✗' : '?'}</span><div><b>${title}</b>${ok === true || !fix ? '' : `<p class="note">${fix}</p>`}</div></li>`;

STEM.pages.push({
  name: 'setup', match: r => r === 'setup' ? {} : null,
  async render(el) {
    el.innerHTML = ui.band('Site setup and check', 'Everything the login system needs, checked in one place. No secrets are shown on this page.') + `<div class="band"><div class="wrap narrow2">${ui.loading}</div></div>`;
    const wrap = el.querySelector('.band:last-child .wrap');
    let h = null, err = '';
    try {
      const r = await fetch('/api/setup', { cache: 'no-store' });
      if (r.ok && /json/.test(r.headers.get('content-type') || '')) h = await r.json(); else err = 'The setup check (/api/setup) did not answer. This page only works on your Netlify site, after the latest files are deployed.';
    } catch (e) { err = 'The setup check could not be reached. This page only works on your Netlify site.'; }
    const live = STEM.store.mode === 'live';
    const items = [];
    items.push(row(live, `Website mode: ${live ? 'LIVE (connected to Supabase)' : 'DEMO (not connected)'}`,
      'The site could not get its Supabase settings. Add SUPABASE_URL and SUPABASE_ANON_KEY in Netlify → Environment variables, then redeploy.'));
    if (h) {
      const v = h.env;
      items.push(row(v.SUPABASE_URL, 'Netlify variable SUPABASE_URL', 'Add it: your Project URL from Supabase → Project Settings → Data API.'));
      items.push(row(v.SUPABASE_URL ? h.urlLooksRight : null, 'SUPABASE_URL has the right form (https://xxxx.supabase.co)', 'Copy the Project URL again. It must start with https:// and end in .supabase.co, with nothing after it.'));
      items.push(row(v.SUPABASE_ANON_KEY, 'Netlify variable SUPABASE_ANON_KEY', 'Add it: the anon public key (starts with eyJ) from Supabase → Project Settings → API Keys → Legacy API keys.'));
      items.push(row(h.anonOk, 'Supabase accepts the anon key', 'The anon key or URL is wrong, or they come from two different Supabase projects. Copy both again from the same project.'));
      items.push(row(v.SUPABASE_SERVICE_ROLE_KEY, 'Netlify variable SUPABASE_SERVICE_ROLE_KEY', 'Add it (mark it secret): the service_role key from the same Legacy API keys page.'));
      items.push(row(h.serviceOk, 'Supabase accepts the service_role key', 'The service_role key is wrong or from another project. Copy it again, save it in Netlify and redeploy.'));
      items.push(row(h.schema, 'Database tables (schema.sql)', 'In Supabase → SQL Editor, run all of supabase/schema.sql.'));
      items.push(row(h.phase2, 'Phase 2 tables: AI tutor and coding (phase2.sql)', 'Run supabase/phase2.sql in the SQL Editor (after schema.sql).'));
      items.push(row(h.phase3, 'Phase 3 tables: courses and assignments (phase3.sql)', 'Run supabase/phase3.sql in the SQL Editor (after phase2.sql).'));
      items.push(row(h.admins == null ? null : h.admins > 0, `Admin account${h.admins ? `: ${h.admins} found` : ''}`, 'Create it with the form below.'));
      if (h.usersWithoutProfile) items.push(row(false, `${h.usersWithoutProfile} login(s) without a profile`, 'Probably created before schema.sql was run. Use the form below with the same username to repair your admin account. Students can be deleted and created again from the site.'));
      if (h.usersOtherDomain) items.push(row(false, `${h.usersOtherDomain} login(s) with an email not ending in @${E(v.LOGIN_DOMAIN)}`, `The site turns a username into username@${E(v.LOGIN_DOMAIN)}. Accounts with other emails can only log in by typing their full email. Simplest fix: create your admin again with the form below.`));
      items.push(row(v.SETUP_CODE, 'Netlify variable SETUP_CODE (needed for the form below)', 'Add SETUP_CODE with any secret word you choose (mark it secret), then redeploy.'));
      items.push(row(h.ai, 'AI service (Netlify AI Gateway)', 'Switches on after a production deploy on a credit-based Netlify plan. Only needed for the AI tutor and AI Studio.'));
    }
    wrap.innerHTML = `${err ? `<div class="out badbox"><p>${E(err)}</p></div>` : ''}
      <ul class="checklist">${items.join('')}</ul>
      <form class="card stackform adminform">
        <h3>Create or repair the admin account</h3>
        <p class="note">This creates your admin login${h ? ` as <b>username@${E(h.env.LOGIN_DOMAIN)}</b>` : ''}. If the account already exists, it sets the new password and makes sure it is admin. Protected by the SETUP_CODE you put in Netlify.</p>
        <label>Setup code<input name="code" type="password" required autocomplete="off"></label>
        <label>Username<input name="username" required value="elizabeth" autocapitalize="none" spellcheck="false"></label>
        <label>Full name<input name="full_name" value="Elizabeth Genetu"></label>
        <label>New password (at least 6 characters)<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
        <button class="btn y">Create or repair admin</button><p class="formmsg" aria-live="polite"></p>
      </form>
      <p class="note">Everything green? <a href="#login">Go to the login page</a>.</p>`;
    const f = wrap.querySelector('.adminform');
    f.onsubmit = async e => {
      e.preventDefault(); const msg = f.querySelector('.formmsg'); msg.textContent = 'Working…';
      try {
        const r = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: f.code.value, username: f.username.value, full_name: f.full_name.value, password: f.password.value }) });
        const d = await r.json().catch(() => ({ error: 'No answer from the server. Is the site deployed on Netlify?' }));
        if (!r.ok || d.error) throw new Error(d.error || 'Failed');
        msg.innerHTML = `✓ Admin account ${d.action}. Log in with username <b>${E(d.username)}</b> and your new password. <a href="#login">Go to login</a>`;
        f.password.value = '';
      } catch (er) { msg.textContent = ui.err(er); }
    };
  }
});
})();
