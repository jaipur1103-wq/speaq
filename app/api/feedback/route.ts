import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

// Code-side filter: reject vague evidence, accept specific linguistic rules
const VAGUE_PATTERNS = [
  "more natural", "sounds better", "more commonly used", "sounds awkward",
  "more fluent", "more polished", "sounds more", "is preferred", "is better",
  "contraction", "stylistic", "personal preference", "either is fine",
  "both are correct", "i've vs", "i have vs", "vs i've", "vs i have",
];

function isGenuineEvidence(evidence: string): boolean {
  if (!evidence || evidence.trim().length < 15) return false;
  const lower = evidence.toLowerCase();
  if (VAGUE_PATTERNS.some(p => lower.includes(p))) return false;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const turnsText = turns.map((t, i) =>
      `[Turn ${i + 1}]\n${scenario.personaName} said: "${t.counterpartMessage}"\nUser responded: "${t.userMessage}"`
    ).join("\n\n");

    const totalWords = turns.reduce((sum, t) => sum + t.userMessage.trim().split(/\s+/).filter(Boolean).length, 0);

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write encouragement, strengths, improvements[].comment, and naturalExpressions[].explanation and naturalExpressions[].chunkDetail in Japanese. All other fields (original, natural, chunk, example, suggestedResponse, errorEvidence) remain in English. Always return valid JSON only, no markdown, no backticks."
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

- "strengths": 1-3 items. Only include genuine strengths. Quote the user's phrase using 「」, name the specific linguistic feature.
  FORBIDDEN: "good job", "well done", "natural English". Always name the specific feature.
  ${isJa ? "Write in Japanese. Example: 「I was wondering if ~」という形を使えていました。ネイティブが依頼するときによく使う丁寧な構造で、相手への配慮が自然に伝わります。" : "Example: You used 「I was wondering if ~」— the standard native structure for polite requests."}

- "improvements": 0-2 items. For each item, you MUST fill "errorEvidence" FIRST with a concrete linguistic justification before writing "comment".
  "errorEvidence" must be ONE of:
    (a) A grammar rule violated: name the rule and show the violation (e.g. "look forward to requires gerund [-ing], user wrote infinitive [to see]")
    (b) A wrong collocation pair: name both wrong and correct (e.g. "big + potential is unnatural; correct collocations: great/enormous/tremendous + potential")
    (c) A literal translation failure: name the source phrase and why it fails (e.g. "Japanese yoroshiku onegaishimasu translated literally; no English equivalent exists")
    (d) A register mismatch: name the register and why it conflicts (e.g. "'gonna' is casual spoken slang; this is a formal client presentation")
  If you cannot write a specific errorEvidence of type (a)-(d), do NOT include that improvement.
  DO NOT include improvements for: contraction vs. full form, synonyms, stylistic variation, minor formality differences.
  - "comment": Quote 「user's phrase」, give better version, explain using the errorEvidence reason, add why it matters in this scenario.
    FORBIDDEN in comment: "more natural", "sounds better", "more commonly used", "sounds awkward".${isJa ? " Write in Japanese." : ""}
  - "suggestedResponse": Full, natural English response for that turn.

- "naturalExpressions": 2-4 items based on improvements where possible. LEVEL FILTER — beginner: A2 only; intermediate: B1-B2 only; advanced: C1-C2 only.
- "naturalExpressions[].reason": grammar / collocation / literal / set-phrase / formality / nuance
- "naturalExpressions[].explanation": 1-2 sentences. FORBIDDEN: "more natural", "sounds better". Grammar: cite exact rule. Collocation: name wrong pair and correct pairs. Literal: name source and why it fails. Formality: name register mismatch. Nuance: contrast original vs natural.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].natural": Minimal fix only. Swap the problematic word/phrase only. Do NOT restructure.
- "naturalExpressions[].chunk": From natural directly. Collocation / phrasal verb / idiom / set phrase. Replace variable parts with ~. 3-8 words. NEVER full sentence. NEVER single word + ~. BAD: 「It's ~」「I ~ ~」「be ~」GOOD: 「run into ~ issues」「It might be worth ~ing」「have great potential」
- "naturalExpressions[].chunkDetail": What ~ stands for, when to use it, one practical tip.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": One short English sentence using the chunk.

EXAMPLES of ideal output:
Collocation improvement: { "errorEvidence": "big + potential is an unnatural collocation; correct pairings are great/enormous/tremendous + potential", "comment": "...", "suggestedResponse": "..." }
Grammar improvement: { "errorEvidence": "look forward to requires gerund [-ing] because 'to' is a preposition here, not an infinitive marker; user wrote 'look forward to see'", "comment": "...", "suggestedResponse": "..." }

Return ONLY valid JSON:
{
  "encouragement": "<${isJa ? "日本語で1文" : "one honest sentence"}>",
  "strengths": ["<${isJa ? "「発言」＋言語的特徴" : "「phrase」+ specific feature"}>"],
  "improvements": [
    {
      "errorEvidence": "<specific grammar rule / collocation pair / literal failure / register conflict>",
      "comment": "<${isJa ? "「発言」→ 改善案 + 具体的理由 + この場面でなぜ重要か" : "「phrase」→ better version + specific reason + why it matters"}>",
      "suggestedResponse": "<full natural English response for that turn>"
    }
  ],
  "naturalExpressions": [
    {
      "original": "<user's phrase>",
      "natural": "<minimal fix>",
      "reason": "<grammar|collocation|literal|set-phrase|formality|nuance>",
      "explanation": "<${isJa ? "日本語：具体的な問題点" : "specific rule or reason"}>",
      "chunk": "<core pattern>",
      "chunkDetail": "<${isJa ? "日本語：使い方・実践アドバイス" : "usage and practical tip"}>",
      "example": "<short English sentence>"
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

    // Code-side filter: remove improvements with vague or missing errorEvidence
    if (Array.isArray(data.improvements)) {
      data.improvements = data.improvements.filter((imp: { errorEvidence?: string }) =>
        isGenuineEvidence(imp.errorEvidence ?? "")
      );
    }

    const insightMode = data.improvements.length === 0;

    // If insightMode and no naturalExpressions generated, they may need to be requested differently
    // (The LLM still generated naturalExpressions based on the conversation, so we keep them)

    return NextResponse.json({ ...data, wordCount: totalWords, insightMode });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("feedback error:", msg);
    return NextResponse.json({ error: "Failed to get feedback", detail: msg }, { status: 500 });
  }
}
