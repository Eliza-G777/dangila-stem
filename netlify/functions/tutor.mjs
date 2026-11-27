// AI tutor for the Dangila STEM Club, using Netlify AI Gateway (no API key needed: Netlify provides it).
// Needs the same environment variables as users.mjs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: AI_MODEL to choose another Claude model.
//
// POST /api/tutor   Authorization: Bearer <Supabase access token>
//   { mode: "tutor",     subject_id, lab_id?, messages: [{role, content}] }   → { reply, used, limit }
//   { mode: "code",      subject_id, lab_id?, code, output, question? }       → { reply, used, limit }
//   { mode: "questions", subject_id, topic, count, grade }  (teachers only)  → { questions: [...] }
import Anthropic from '@anthropic-ai/sdk';

const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sb = (path, opt = {}) => fetch(SB_URL + path, { ...opt, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const one = async path => { const r = await sb(path); const rows = r.ok ? await r.json() : []; return rows[0] || null; };
const clip = (s, n) => String(s ?? '').slice(0, n);

const BASE = `You are the AI tutor of the STEM Club at Dangila Secondary School in Ethiopia. Your students are in grades 9 to 12.
How to teach:
- Be warm, patient and encouraging. Use simple, clear English. If the student writes in Amharic, answer in Amharic.
- Help the student think. Ask a guiding question or give a hint before giving a full answer. Give the full answer if they are still stuck after trying.
- Keep answers short: usually under 150 words. Use small numbered steps for calculations and always show units.
- Use everyday examples from Ethiopian life where they help (Lake Tana, injera, coffee ceremony, farming, local markets).
- Connect to the club's simulations when relevant, e.g. "try changing the resistance in the circuit lab".
- If you are not sure of something, say so.
Safety and honesty:
- Never give instructions for dangerous experiments, weapons, drugs, or anything that could hurt someone. For real experiments, remind students to work with a teacher and wear goggles.
- Do not write a student's homework or exam answers for them to copy; teach them how to get there.
- Stay on school and science topics. Politely steer other topics back to learning.
Formatting: plain text. You may use **bold**, short bullet lists starting with "- ", and \`code\`. Use triple backticks for code blocks.`;

async function caller(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return one(`/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=id,full_name,role,grade`);
}

async function take(userId) {
  const r = await sb('/rest/v1/rpc/ai_take', { method: 'POST', body: JSON.stringify({ p_user: userId }) });
  return r.ok ? r.json() : { allowed: false, reason: 'error' };
}

function contextFor(subject, lab, me) {
  let s = BASE;
  if (subject) s += `\n\nSubject: ${subject.name}. ${subject.description || ''}`;
  if (subject && subject.ai_instructions) s += `\nThe teacher's instructions for this subject: ${subject.ai_instructions}`;
  if (lab) s += `\n\nThe student is working on the lab "${lab.title}": ${lab.blurb || ''}${lab.instructions ? '\nLab task: ' + clip(lab.instructions, 1500) : ''}`;
  if (me && me.grade) s += `\nThe student is in ${me.grade}.`;
  return s;
}

const textOf = msg => (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!SB_URL || !KEY) return json({ error: 'The server is not set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.' }, 500);
  if (!process.env.ANTHROPIC_BASE_URL && !process.env.ANTHROPIC_API_KEY) return json({ error: 'The AI service is not active yet. It turns on after the first production deploy on a Netlify credit-based plan.' }, 503);

  const me = await caller(req);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const mode = body.mode || 'tutor';
  const staff = me.role === 'teacher' || me.role === 'admin';

  const subject = body.subject_id ? await one(`/rest/v1/subjects?id=eq.${encodeURIComponent(body.subject_id)}&select=id,name,description,ai_enabled,ai_instructions`) : null;
  const lab = body.lab_id ? await one(`/rest/v1/labs?id=eq.${encodeURIComponent(body.lab_id)}&select=id,title,blurb,instructions,kind`) : null;
  if (subject && subject.ai_enabled === false && !staff) return json({ error: `The AI tutor is turned off for ${subject.name}.` }, 403);
  if (mode === 'questions' && !staff) return json({ error: 'Only teachers can generate exam questions.' }, 403);

  const quota = await take(me.id);
  if (!quota.allowed) {
    const msg = quota.reason === 'off' ? 'The AI tutor is turned off by the club admin.'
      : quota.reason === 'limit' ? `You have used all ${quota.limit} AI questions for today. Try again tomorrow, or ask your teacher.`
      : 'The AI tutor is not available right now.';
    return json({ error: msg, limit: quota.limit }, 429);
  }

  const ai = new Anthropic();
  try {
    if (mode === 'questions') {
      const count = Math.min(Math.max(parseInt(body.count, 10) || 5, 1), 15);
      const prompt = `Write ${count} multiple-choice exam questions for ${clip(body.grade, 30) || 'grade 9–12'} students on: ${clip(body.topic, 300)} (subject: ${subject ? subject.name : 'science'}).
Each question has 4 options and exactly one correct answer. Mix easy and harder questions. Use clear, simple English; facts must be correct.
Reply with JSON only, no other text, in this shape:
{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"one sentence"}]}
"answer" is the index (0–3) of the correct option. Vary which position the correct answer is in.`;
      const msg = await ai.messages.create({ model: MODEL, max_tokens: 3000, system: 'You write accurate school exam questions. Output valid JSON only.', messages: [{ role: 'user', content: prompt }] });
      const t = textOf(msg), a = t.indexOf('{'), b = t.lastIndexOf('}');
      let qs = [];
      try { qs = JSON.parse(t.slice(a, b + 1)).questions || []; } catch { return json({ error: 'The AI answer could not be read. Please try again.' }, 502); }
      qs = qs.filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
        .map(q => ({ question: clip(q.question, 600), options: q.options.slice(0, 6).map(o => clip(o, 200)), answer: q.answer, points: 1, explanation: clip(q.explanation, 300) }));
      return json({ questions: qs, used: quota.used, limit: quota.limit });
    }

    let messages;
    if (mode === 'code') {
      messages = [{ role: 'user', content: `I am working on this Python code:\n\`\`\`python\n${clip(body.code, 6000)}\n\`\`\`\nWhen I run it, I get:\n\`\`\`\n${clip(body.output, 2500) || '(no output)'}\n\`\`\`\n${clip(body.question, 600) || 'Please help me understand what is wrong and give me a hint to fix it. Do not rewrite the whole program for me.'}` }];
    } else {
      messages = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map(m => ({ role: m.role, content: clip(m.content, 2500) }));
      while (messages.length && messages[0].role !== 'user') messages.shift();
      if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Type a question first.' }, 400);
    }
    const msg = await ai.messages.create({ model: MODEL, max_tokens: 900, system: contextFor(subject, lab, me), messages });
    return json({ reply: textOf(msg) || 'Sorry, I could not answer that. Try asking in a different way.', used: quota.used, limit: quota.limit });
  } catch (e) {
    console.error(e);
    return json({ error: 'The AI tutor had a problem. Please try again in a minute.' }, 502);
  }
};

export const config = { path: '/api/tutor' };
