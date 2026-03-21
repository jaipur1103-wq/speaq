import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Turn = { userMessage: string; counterpartMessage: string };

export async function POST(req: NextRequest) {
  try {
    const { scenario, turns, language }: { scenario: { title: string; brief: string; difficulty: string; personaName: string; personaRole: string; keyPhrases: string[] }; turns: Turn[]; language: string } = await req.json();
    const isJa = language === "ja";

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write strengths, improvements, encouragement, and naturalExpressions[].explanation in Japanese. All other fields (original, natural, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
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
          content: `${isJa ? "⚠️ MANDATORY: Write strengths[], improvements[], encouragement, and naturalExpressions[].explanation IN JAPANESE. Do NOT use English for these fields.\n\n" : ""}Analyze this English conversation session (${turns.length} turn${turns.length > 1 ? "s" : ""}).

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
Counterpart: ${scenario.personaName} (${scenario.personaRole})
Key vocabulary: ${scenario.keyPhrases.join(", ")}

${turnsText}

${scenario.difficulty === "beginner"
  ? "IMPORTANT: Score generously for beginner level. Simple, clear communication = 70+. Any attempt to communicate politely = at least 60. Tips must be very simple, encouraging, and positive."
  : ""}

Score the OVERALL session on 4 axes (0-100):
- grammar: correct use of tenses, articles, prepositions, sentence structure. This is spoken English from voice input — ignore all punctuation entirely.
- vocabulary: range and appropriateness of words used across the session
- naturalness: how native-like the phrasing sounds overall
- communication: ability to convey intent, respond relevantly, keep conversation going

CRITICAL RULES:
- "strengths": ALWAYS return at least 2 specific strengths about the overall session. NEVER return an empty array.${isJa ? " Write in Japanese." : ""}
- "encouragement": A single encouraging sentence about the overall session. ALWAYS return this.${isJa ? " Write in Japanese." : ""}
- "improvements": Max 2 items for the most impactful improvements.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions": Pick 2-4 of the most useful corrections from across ALL turns. Return [] if the user's English was already natural — do NOT force suggestions if there is nothing meaningful to improve.
- "naturalExpressions[].explanation": One sentence why it sounds more natural.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": REQUIRED when naturalExpressions is non-empty. One short English example sentence.
- "suggestedResponse": A better version of the user's LAST turn response in English.

Return ONLY valid JSON:
{
  "scores": { "grammar": <number>, "vocabulary": <number>, "naturalness": <number>, "communication": <number> },
  "overall": <number>,
  "encouragement": "<${isJa ? "日本語で励ましの一文" : "one encouraging sentence"}>",
  "strengths": ["<${isJa ? "日本語で良かった点" : "strength"}>", "<${isJa ? "日本語で良かった点" : "strength"}>"],
  "improvements": ["<${isJa ? "日本語で改善点" : "tip"}>"],
  "foundPhrases": [],
  "suggestedResponse": "<natural English response for the last turn>",
  "naturalExpressions": [
    {
      "original": "<user's phrase from any turn>",
      "natural": "<more natural English>",
      "explanation": "<${isJa ? "日本語で理由" : "why more natural"}>",
      "example": "<short English example>"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ ...data, wordCount: totalWords });
  } catch (error) {
    console.error("feedback error:", error);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}
