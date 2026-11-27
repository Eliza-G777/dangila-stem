# Going live: setup guide (about 30 minutes, once)

The site runs in **demo mode** until a database is connected. Demo mode saves everything in one browser only, which is good for trying things out but not for a real class. These steps connect it for real. You need three free accounts: **GitHub**, **Netlify** and **Supabase**.

---

## Step 1. Put the code on GitHub

1. On github.com create a new repository called `dangila-stem`.
2. Click **Add file → Upload files**, drag in everything from this folder (including the `assets`, `content`, `netlify` and `supabase` folders) and click **Commit changes**.

## Step 2. Create the database (Supabase)

1. Go to **supabase.com**, sign in with GitHub and click **New project**. Name it `dangila-stem`, choose a strong database password (save it somewhere safe) and pick the region closest to Ethiopia (for example *Frankfurt* or *Mumbai*).
2. When it is ready, open **SQL Editor → New query**. Open the file `supabase/schema.sql`, copy all of it, paste it in, and click **Run**. You should see "Success".
3. Open **Authentication → Sign In / Providers** (on some versions: **Authentication → Settings**):
   - turn **off** "Allow new users to sign up" (only teachers create accounts),
   - under **Email**, turn **off** "Confirm email".
4. Create **your own admin account**: **Authentication → Users → Add user → Create new user**.
   - Email: `elizabeth@dangila-stem.netlify.app` (your username, then `@dangila-stem.netlify.app`; no email is ever sent there)
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

1. Open your project **dangila-stem** on app.netlify.com.
2. **Project configuration → Build & deploy → Link repository** and choose the GitHub repo. Leave the build command empty and set the publish directory to `.`.
3. **Project configuration → Environment variables → Add a variable**, and add three:
   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** secret key (tick "Contains secret values") |
   | `LOGIN_DOMAIN` | `dangila-stem.netlify.app` |
4. **Project configuration → Access & security → Visitor access**: make sure the site is **not** password- or login-protected, so students can open it.
5. **Deploys → Trigger deploy → Deploy site**.
6. Optional: **Forms → Form notifications**, and add your email to hear about new members and experiment ideas.

## Step 4b. Phase 2: AI tutor and coding lab

1. **Database:** in Supabase **SQL Editor → New query**, paste all of `supabase/phase2.sql` and click **Run**. This adds the Coding subject with four exercises, AI settings and daily limits.
2. **AI on Netlify:** nothing to install and no API key. Netlify's AI Gateway provides it, and the `package.json` file tells Netlify to install the small library the tutor needs.
   - Your Netlify team must be on a **credit-based plan** (Free, Personal or Pro). Check under **Billing**.
   - The AI only switches on **after the first production deploy**. Deploy once, then test.
   - Each question uses a small number of credits. Watch them in **Billing → Usage**, and set daily limits in the site's **Admin → AI tutor** tab (20 per student and 100 per teacher to start).
   - Optional: set an environment variable `AI_MODEL` to choose a different Claude model. The default is a fast, low-cost one.
3. **Python:** nothing to set up. It downloads into each student's browser the first time (about 10 MB), so the first run on a slow connection can take a minute.

## Step 5. Try it

1. Open https://dangila-stem.netlify.app and log in with your username (for example `elizabeth`) and password. The yellow "Demo mode" bar should be gone.
2. **Admin → Users → Add teachers** to create teacher logins. Print or copy the slips.
3. Teachers use **Students → Add students** to create student logins in bulk.
4. Teachers build exams in **Exam builder** and tick **Published** when they are ready.
5. Open a lab and press **Ask the tutor**. Ask something simple, such as "What is an acid?".
6. Open **Coding**, press **Run** on the first exercise, then fix the code and press **Check my answer**.

## Already set up with the old spelling "Danglila"?

The site now uses **Dangila** everywhere, including the login domain `dangila-stem.netlify.app`.
1. In Netlify → Environment variables, set `LOGIN_DOMAIN` to `dangila-stem.netlify.app`.
2. In Supabase → Authentication → Users, if your account's email ends in `@danglila-stem.netlify.app`, delete it and create it again as `elizabeth@dangila-stem.netlify.app` (Auto Confirm ticked). Then run, in the SQL Editor:
   ```sql
   update profiles set role = 'admin', full_name = 'Elizabeth Genetu' where username = 'elizabeth';
   update news set body = replace(body, 'Danglila', 'Dangila'), title = replace(title, 'Danglila', 'Dangila');
   ```

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
| AI daily limits, switch the tutor off | Admin → AI tutor |
| AI on or off for one subject, subject instructions for the tutor | Admin → Subjects → Edit |
| Add a Python exercise with automatic checks | Admin → Labs → Add a lab → Coding exercise |
| Draft exam questions with AI | Exam builder → Write questions with AI |

## If something goes wrong

- **"Wrong username or password" for everyone**: check that `loginDomain` in `config.js` and `LOGIN_DOMAIN` in Netlify are the same, and that "Confirm email" is off in Supabase.
- **"The server is not set up yet" when adding students**: the Netlify environment variables are missing. Add them, then redeploy.
- **Labs show but nothing saves**: `supabaseUrl` or `supabaseAnonKey` in `config.js` is wrong.
- **"The AI service is not active yet"**: do one production deploy, and check the team is on a credit-based plan with AI features enabled.
- **"You have used all … AI questions for today"**: raise the limit in Admin → AI tutor.
- **Python never finishes loading**: the school's internet may be blocking cdn.jsdelivr.net. Try another network once; after that it loads from the browser cache.
- **Backups**: Supabase → Database → Backups. On the free plan, also download CSVs from the Students page now and then.

## Keeping it safe

- Students can only see their own progress and results. Teachers see everyone's.
- Exam answers never reach students' browsers: marking happens inside the database.
- Only the admin can change roles, add labs or delete accounts.
- The service_role key lives only in Netlify's settings. If it ever leaks, create a new one in Supabase and update Netlify.
