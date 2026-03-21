import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { scenario, counterpartMessage, userResponse, language } = await req.json();
    const isJa = language === "ja";

    const systemContent = isJa
      ? "You are an English speaking coach. The learner's language is Japanese. You MUST write strengths, improvements, encouragement, and naturalExpressions[].explanation in Japanese. All other fields (original, natural, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        {
          role: "user",
          content: `${isJa ? "⚠️ MANDATORY: Write strengths[], improvements[], encouragement, and naturalExpressions[].explanation IN JAPANESE. Do NOT use English for these fields.\n\n" : ""}Analyze this English response.

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
${scenario.personaName} (${scenario.personaRole}) said: "${counterpartMessage}"
User responded: "${userResponse}"
Key vocabulary: ${scenario.keyPhrases.join(", ")}

${scenario.difficulty === "beginner"
  ? "IMPORTANT: Score generously for beginner level. Simple, clear communication = 70+. Any attempt to communicate politely = at least 60. Tips must be very simple, encouraging, and positive."
  : ""}

Score on 4 axes (0-100):
- grammar: correct use of tenses, articles, prepositions, sentence structure. This is spoken English from voice input — ignore all punctuation entirely. Do NOT penalize for missing or incorrect punctuation.
- vocabulary: range and appropriateness of words used
- naturalness: how native-like the phrasing sounds
- communication: ability to convey intent, respond relevantly, keep conversation going

CRITICAL RULES:
- "strengths": ALWAYS return at least 2 specific strengths. NEVER return an empty array.${isJa ? " Write in Japanese." : ""}
- "encouragement": A single encouraging sentence. ALWAYS return this.${isJa ? " Write in Japanese." : ""}
- "improvements": Max 2 items.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions": ALWAYS include 1-2 items.
- "naturalExpressions[].explanation": One sentence why it sounds more natural.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": REQUIRED. One short English example sentence.

Return ONLY valid JSON:
{
  "scores": { "grammar": <number>, "vocabulary": <number>, "naturalness": <number>, "communication": <number> },
  "overall": <number>,
  "encouragement": "<${isJa ? "日本語で励ましの一文" : "one encouraging sentence"}>",
  "strengths": ["<${isJa ? "日本語で良かった点" : "strength"}>", "<${isJa ? "日本語で良かった点" : "strength"}>"],
  "improvements": ["<${isJa ? "日本語で改善点" : "tip"}>"],
  "foundPhrases": [],
  "suggestedResponse": "<natural English response>",
  "naturalExpressions": [
    {
      "original": "<user's phrase>",
      "natural": "<more natural English>",
      "explanation": "<${isJa ? "日本語で理由" : "why more natural"}>",
      "example": "<short English example>"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);
    const wordCount = userResponse.trim().split(/\s+/).filter(Boolean).length;

    return NextResponse.json({ ...data, wordCount });
  } catch (error) {
    console.error("feedback error:", error);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}
