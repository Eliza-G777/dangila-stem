# Danglila STEM Club platform

The learning website of the STEM Club at Danglila Secondary School: interactive chemistry, electricity, biology and maths labs, with student accounts, progress tracking, exams and certificates.

**To go live, follow [SETUP.md](SETUP.md).** Until then the site runs in demo mode, with accounts `elizabeth / admin123`, `teacher / teacher123` and `abebe / student123`.

## What it does

| Students | Teachers | Admin |
|---|---|---|
| Use labs; time and activity are tracked automatically | Create student logins in bulk and print login slips | Everything teachers can do, plus: |
| See progress per subject and what to do next | Build exams (or paste questions from text), publish, copy | Add labs with no code: outside simulations (PhET, GeoGebra) or hands-on guides |
| Take timed exams, marked straight away | Results per exam with question analysis, CSV download | Add, hide and reorder subjects and labs |
| Earn certificates: Explorer, Investigator, Scientist, STEM Scholar | Class progress table and a report for each student | Manage teacher accounts and roles |
| Print certificates; anyone can verify the code | Post notices | |

## Certificate levels (per subject)

1. **Explorer**: open every lab
2. **Investigator**: complete every lab and pass at least one exam
3. **Scientist**: pass at least two exams with a best-score average of 85% or more
4. **STEM Scholar**: Investigator in every subject

A lab counts as completed after 2 minutes of active use (and 10 actions in built-in simulations). You can change the rules in `supabase/schema.sql` (functions `track_lab` and `certificate_status`) and in `assets/js/store.js` for demo mode.

## How it is built

- Plain HTML, CSS and JavaScript, with no build step. Hosted on **Netlify**.
- **Supabase** (Postgres) stores accounts, progress, exams and certificates. Row-level security means students only ever see their own data. Exam marking and certificates are issued inside the database.
- One **Netlify Function** (`netlify/functions/users.mjs`) creates accounts, because that needs the secret service key.

```
index.html                    page shell, home, club and guide pages
assets/css/style.css          all styles
assets/js/core.js             shared helpers
assets/js/config.js           SETTINGS: Supabase keys, certificate level names
assets/js/sims/*.js           one file per built-in simulation
assets/js/store.js            data layer (Supabase, or demo mode in the browser)
assets/js/ui.js               UI helpers (tables, dialogs, toasts)
assets/js/pages/labs.js       lab pages and automatic progress tracking
assets/js/pages/account.js    login, dashboard, certificates, verification
assets/js/pages/exams.js      taking exams, exam builder, results
assets/js/pages/staff.js      teacher overview, students, student reports
assets/js/pages/admin.js      labs, subjects, users, notices
assets/js/app.js              menus and router
content/quizzes.json          "Check yourself" practice questions on lab pages
netlify/functions/users.mjs   account creation (server side)
supabase/schema.sql           database, security rules and starting content
```

## Adding a coded simulation

Copy a file in `assets/js/sims/`, change its `id`, `subject`, `title` and `mount` code, add its `<script>` line to `index.html` before `store.js`, and commit. Then open **Admin → Labs** and press **Add them to the site**.

## Coming in phase 2

- AI tutor for each subject (Netlify AI Gateway, with a daily limit per student)
- Coding lab with an in-browser Python editor
# dangila-stem
# dangila-stem
