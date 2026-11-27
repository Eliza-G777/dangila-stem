# Going live: setup guide

The site runs in **demo mode** until it is connected to a database. Demo mode saves everything in one browser only. You need three free accounts: **GitHub**, **Netlify** and **Supabase**.

You never need to edit `assets/js/config.js`. All settings go into Netlify.

---

## 1. Put the code on GitHub

1. Use your repository (for example `dangila-stem`).
2. Unzip the project, then **Add file → Upload files**, drag in **everything** from inside the folder, and **Commit changes**.

## 2. Prepare the database (Supabase)

1. In your Supabase project open **SQL Editor → New query**. Run these three files **in this order**, pasting each one in full and clicking **Run** (each should say "Success"):
   1. `supabase/schema.sql`: accounts, labs, exams, certificates
   2. `supabase/phase2.sql`: AI tutor and coding
   3. `supabase/phase3.sql`: courses, assignments, AI Studio models
   It is safe to run them again.
2. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Under **Email**, turn **off** "Confirm email".
3. **Project Settings → API Keys → Legacy API keys** (and **Data API** for the URL): keep this page open for step 3.

You do **not** need to create users in Supabase. The site does that.

## 3. Netlify settings

In Netlify, open your site **dangila-stem** → **Project configuration → Environment variables**. Add these five variables:

| Key | Value | Secret? |
|---|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://abcd1234.supabase.co` (nothing after `.co`) | no |
| `SUPABASE_ANON_KEY` | the **anon public** key (starts with `eyJ`) | no |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** key (starts with `eyJ`) | **yes** |
| `LOGIN_DOMAIN` | `dangila-stem.netlify.app` | no |
| `SETUP_CODE` | a secret word you choose, e.g. `Tana-Lake-2026` | **yes** |

Then:
- **Project configuration → Build & deploy**: the repository is linked, the build command is empty, and the publish directory is `.`.
- **Access & security → Visitor access**: turn **off** any team-login or password protection, so students can open the site.
- **Deploys → Trigger deploy → Deploy site**, and wait for **Published**.

## 4. Check everything and create your admin account

1. Open **https://dangila-stem.netlify.app/#setup** (or click **Setup** at the bottom of any page).
2. Every line should show a green ✓. Each red ✗ says exactly what to fix.
3. Use the form **Create or repair the admin account**: enter your `SETUP_CODE`, username `elizabeth`, your name and a new password. If an old account is broken, the same form repairs it.
4. Go to **Log in** and log in as `elizabeth`. The yellow "Demo mode" bar should be gone.

## 5. Add people and try the features

1. **Admin → Users → Add teachers**. Teachers use **Students → Add students** to create student logins and print the slips.
2. **Courses**: open "Electricity basics", or build your own with **+ New course**.
3. **Exam builder**: create and publish an exam.
4. **AI tutor and AI Studio**: these need Netlify's AI Gateway, which switches on after a production deploy on a **credit-based plan** (Free, Personal or Pro; check under **Billing**). Set daily limits and allowed models in **Admin → AI tutor**.
5. **Coding**: open the Coding lab and press **Run**. Python downloads (about 10 MB) the first time.

---

## Everyday tasks

| Task | Where |
|---|---|
| Switch language English ↔ Amharic | **አማርኛ / English** button at the top |
| Day or night mode | ☾ / ☀ button at the top |
| Create a course with lessons, videos, labs, exams and assignments | Courses → + New course |
| Mark assignments, see course progress | Course page → Progress report / an assignment |
| Add a lab without code (PhET, GeoGebra, hands-on guide, Python exercise) | Admin → Labs → Add a lab |
| Add a subject | Admin → Subjects |
| Post a notice | Admin → Notices (teachers: Notices) |
| Create, publish or copy an exam; write questions with AI | Exam builder |
| Class progress, CSV download | Students |
| Reset a forgotten password | Students → the student → Reset password |
| Make someone a teacher or admin | Admin → Users → Role |
| AI limits, models, AI on or off per subject | Admin → AI tutor, Admin → Subjects |
| Locked out of the admin account | /#setup → Create or repair the admin account |
| Check a certificate | Footer → Check a certificate |

## Improving the Amharic

All Amharic text is in `assets/js/i18n.js`, in the list called `AM`, as `'English on screen': 'Amharic'`. Edit any line on GitHub to improve a translation, or add new lines. Text people type (notices, course and lab titles) shows as it was written. To show something in both languages, write it in both.

## If something goes wrong

Open **/#setup** first: it checks every connection.
- **Website mode: DEMO**: `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing in Netlify, or you didn't redeploy after adding them.
- **"Wrong username or password"**: create or repair the admin on /#setup, then log in with that username and password.
- **"The setup code is wrong"**: type exactly the `SETUP_CODE` value from Netlify (it is case-sensitive).
- **"The AI service is not active yet"**: do one production deploy and check the plan has AI features.
- **Python never finishes loading**: the network may block cdn.jsdelivr.net. Try another network once.
- **Backups**: Supabase → Database → Backups. Also download CSVs from the Students page now and then.

## Keeping it safe

- Students see only their own progress, results and submissions. Teachers see everyone's.
- Exam answers never reach students' browsers. Students cannot give themselves grades.
- The service_role key and SETUP_CODE live only in Netlify (marked secret). The /#setup page never shows keys, names or emails.
- If a secret key leaks, create a new one in Supabase, update Netlify and redeploy.
