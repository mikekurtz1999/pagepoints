// Supabase Edge Function: generate-quiz
// Proxies the Anthropic Claude API server-side so the API key never leaves Supabase.
// Deploy via the Supabase dashboard (Edge Functions → New Function → paste this).

// @ts-ignore — Deno globals are provided by the Supabase Edge runtime
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 5000;
const MAX_WEB_SEARCHES = 2;

const SYSTEM_PROMPT = `You are an expert reading-comprehension quiz writer for a gamified reading app.

YOUR PROCESS:
1. Use the web_search tool to research the specific book — look up plot summaries, character lists, key events, themes, and reviews. Make 2–4 searches to confirm details before writing questions. Prioritize sources like Wikipedia, official publisher pages, and reputable review sites.
2. Cross-reference at least two sources for any specific plot detail (chapter, location, character action, number, etc.) before using it in a question.
3. Then write the 10 questions, drawing on what you confirmed.

ACCURACY IS NON-NEGOTIABLE:
- Every factual claim in your questions and answers must be supported by your research.
- Do not invent characters, plot points, locations, or quotes.
- If your searches did not give you enough detail to support a specific question, write a different question — never guess.
- Pay attention to which book in a series you're being asked about. Do NOT pull events from other books in the series.

QUALITY BAR:
- The questions should challenge someone who actually read the book — not someone who only read the back cover. Probe motivation, theme, cause/effect, character arc, and significant plot turns.
- Avoid trivial recall ("what color was X's hat?") unless that detail is genuinely meaningful.
- Avoid questions answerable from the publisher description alone — go deeper.
- Distractors must be plausible-but-clearly-wrong to a real reader, not random fabrications.
- Each explanation must reference what actually happens in the book.

You write for a mixed audience of middle-school readers through adults.
You NEVER include spoilers for sequels or events beyond the book in question.

After your web research, output ONLY the raw JSON object — the very first character of your final message must be { and the very last must be }. No preamble, no "Here is the quiz", no markdown fences, no explanation. Just the JSON.`;

function buildUserPrompt(
  bookTitle: string,
  authorName: string,
  difficulty: string,
  bookDescription: string | null,
): string {
  const difficultyGuide = {
    easy: 'easy: surface-level plot and character facts',
    medium: 'medium: character motivation, themes, and cause/effect',
    hard: 'hard: literary devices, symbolism, authorial intent, subtle details',
  }[difficulty] ?? 'medium: character motivation, themes, and cause/effect';

  const descriptionBlock = bookDescription && bookDescription.trim().length > 50
    ? `Here is the official publisher description of the book — treat this as your primary source of truth. Do NOT contradict it. Do NOT invent plot details that go beyond it.

<book_description>
${bookDescription.trim()}
</book_description>

`
    : `No detailed description was provided. ONLY ask questions about themes, genre, setting at a high level, or other commonly-known aspects of this title. Do NOT invent specific plot points, character names, locations, or events.

`;

  return `${descriptionBlock}Generate a ${difficulty} difficulty, 10-question multiple-choice quiz for the book:

Title: "${bookTitle}"
Author: "${authorName}"

GROUNDING RULES (critical):
- Every question must be answerable from the description above OR from widely-known general facts about this specific book
- If you are even slightly unsure about a specific number, name, location, chapter, or event — DO NOT include it. Choose a different angle for that question.
- Distractors (wrong answers) should be plausible-but-clearly-wrong to a reader, not random fabrications
- The "explanation" field must reference content present in the description, not invented detail

Requirements:
- Exactly 10 questions
- Mix of question types: themes, character motivation, setting, cause/effect, tone — favor these over specific plot trivia unless the description supports it
- Each question has exactly 4 options (a, b, c, d)
- Exactly one correct answer per question
- Include a 1-2 sentence explanation grounded in the description
- Difficulty "${difficulty}" means: ${difficultyGuide}

Respond ONLY with this exact JSON structure, no other text:
{
  "quiz": {
    "difficulty": "${difficulty}",
    "questions": [
      {
        "question_text": "...",
        "option_a": "...",
        "option_b": "...",
        "option_c": "...",
        "option_d": "...",
        "correct_answer": "a",
        "explanation": "..."
      }
    ]
  }
}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY secret is not set on this Edge Function.' }, 500);
  }

  let body: { bookTitle?: string; authorName?: string; difficulty?: string; bookDescription?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { bookTitle, authorName, difficulty = 'medium', bookDescription = null } = body;
  if (!bookTitle || !authorName) {
    return json({ error: 'bookTitle and authorName are required' }, 400);
  }
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return json({ error: 'difficulty must be easy, medium, or hard' }, 400);
  }

  // Strip any HTML tags from the description (Google Books sometimes returns them).
  const cleanDescription = bookDescription
    ? bookDescription.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : null;

  const userPrompt = buildUserPrompt(bookTitle, authorName, difficulty, cleanDescription);

  const claudeRes = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: MAX_WEB_SEARCHES,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    console.error('[generate-quiz] Claude API non-2xx:', claudeRes.status, errText);
    return json({ error: `Claude API error: ${claudeRes.status} ${errText}` }, 502);
  }

  const claudeJson = await claudeRes.json();
  const blocks: Array<{ type: string; text?: string }> = Array.isArray(claudeJson.content)
    ? claudeJson.content
    : [];
  // Find the final text block — that's the JSON output. Earlier blocks may be tool use / search results.
  const finalText = [...blocks].reverse().find((b) => b.type === 'text' && typeof b.text === 'string');
  if (!finalText || !finalText.text) {
    console.error('[generate-quiz] Unexpected Claude response shape:', JSON.stringify(claudeJson).slice(0, 2000));
    return json({ error: 'Unexpected Claude response shape', detail: claudeJson }, 502);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(finalText.text));
  } catch (err) {
    console.error('[generate-quiz] Could not parse Claude JSON. Raw text:', finalText.text.slice(0, 1000));
    return json({ error: 'Claude returned invalid JSON', raw: finalText.text.slice(0, 500) }, 502);
  }

  if (!parsed.quiz || !Array.isArray(parsed.quiz.questions) || parsed.quiz.questions.length === 0) {
    return json({ error: 'Claude returned no questions', raw: parsed }, 502);
  }

  return json(parsed, 200);
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\n([\s\S]*?)\n```$/i;
  const m = trimmed.match(fence);
  return m ? m[1] : trimmed;
}

/**
 * Extracts the first complete JSON object from a string.
 * Handles cases where Claude adds preamble text before the JSON.
 */
function extractJson(text: string): string {
  const stripped = stripCodeFences(text);
  // Happy path — starts cleanly with {
  if (stripped.trimStart().startsWith('{')) return stripped.trimStart();
  // Find the first { and last } and extract everything between
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return stripped.slice(start, end + 1);
  }
  return stripped;
}
