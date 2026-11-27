/* =====================================================================
   SITE SETTINGS — the only file you need to edit to go live.
   ===================================================================== */
STEM.CONFIG = {
  // Leave these two EMPTY: the site reads them from Netlify (SUPABASE_URL, SUPABASE_ANON_KEY).
  // Only fill them in if you host the site somewhere other than Netlify. Empty everywhere = DEMO mode.
  supabaseUrl: '',
  supabaseAnonKey: '',        // the "anon public" key (safe to put here)
  loginDomain: 'dangila-stem.netlify.app', // must match LOGIN_DOMAIN in Netlify (usernames become name@this-domain)
  usersApi: '/api/users',      // the Netlify function that creates accounts
  tutorApi: '/api/tutor',      // the Netlify function for the AI tutor
  schoolName: 'Dangila Secondary School',
  clubName: 'Dangila STEM Club'
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

/* Coding exercises used in demo mode (in live mode they come from supabase/phase2.sql and the Admin page). */
STEM.SEED_CODE_LABS = [
  { id: 'py-average', title: 'Python first steps: class average', level: 'Grade 9', blurb: 'Your first Python function: work out the average of a list of marks.',
    instructions: 'Finish the function average(marks) so it returns the average of the numbers in the list.\nPress Run to try it, then Check to test your answer.',
    starter_code: '# Finish the function so it returns the average of the marks.\ndef average(marks):\n    # Hint: use sum(marks) and len(marks)\n    return 0\n\nprint("Average:", average([70, 80, 90]))\n',
    tests: 'assert average([70, 80, 90]) == 80, "average([70, 80, 90]) should be 80"\nassert average([50]) == 50, "With one mark, the average is that mark"\nassert abs(average([1, 2]) - 1.5) < 1e-9, "average([1, 2]) should be 1.5"' },
  { id: 'py-ohms-law', title: 'Ohm\'s law calculator', level: 'Grade 9–10', blurb: 'Turn the formula V = I × R into Python functions for current and power.',
    instructions: 'Write current(voltage, resistance), which returns I = V ÷ R.\nThen write power(voltage, resistance), which returns P = V² ÷ R.\nCompare with the Ohm\'s law lab in Electricity.',
    starter_code: 'def current(voltage, resistance):\n    # I = V / R\n    return 0\n\ndef power(voltage, resistance):\n    # P = V * V / R\n    return 0\n\nprint("6 V across 3 ohms:", current(6, 3), "A and", power(6, 3), "W")\n',
    tests: 'assert current(6, 3) == 2, "current(6, 3) should be 2 A"\nassert current(12, 4) == 3, "current(12, 4) should be 3 A"\nassert power(6, 3) == 12, "power(6, 3) should be 12 W"\nassert abs(power(9, 2) - 40.5) < 1e-9, "power(9, 2) should be 40.5 W"' },
  { id: 'py-projectile', title: 'Physics with code: how far does a ball fly?', level: 'Grade 10–12', blurb: 'Use the projectile formula to find the best angle to throw, and draw a graph with matplotlib.',
    instructions: 'A ball thrown at speed v and angle θ on flat ground lands R = v² × sin(2θ) ÷ g away (g = 9.8 m/s²).\n1. Finish flight_range(speed, angle_deg). Remember math.sin needs radians: use math.radians().\n2. Run it and find which angle gives the longest throw.\n3. Bonus: remove the # signs at the bottom to draw a graph.',
    starter_code: 'import math\ng = 9.8\n\ndef flight_range(speed, angle_deg):\n    # R = v² × sin(2θ) / g\n    return 0\n\nfor angle in [15, 30, 45, 60, 75]:\n    print(angle, "degrees ->", round(flight_range(20, angle), 1), "m")\n\n# Bonus: draw the graph (remove the # signs below)\n# import matplotlib.pyplot as plt\n# angles = list(range(0, 91, 5))\n# plt.plot(angles, [flight_range(20, a) for a in angles])\n# plt.xlabel("Angle (degrees)")\n# plt.ylabel("Range (m)")\n# plt.show()\n',
    tests: 'assert abs(flight_range(10, 45) - 10.204) < 0.01, "flight_range(10, 45) should be about 10.2 m"\nassert abs(flight_range(10, 90)) < 1e-6, "Thrown straight up (90°), the ball lands where it started"\nassert abs(flight_range(20, 30) - 35.35) < 0.01, "flight_range(20, 30) should be about 35.35 m"' },
  { id: 'py-primes', title: 'Maths with code: prime numbers', level: 'Grade 9–11', blurb: 'Write a function that decides whether a number is prime, then list the primes below 100.',
    instructions: 'A prime number has exactly two factors: 1 and itself. 1 is not prime.\nFinish is_prime(n) so it returns True or False.\nHint: try dividing n by every number from 2 up to n − 1 (or up to √n to be faster).',
    starter_code: 'def is_prime(n):\n    # Return True if n is prime, otherwise False\n    return False\n\nprimes = [n for n in range(100) if is_prime(n)]\nprint(len(primes), "primes below 100:", primes)\n',
    tests: 'assert is_prime(2), "2 is prime"\nassert is_prime(13), "13 is prime"\nassert is_prime(97), "97 is prime"\nassert not is_prime(1), "1 is not prime"\nassert not is_prime(0), "0 is not prime"\nassert not is_prime(15), "15 = 3 × 5 is not prime"\nassert not is_prime(49), "49 = 7 × 7 is not prime"' }
];

/* AI models for AI Studio (demo mode and fallback). In live mode the admin edits this list in Admin → AI tutor.
   Model names change over time: check Netlify's AI Gateway documentation for the current ones. */
STEM.DEFAULT_AI_MODELS = [
  { key: 'claude', label: 'Claude', provider: 'anthropic', model: 'claude-haiku-5-5', enabled: true, staff_only: false },
  { key: 'gpt', label: 'ChatGPT', provider: 'openai', model: 'gpt-6-luna', enabled: true, staff_only: false },
  { key: 'gemini', label: 'Gemini', provider: 'gemini', model: 'gemini-3.8-flash', enabled: true, staff_only: false },
  { key: 'claude-pro', label: 'Claude (advanced)', provider: 'anthropic', model: 'claude-sonnet-5-5', enabled: true, staff_only: true }
];
