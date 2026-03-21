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
        {
          role: "system",
          content: systemContent,
        },
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
- "strengths": ALWAYS return at least 2 specific strengths. Even beginners do something right. Find what the user expressed correctly, any vocabulary used, any attempt at politeness. NEVER return an empty array.${isJa ? " Write in Japanese." : ""}
- "encouragement": A single encouraging sentence highlighting growth or effort. ALWAYS return this.${isJa ? " Write in Japanese." : ""}
- "improvements": Max 2 items. Focus on the most impactful improvements only.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions": Only include phrases that genuinely sound unnatural to a native speaker. If the response is already quite natural, return an empty array. Do not invent minor nitpicks.
- "naturalExpressions[].explanation": One sentence explaining why it sounds more natural.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": REQUIRED. One short example sentence using the natural expression in context. Always in English.

Return ONLY valid JSON:
{
  "scores": { "grammar": <0-100>, "vocabulary": <0-100>, "naturalness": <0-100>, "communication": <0-100> },
  "overall": <average rounded>,
  "encouragement": "${isJa ? "<日本語で励ましの一文>" : "<one encouraging sentence>"}",
  "strengths": ["${isJa ? "<日本語で具体的な良かった点1>" : "<specific strength 1>"}"],
  "improvements": ["${isJa ? "<日本語で改善点1>" : "<specific tip 1>"}"],
  "foundPhrases": ["<key phrase used if any>"],
  "suggestedResponse": "<model response, 2-4 sentences, natural spoken English>",
  "naturalExpressions": [
    {
      "original": "<exact phrase the user said>",
      "natural": "<more natural English version>",
      "explanation": "${isJa ? "<日本語で理由を一文>" : "<one sentence: why this sounds more natural>"}",
      "example": "<REQUIRED: one short English example sentence using the natural expression>"
    }
  ]
}

For naturalExpressions: pick 1-3 specific phrases from the user's response that could be improved. If the response is already very natural, return an empty array. Never suggest adding punctuation — this is spoken English.`,
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
