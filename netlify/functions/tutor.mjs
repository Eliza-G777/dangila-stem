// AI for the Dangila STEM Club through Netlify AI Gateway (no API keys: Netlify provides them).
// Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Optional: AI_MODEL (default tutor model).
//
// POST /api/tutor   Authorization: Bearer <Supabase access token>
//   { mode: "tutor",     subject_id, lab_id?, context?, messages, lang }      → { reply, used, limit }
//   { mode: "code",      subject_id, lab_id?, code, output, question?, lang } → { reply, used, limit }
//   { mode: "questions", subject_id, topic, count, grade }  (teachers)       → { questions }
//   { mode: "studio",    tool, model, messages, lang, subject_id? }           → { reply | cards | questions, model }
//   { mode: "models" }                                                        → { models }  (free, no quota)

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const DEFAULT_MODELS = [
  { key: 'claude', label: 'Claude', provider: 'anthropic', model: DEFAULT_MODEL, enabled: true, staff_only: false },
  { key: 'gpt', label: 'ChatGPT', provider: 'openai', model: 'gpt-6-luna', enabled: true, staff_only: false },
  { key: 'gemini', label: 'Gemini', provider: 'gemini', model: 'gemini-3.8-flash', enabled: true, staff_only: false }
];

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sb = (path, opt = {}) => fetch(SB_URL + path, { ...opt, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const one = async path => { const r = await sb(path); const rows = r.ok ? await r.json() : []; return rows[0] || null; };
const clip = (s, n) => String(s ?? '').slice(0, n);

const BASE = `You are an AI tutor for the STEM Club at Dangila Secondary School in Ethiopia. Your students are in grades 9 to 12.
How to teach:
- Be warm, patient and encouraging. Use simple, clear English. If the student writes in Amharic, answer in Amharic.
- Help the student think. Ask a guiding question or give a hint before giving a full answer. Give the full answer if they are still stuck after trying.
- Keep answers short: usually under 150 words. Use small numbered steps for calculations and always show units.
- Use everyday examples from Ethiopian life where they help (Lake Tana, injera, coffee ceremony, farming, local markets).
- Connect to the club's simulations when relevant.
- If you are not sure of something, say so.
Safety and honesty:
- Never give instructions for dangerous experiments, weapons, drugs, or anything that could hurt someone. For real experiments, remind students to work with a teacher and wear goggles.
- Do not write a student's homework, assignment or exam answers for them to copy; teach them how to get there.
- Stay on school and learning topics. Politely steer other topics back to learning.
Formatting: plain text. You may use **bold**, short bullet lists starting with "- ", and \`code\`. Use triple backticks for code blocks.`;

const TOOLS = {
  ask: { system: '', max: 900 },
  simple: { system: '\nTool: "Explain simply". Explain the topic the student gives as if to a 12-year-old: one everyday comparison, then 3 short points, then one check question. Under 120 words.', max: 600 },
  solve: { system: '\nTool: "Step-by-step solver". The student gives a maths or science problem. First list what is given and what is asked. Then solve in numbered steps with units, explaining each step in one line. End with the answer in bold and one similar practice problem (without its answer). If the student says it is homework or an exam question, give the method and first step only, then ask them to continue.', max: 1200 },
  translate: { system: '\nTool: "Translate". Translate the text the student gives between English and Amharic (if it is English, translate to Amharic; if Amharic, to English). Give the translation first. Then list up to 5 key science words with both languages, as "- English: Amharic". Keep scientific terms accurate.', max: 1000 },
  feedback: { system: '\nTool: "Feedback on my writing". The student pastes their own writing (an answer, report or essay). Do not rewrite it. Give: two specific strengths, two specific improvements with an example of how, and one question to make them think deeper. Check science facts and point out any mistakes kindly.', max: 900 },
  flashcards: { json: true, system: '\nTool: "Flashcards". Make 8 study flashcards on the topic the student gives, for grade 9–12. Reply with JSON only: {"cards":[{"front":"short question or term","back":"short, correct answer (under 30 words)"}]}', max: 1500 },
  quiz: { json: true, system: '\nTool: "Practice quiz". Write 5 multiple-choice questions on the topic the student gives, for grade 9–12, mixing easy and harder ones. Facts must be correct. Reply with JSON only: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"why":"one sentence"}]} where answer is the index of the correct option; vary its position.', max: 1800 }
};

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
async function modelList() {
  const row = await one('/rest/v1/app_settings?key=eq.ai_models&select=value').catch(() => null);
  const list = row && Array.isArray(row.value) && row.value.length ? row.value : DEFAULT_MODELS;
  return list.filter(m => m && m.key && m.provider && m.model);
}

// One call to any provider through the gateway. messages: [{role:'user'|'assistant', content}]
async function callModel({ provider, model }, system, messages, max) {
  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const r = await new Anthropic().messages.create({ model, max_tokens: max, system, messages });
    return (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  }
  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const r = await new OpenAI().chat.completions.create({ model, max_completion_tokens: max, messages: [{ role: 'system', content: system }, ...messages] });
    return ((r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || '').trim();
  }
  if (provider === 'gemini') {
    const { GoogleGenAI } = await import('@google/genai');
    const r = await new GoogleGenAI({}).models.generateContent({
      model, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: { systemInstruction: system, maxOutputTokens: max }
    });
    return String(r.text || '').trim();
  }
  throw new Error('Unknown provider ' + provider);
}

const parseJSON = t => { const a = t.indexOf('{'), b = t.lastIndexOf('}'); return JSON.parse(t.slice(a, b + 1)); };
const cleanMessages = list => {
  const m = (Array.isArray(list) ? list : []).slice(-12).filter(x => x && (x.role === 'user' || x.role === 'assistant') && x.content)
    .map(x => ({ role: x.role, content: clip(x.content, 4000) }));
  while (m.length && m[0].role !== 'user') m.shift();
  // providers need alternating turns: merge repeats
  return m.reduce((o, x) => { if (o.length && o[o.length - 1].role === x.role) o[o.length - 1].content += '\n\n' + x.content; else o.push(x); return o; }, []);
};

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!SB_URL || !KEY) return json({ error: 'The server is not set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify.' }, 500);

  const me = await caller(req);
  if (!me) return json({ error: 'Please log in again.' }, 401);
  let body; try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const mode = body.mode || 'tutor';
  const staff = me.role === 'teacher' || me.role === 'admin';
  const models = await modelList();
  const allowed = models.filter(m => m.enabled !== false && (!m.staff_only || staff));
  if (mode === 'models') return json({ models: allowed.map(({ key, label, provider }) => ({ key, label, provider })) });

  if (!process.env.ANTHROPIC_BASE_URL && !process.env.OPENAI_BASE_URL && !process.env.NETLIFY_AI_GATEWAY_URL && !process.env.ANTHROPIC_API_KEY)
    return json({ error: 'The AI service is not active yet. It turns on after the first production deploy on a Netlify credit-based plan.' }, 503);

  const subject = body.subject_id ? await one(`/rest/v1/subjects?id=eq.${encodeURIComponent(body.subject_id)}&select=id,name,description,ai_enabled,ai_instructions`) : null;
  const lab = body.lab_id ? await one(`/rest/v1/labs?id=eq.${encodeURIComponent(body.lab_id)}&select=id,title,blurb,instructions,kind`) : null;
  if (subject && subject.ai_enabled === false && !staff) return json({ error: `The AI tutor is turned off for ${subject.name}.` }, 403);
  if (mode === 'questions' && !staff) return json({ error: 'Only teachers can generate exam questions.' }, 403);

  // which model: studio lets the student choose from the admin's list; other modes use the first Claude model
  let chosen = allowed.find(m => m.key === body.model) || allowed.find(m => m.provider === 'anthropic') || allowed[0] || DEFAULT_MODELS[0];
  if (mode !== 'studio') chosen = allowed.find(m => m.provider === 'anthropic') || DEFAULT_MODELS[0];
  if (mode === 'studio' && body.model && !allowed.some(m => m.key === body.model)) return json({ error: 'That AI model is not available.' }, 403);

  const quota = await take(me.id);
  if (!quota.allowed) {
    const msg = quota.reason === 'off' ? 'The AI is turned off by the club admin.'
      : quota.reason === 'limit' ? `You have used all ${quota.limit} AI questions for today. Try again tomorrow, or ask your teacher.`
      : 'The AI is not available right now.';
    return json({ error: msg, limit: quota.limit }, 429);
  }

  let system = BASE;
  if (subject) system += `\n\nSubject: ${subject.name}. ${subject.description || ''}${subject.ai_instructions ? '\nTeacher instructions for this subject: ' + subject.ai_instructions : ''}`;
  if (lab) system += `\n\nThe student is working on the lab "${lab.title}": ${lab.blurb || ''}${lab.instructions ? '\nLab task: ' + clip(lab.instructions, 1500) : ''}`;
  if (body.context) system += `\n\nThe student is studying this lesson:\n${clip(body.context, 3000)}`;
  if (me.grade) system += `\nThe student is in ${me.grade}.`;
  if (body.lang === 'am') system += '\nThe student has chosen Amharic: reply in Amharic (keep standard scientific symbols and units).';

  try {
    if (mode === 'questions') {
      const count = Math.min(Math.max(parseInt(body.count, 10) || 5, 1), 15);
      const prompt = `Write ${count} multiple-choice exam questions for ${clip(body.grade, 30) || 'grade 9–12'} students on: ${clip(body.topic, 300)} (subject: ${subject ? subject.name : 'science'}).
Each question has 4 options and exactly one correct answer. Mix easy and harder questions. Use clear, simple English; facts must be correct.
Reply with JSON only: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"one sentence"}]} where answer is the index (0–3) of the correct option; vary its position.`;
      const t = await callModel(chosen, 'You write accurate school exam questions. Output valid JSON only.', [{ role: 'user', content: prompt }], 3000);
      let qs; try { qs = parseJSON(t).questions || []; } catch { return json({ error: 'The AI answer could not be read. Please try again.' }, 502); }
      qs = qs.filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
        .map(q => ({ question: clip(q.question, 600), options: q.options.slice(0, 6).map(o => clip(o, 200)), answer: q.answer, points: 1, explanation: clip(q.explanation, 300) }));
      return json({ questions: qs, used: quota.used, limit: quota.limit });
    }

    if (mode === 'studio') {
      const tool = TOOLS[body.tool] || TOOLS.ask;
      const msgs = cleanMessages(body.messages);
      if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'Type something first.' }, 400);
      const t = await callModel(chosen, system + tool.system, tool.json ? [msgs[msgs.length - 1]] : msgs, tool.max);
      const base = { model: chosen.label, used: quota.used, limit: quota.limit };
      if (tool.json) {
        let d; try { d = parseJSON(t); } catch { return json({ error: 'The AI answer could not be read. Please try again or choose another model.' }, 502); }
        if (body.tool === 'flashcards') return json({ ...base, cards: (d.cards || []).filter(c => c && c.front && c.back).slice(0, 12).map(c => ({ front: clip(c.front, 200), back: clip(c.back, 400) })) });
        return json({ ...base, questions: (d.questions || []).filter(q => q && q.question && Array.isArray(q.options) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).slice(0, 10)
          .map(q => ({ question: clip(q.question, 500), options: q.options.slice(0, 6).map(o => clip(o, 200)), answer: q.answer, why: clip(q.why, 300) })) });
      }
      return json({ ...base, reply: t || 'Sorry, no answer came back. Try another model.' });
    }

    let messages;
    if (mode === 'code') {
      messages = [{ role: 'user', content: `I am working on this Python code:\n\`\`\`python\n${clip(body.code, 6000)}\n\`\`\`\nWhen I run it, I get:\n\`\`\`\n${clip(body.output, 2500) || '(no output)'}\n\`\`\`\n${clip(body.question, 600) || 'Please help me understand what is wrong and give me a hint to fix it. Do not rewrite the whole program for me.'}` }];
    } else {
      messages = cleanMessages(body.messages);
      if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Type a question first.' }, 400);
    }
    const reply = await callModel(chosen, system, messages, 900);
    return json({ reply: reply || 'Sorry, I could not answer that. Try asking in a different way.', used: quota.used, limit: quota.limit });
  } catch (e) {
    console.error(e);
    return json({ error: `The AI (${chosen.label}) had a problem. Please try again in a minute${mode === 'studio' ? ' or choose another model' : ''}.` }, 502);
  }
};

export const config = { path: '/api/tutor' };
