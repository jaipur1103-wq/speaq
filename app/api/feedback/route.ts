import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };
type ErrorClassification = { turn: number; errorType: "grammar" | "collocation" | "literal" | "register" | "NONE"; phrase: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

    // Step 1: Classify each turn for genuine errors
    const step1 = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an English error detector. Return only valid JSON. No markdown, no backticks." },
        {
          role: "user",
          content: `For each turn below, classify the user's English response.

Error categories:
- "grammar": definite grammar rule violation (wrong verb form, missing article when required, subject-verb agreement, etc.)
- "collocation": wrong word combination that a native speaker would not use (e.g. "big potential" instead of "great potential")
- "literal": direct translation from another language that fails in English
- "register": formal/informal mismatch that significantly hurts communication in this context
- "NONE": the English is correct (contractions vs. full forms, synonyms, stylistic choices, minor formality variation — these are NOT errors)

Scenario: ${scenario.title}
Difficulty: ${scenario.difficulty}

${turnsText}

Return a JSON array only:
[{ "turn": 1, "errorType": "NONE", "phrase": "" }, ...]`,
        },
      ],
      temperature: 0,
      max_tokens: 400,
    });

    const step1Text = step1.choices[0].message.content?.trim() ?? "";
    const step1Match = step1Text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim().match(/\[[\s\S]*\]/);
    let errorTurns: ErrorClassification[] = [];
    if (step1Match) {
      const parsed: ErrorClassification[] = JSON.parse(step1Match[0]);
      errorTurns = parsed.filter(c => c.errorType !== "NONE");
    }

    // Step 2: Full feedback, improvements only for confirmed error turns
    const improvementsInstruction = errorTurns.length === 0
      ? `- "improvements": Return []. No errors were found in this session.`
      : `- "improvements": Generate improvements ONLY for these confirmed error turns: ${errorTurns.map(c => `Turn ${c.turn} (${c.errorType} error, phrase: "${c.phrase}")`).join("; ")}. Max 2 items.
  Each item is an object:
  - "comment": Quote the user's phrase using 「」, suggest a better version for difficulty=${scenario.difficulty} (beginner=A2 / intermediate=B1-B2 / advanced=C1-C2), name the exact rule or reason (the error type is ${errorTurns.map(c => c.errorType).join("/")}), add one sentence about why it matters in THIS scenario context.
    FORBIDDEN: Never write "more natural", "sounds better", "more commonly used", "sounds awkward".${isJa ? " Write in Japanese." : ""}
  - "suggestedResponse": A full, natural English response for the TURN where this issue occurred.`;

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write encouragement, strengths, improvements[].comment, and naturalExpressions[].explanation and naturalExpressions[].chunkDetail in Japanese. All other fields (original, natural, chunk, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: `${isJa ? "⚠️ MANDATORY: Write encouragement, strengths[], improvements[].comment, naturalExpressions[].explanation, naturalExpressions[].chunkDetail IN JAPANESE.\n\n" : ""}Analyze this English conversation session (${turns.length} turn${turns.length > 1 ? "s" : ""}).

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
Counterpart: ${scenario.personaName} (${scenario.personaRole})
${turnsText}

IMPORTANT: This is TRANSCRIBED VOICE INPUT — no punctuation exists. Do NOT mention punctuation anywhere.

CRITICAL RULES:

- "encouragement": One sentence. Honest overall impression of the session.${isJa ? " Write in Japanese." : ""}

- "strengths": 1-3 items. Variable — only include genuine strengths worth noting. No axis labels.
  Each item: quote the user's actual phrase using 「」, then explain the specific linguistic feature that makes it effective.
  FORBIDDEN: vague praise like "good job", "well done", "natural English". Always name the specific feature.
  ${isJa ? "Write in Japanese. Example: 「I was wondering if ~」という形を使えていました。ネイティブが依頼するときによく使う丁寧な構造で、相手への配慮が自然に伝わります。" : "Example: You used 「I was wondering if ~」— this is the standard native structure for polite requests, far more natural than 「Can you ~」in professional contexts."}

${improvementsInstruction}

- "naturalExpressions": ${errorTurns.length === 0 ? 'Return []. No errors were confirmed.' : `Pick 2-4 items based on the confirmed improvements. LEVEL FILTER — beginner: A2 only; intermediate: B1-B2 only; advanced: C1-C2 only.`}
- "naturalExpressions[].reason": grammar / collocation / literal / set-phrase / formality / nuance
- "naturalExpressions[].explanation": 1-2 sentences. FORBIDDEN: "more natural", "sounds better", "more commonly used". Required angle — grammar: cite exact rule; collocation: name wrong pair and correct pairs; literal: name source and why it fails; set-phrase: what fixed expression is expected; formality: name register and mismatch; nuance: contrast what original vs natural implies.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].natural": Minimal fix only. For collocation: swap only the problematic word. For grammar: fix only the error. Do NOT restructure the whole sentence.
- "naturalExpressions[].chunk": Extracted DIRECTLY from natural. Collocation / phrasal verb / idiom / set phrase / discourse marker. Replace variable content with ~. Keep 3-8 words. NEVER write a full sentence. NEVER output a single isolated word — even with ~ (minimum 3 words required). BAD: 「It's ~」「from ~ to ~」「I ~ ~」「the ~ of ~」「be ~」GOOD: 「run into ~ issues」「It might be worth ~ing」「Having said that, ~」「have great potential」
- "naturalExpressions[].chunkDetail": What ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": One short English sentence using the chunk.

EXAMPLES of ideal naturalExpression quality:
Collocation: { "original": "it has the big potential", "natural": "it has great potential", "reason": "collocation", "explanation": "「big」does not collocate with「potential」. Natural pairings: great / enormous / tremendous potential.", "chunk": "have great potential", "chunkDetail": "「great potential」is a fixed collocation. Use have/show great potential to say something is very promising.", "example": "This approach has great potential for cutting costs." }
Grammar: { "original": "I look forward to see you", "natural": "I look forward to seeing you", "reason": "grammar", "explanation": "「look forward to」requires a gerund (-ing) because「to」here is a preposition, not an infinitive marker.", "chunk": "look forward to ~ing", "chunkDetail": "After「look forward to」, always use the -ing form. ~ing is the activity you are anticipating.", "example": "I look forward to hearing your thoughts." }

Return ONLY valid JSON:
{
  "encouragement": "<${isJa ? "日本語で1文：セッション全体への正直な印象" : "one honest sentence about the session"}>",
  "strengths": ["<${isJa ? "「ユーザーの発言」＋ なぜ良いか（言語的な理由）" : "「user phrase」+ specific linguistic feature that makes it effective"}>"],
  "improvements": [],
  "naturalExpressions": []
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const stripped = text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");
    const data = JSON.parse(jsonMatch[0]);

    // Enforce: if no error turns were confirmed, override improvements and naturalExpressions
    if (errorTurns.length === 0) {
      data.improvements = [];
      data.naturalExpressions = [];
    }

    return NextResponse.json({ ...data, wordCount: totalWords });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
