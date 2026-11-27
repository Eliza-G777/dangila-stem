# Going live: setup guide (about 30 minutes, once)

The site runs in **demo mode** until a database is connected. Demo mode saves everything in one browser only, which is good for trying things out but not for a real class. These steps connect it for real. You need three free accounts: **GitHub**, **Netlify** and **Supabase**.

---

## Step 1. Put the code on GitHub

1. On github.com create a new repository called `danglila-stem-club`.
2. Click **Add file → Upload files**, drag in everything from this folder (including the `assets`, `content`, `netlify` and `supabase` folders) and click **Commit changes**.

## Step 2. Create the database (Supabase)

1. Go to **supabase.com**, sign in with GitHub and click **New project**. Name it `danglila-stem`, choose a strong database password (save it somewhere safe) and pick the region closest to Ethiopia (for example *Frankfurt* or *Mumbai*).
2. When it is ready, open **SQL Editor → New query**. Open the file `supabase/schema.sql`, copy all of it, paste it in, and click **Run**. You should see "Success".
3. Open **Authentication → Sign In / Providers** (on some versions: **Authentication → Settings**):
   - turn **off** "Allow new users to sign up" (only teachers create accounts),
   - under **Email**, turn **off** "Confirm email".
4. Create **your own admin account**: **Authentication → Users → Add user → Create new user**.
   - Email: `elizabeth@danglila-stem.netlify.app` (your username, then `@danglila-stem.netlify.app`; no email is ever sent there)
   - Password: choose one
   - Tick **Auto Confirm User**.
   The first account created becomes the **admin** automatically.
5. Set your display name: back in **SQL Editor**, run
   ```sql
   update profiles set full_name = 'Elizabeth Genetu' where username = 'elizabeth';
   ```
6. Open **Project Settings → API** (or **Data API** and **API Keys**). Keep this page open; you need three values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon / public key**: safe to put in the website
   - **service_role / secret key**: **secret**. Never put this in the website files or share it.

## Step 3. Connect the website to the database

On GitHub, open `assets/js/config.js`, click the pencil (edit) icon and fill in:

```js
supabaseUrl: 'https://abcd1234.supabase.co',
supabaseAnonKey: 'eyJhbGciOi...the anon public key...',
```

Commit the change.

## Step 4. Netlify

1. Open your project **danglila-stem-club** on app.netlify.com.
2. **Project configuration → Build & deploy → Link repository** and choose the GitHub repo. Leave the build command empty and set the publish directory to `.`.
3. **Project configuration → Environment variables → Add a variable**, and add three:
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** secret key (tick "Contains secret values") |
   | `LOGIN_DOMAIN` | `danglila-stem.netlify.app` |
4. **Project configuration → Access & security → Visitor access**: make sure the site is **not** password- or login-protected, so students can open it.
5. **Deploys → Trigger deploy → Deploy site**.
6. Optional: **Forms → Form notifications**, and add your email to hear about new members and experiment ideas.

## Step 5. Try it

1. Open https://danglila-stem-club.netlify.app and log in with your username (for example `elizabeth`) and password. The yellow "Demo mode" bar should be gone.
2. **Admin → Users → Add teachers** to create teacher logins. Print or copy the slips.
3. Teachers use **Students → Add students** to create student logins in bulk.
4. Teachers build exams in **Exam builder** and tick **Published** when they are ready.

---

## Everyday tasks

| Task | Where |
|---|---|
| Add an outside simulation (PhET, GeoGebra…) or a hands-on guide | Admin → Labs → Add a lab |
| Add a new subject (physics, Earth science…) | Admin → Subjects |
| Hide, show or reorder labs | Admin → Labs |
| Post a notice | Admin → Notices (teachers: Notices) |
| Create, publish, copy an exam | Exam builder |
| See class progress, download CSV | Students |
| Exam results and question analysis | Exam builder → Results |
| Reset a forgotten password | Students → the student → Reset password |
| Make someone a teacher or admin | Admin → Users → Role |
| Check a certificate is real | Footer → Check a certificate |

## If something goes wrong

- **"Wrong username or password" for everyone**: check that `loginDomain` in `config.js` and `LOGIN_DOMAIN` in Netlify are the same, and that "Confirm email" is off in Supabase.
- **"The server is not set up yet" when adding students**: the Netlify environment variables are missing. Add them, then redeploy.
- **Labs show but nothing saves**: `supabaseUrl` or `supabaseAnonKey` in `config.js` is wrong.
- **Backups**: Supabase → Database → Backups. On the free plan, also download CSVs from the Students page now and then.

## Keeping it safe

- Students can only see their own progress and results. Teachers see everyone's.
- Exam answers never reach students' browsers: marking happens inside the database.
- Only the admin can change roles, add labs or delete accounts.
- The service_role key lives only in Netlify's settings. If it ever leaks, create a new one in Supabase and update Netlify.
