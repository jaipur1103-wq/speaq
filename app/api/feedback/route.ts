import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write encouragement, strengths, improvements[].comment, and naturalExpressions[].explanation and naturalExpressions[].chunkDetail in Japanese. All other fields (original, natural, chunk, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

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

- "improvements": 0-2 items. Variable — if the English is natural and correct, return []. Only flag genuine issues.
  Each item is an object with two fields:
  - "comment": Quote the user's phrase using 「」, suggest a better version for difficulty=${scenario.difficulty} (beginner=A2 / intermediate=B1-B2 / advanced=C1-C2), explain the specific reason (grammar rule, wrong collocation, literal translation, register mismatch, nuance difference), and add one sentence about why it matters in THIS specific scenario context.
    FORBIDDEN: Never write "more natural", "sounds better", "more commonly used", "sounds awkward". Always name the exact rule or reason.
    ${isJa ? "Write in Japanese. Example: 「we have many problems」は伝わりますが、「we've been running into quite a few issues」の方が表現力があります。run into は問題に継続的に遭遇するコロケーションで、quite a few は深刻さを伝えます。交渉の場では問題の重さが相手に伝わりやすくなります。" : "Example: 「we have many problems」→ 「we've been running into quite a few issues」— run into collocates naturally with problems/issues, and quite a few signals ongoing severity. In this negotiation context, conveying the weight of the issue matters."}
  - "suggestedResponse": A full, natural English response for the TURN where this issue occurred. This is the complete better version of what the user said in that turn.

- "naturalExpressions": Pick 2-4 corrections. Base them on improvements where possible. LEVEL FILTER — beginner: A2 only; intermediate: B1-B2 only; advanced: C1-C2 only.
- "naturalExpressions[].reason": grammar / collocation / literal / set-phrase / formality / nuance
- "naturalExpressions[].explanation": 1-2 sentences. FORBIDDEN: "more natural", "sounds better", "more commonly used". Required angle — grammar: cite exact rule; collocation: name wrong pair and correct pairs; literal: name Japanese source and why it fails; set-phrase: what fixed expression is expected; formality: name register and mismatch; nuance: contrast what original vs natural implies.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].natural": Minimal fix only. For collocation: swap only the problematic word. For grammar: fix only the error. Do NOT restructure the whole sentence.
- "naturalExpressions[].chunk": Extracted DIRECTLY from natural. Collocation / phrasal verb / idiom / set phrase / discourse marker. Replace variable content with ~. Keep 3-8 words. NEVER write a full sentence. NEVER use a single verb + ~ only (BAD: 「seem ~」「look ~」「feel ~」「think ~」). GOOD: 「run into ~ issues」「It might be worth ~ing」「Having said that, ~」BAD: 「It's ~」「from ~ to ~」「I ~ ~」「seem ~」
- "naturalExpressions[].chunkDetail": What ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": One short English sentence using the chunk.

EXAMPLES of ideal naturalExpression quality:
Collocation: { "original": "it has the big potential", "natural": "it has great potential", "reason": "collocation", "explanation": "「big」does not collocate with「potential」. Natural pairings: great / enormous / tremendous potential.", "chunk": "have great potential", "chunkDetail": "「great potential」is a fixed collocation. Use have/show great potential to say something is very promising.", "example": "This approach has great potential for cutting costs." }
Grammar: { "original": "I look forward to see you", "natural": "I look forward to seeing you", "reason": "grammar", "explanation": "「look forward to」requires a gerund (-ing) because「to」here is a preposition, not an infinitive marker.", "chunk": "look forward to ~ing", "chunkDetail": "After「look forward to」, always use the -ing form. ~ing is the activity you are anticipating.", "example": "I look forward to hearing your thoughts." }

Return ONLY valid JSON:
{
  "encouragement": "<${isJa ? "日本語で1文：セッション全体への正直な印象" : "one honest sentence about the session"}>",
  "strengths": ["<${isJa ? "「ユーザーの発言」＋ なぜ良いか（言語的な理由）" : "「user phrase」+ specific linguistic feature that makes it effective"}>"],
  "improvements": [
    {
      "comment": "<${isJa ? "「ユーザーの発言」→ 改善案 + 具体的な理由 + この場面でなぜ重要か" : "「user phrase」→ better version + specific reason + why it matters in this context"}>",
      "suggestedResponse": "<full natural English response for that turn>"
    }
  ],
  "naturalExpressions": [
    {
      "original": "<user's phrase>",
      "natural": "<minimal fix>",
      "reason": "<grammar|collocation|literal|set-phrase|formality|nuance>",
      "explanation": "<${isJa ? "日本語：具体的な問題点のみ（禁止: more natural / sounds better）" : "specific rule or reason only — no vague phrases"}>",
      "chunk": "<core pattern>",
      "chunkDetail": "<${isJa ? "日本語：使い方・~に何が入るか・実践アドバイス" : "usage, what ~ stands for, practical tip"}>",
      "example": "<short English sentence using the chunk>"
    }
  ]
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

    return NextResponse.json({ ...data, wordCount: totalWords });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
