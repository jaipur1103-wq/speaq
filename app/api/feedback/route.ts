import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };
type ErrorEvidence = { turn: number; phrase: string; evidence: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

    // Step 1: Evidence-based error detection (temperature=0)
    // Instead of "is there an error?", ask "if there IS an error, name the specific rule"
    const step1 = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an English error detector. Return only valid JSON. No markdown, no backticks." },
        {
          role: "user",
          content: `For each turn below, look at the user's response and report ONLY if you can provide concrete evidence of an error.

Evidence must be ONE of:
- A specific grammar rule violated (e.g. "look forward to requires gerund, user wrote infinitive")
- A specific wrong collocation pair (e.g. "big + potential is unnatural; correct: great/enormous/tremendous + potential")
- A specific literal translation that fails in English (e.g. "Japanese 'yoroshiku' translated literally as 'please treat me well'")
- A specific register mismatch with concrete reason (e.g. "'gonna' is informal slang, inappropriate in a formal client meeting")

If you CANNOT provide such specific evidence, return NONE for that turn.
DO NOT flag: contraction vs. full form, synonyms, stylistic preferences, minor formality variation.

Scenario: ${scenario.title}
Difficulty: ${scenario.difficulty}

${turnsText}

Return JSON array:
[{ "turn": 1, "phrase": "<exact problematic phrase or empty>", "evidence": "<specific rule/pair/reason or NONE>" }]`,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    const step1Text = step1.choices[0].message.content?.trim() ?? "";
    const step1Stripped = step1Text.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "").trim();
    const step1Match = step1Stripped.match(/\[[\s\S]*\]/);
    let confirmedErrors: ErrorEvidence[] = [];
    if (step1Match) {
      const parsed: { turn: number; phrase: string; evidence: string }[] = JSON.parse(step1Match[0]);
      confirmedErrors = parsed.filter(c => c.evidence && c.evidence !== "NONE" && c.phrase);
    }

    const hasErrors = confirmedErrors.length > 0;
    const insightMode = !hasErrors;

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write encouragement, strengths, improvements[].comment, and naturalExpressions[].explanation and naturalExpressions[].chunkDetail in Japanese. All other fields (original, natural, chunk, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    // Build improvements instruction based on confirmed errors
    const improvementsInstruction = !hasErrors
      ? `- "improvements": Return []. No genuine errors were detected.`
      : `- "improvements": Generate improvements for these confirmed error turns only (max 2):
${confirmedErrors.map(e => `  Turn ${e.turn}: phrase="${e.phrase}", confirmed error="${e.evidence}"`).join("\n")}
  Each item:
  - "comment": Quote 「${confirmedErrors[0]?.phrase}」, explain using the confirmed error evidence above (DO NOT say "more natural", "sounds better", "more commonly used" — name the exact rule or collocation pair), add why it matters in this scenario.${isJa ? " Write in Japanese." : ""}
  - "suggestedResponse": Full, natural English response for that turn.`;

    // Build naturalExpressions instruction based on mode
    const expressionsInstruction = insightMode
      ? `- "naturalExpressions": The user's English was correct. Instead, offer 2-3 ALTERNATIVE expressions they could have used in this conversation — not corrections, but richer or more idiomatic ways to express the same ideas. These are "you could also say..." insights.
  For each, pick something from the actual conversation turns that could be expressed differently.
  LEVEL FILTER — beginner: A2 only; intermediate: B1-B2 only; advanced: C1-C2 only.
  Use "original" = what the user actually said, "natural" = the alternative expression.
  "reason" should reflect the type of upgrade: collocation / set-phrase / formality / nuance.
  "explanation": explain what makes the alternative more vivid/precise/idiomatic — NOT "more natural". Name the specific feature.${isJa ? " Write in Japanese." : ""}
  "chunk", "chunkDetail", "example": same rules as always.`
      : `- "naturalExpressions": Pick 2-4 based on the confirmed improvements. LEVEL FILTER — beginner: A2 only; intermediate: B1-B2 only; advanced: C1-C2 only.
  "reason": grammar / collocation / literal / set-phrase / formality / nuance
  "explanation": 1-2 sentences. FORBIDDEN: "more natural", "sounds better". Grammar: cite exact rule. Collocation: name wrong pair and correct pairs. Literal: name source and why it fails. Set-phrase: what fixed expression is expected. Formality: name register and mismatch. Nuance: contrast original vs natural.${isJa ? " Write in Japanese." : ""}
  "natural": Minimal fix only. Swap only the problematic word/phrase. Do NOT restructure.`;

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

- "strengths": 1-3 items. Only genuine strengths. Quote the user's phrase using 「」, name the specific linguistic feature.
  FORBIDDEN: "good job", "well done", "natural English". Always name the specific feature.
  ${isJa ? "Write in Japanese. Example: 「I was wondering if ~」という形を使えていました。ネイティブが依頼するときによく使う丁寧な構造で、相手への配慮が自然に伝わります。" : "Example: You used 「I was wondering if ~」— this is the standard native structure for polite requests."}

${improvementsInstruction}

${expressionsInstruction}
- "naturalExpressions[].natural": Minimal fix only. Do NOT restructure the whole sentence.
- "naturalExpressions[].chunk": Extracted DIRECTLY from natural. Collocation / phrasal verb / idiom / set phrase / discourse marker. Replace variable content with ~. Keep 3-8 words. NEVER a full sentence. NEVER single word + ~. BAD: 「It's ~」「I ~ ~」「be ~」GOOD: 「run into ~ issues」「It might be worth ~ing」「have great potential」
- "naturalExpressions[].chunkDetail": What ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": One short English sentence using the chunk.

EXAMPLES of ideal naturalExpression quality:
Collocation: { "original": "it has the big potential", "natural": "it has great potential", "reason": "collocation", "explanation": "「big」does not collocate with「potential」. Natural pairings: great / enormous / tremendous potential.", "chunk": "have great potential", "chunkDetail": "Use have/show great potential to say something is very promising.", "example": "This approach has great potential for cutting costs." }
Grammar: { "original": "I look forward to see you", "natural": "I look forward to seeing you", "reason": "grammar", "explanation": "「look forward to」requires a gerund (-ing) because「to」here is a preposition, not an infinitive marker.", "chunk": "look forward to ~ing", "chunkDetail": "After「look forward to」, always use the -ing form.", "example": "I look forward to hearing your thoughts." }

Return ONLY valid JSON:
{
  "encouragement": "<${isJa ? "日本語で1文" : "one honest sentence"}>",
  "strengths": ["<${isJa ? "「発言」＋言語的特徴" : "「phrase」+ specific feature"}>"],
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

    // Hard enforcement: if no confirmed errors, improvements must be []
    if (!hasErrors) {
      data.improvements = [];
    }

    return NextResponse.json({ ...data, wordCount: totalWords, insightMode });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
