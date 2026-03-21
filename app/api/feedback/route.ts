import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { scenario, counterpartMessage, userResponse, language } = await req.json();
    const isJa = language === "ja";

    const systemInstruction = isJa
      ? "You are an English speaking coach. The learner's interface language is Japanese. You MUST write strengths, improvements, encouragement, and naturalExpressions[].explanation in Japanese. All other fields (original, natural, example, suggestedResponse) remain in English. Always return valid JSON only, no markdown, no backticks."
      : "You are an English speaking coach. Always return valid JSON only, no markdown, no backticks.";

    const prompt = `${isJa ? "⚠️ MANDATORY: Write strengths[], improvements[], encouragement, and naturalExpressions[].explanation IN JAPANESE. Do NOT use English for these fields.\n\n" : ""}Analyze this English response.

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
- "naturalExpressions": ALWAYS include 1-2 items. Even if the response is mostly natural, find a phrase where a more native-sounding alternative would help the learner grow.
- "naturalExpressions[].explanation": One sentence explaining why it sounds more natural.${isJa ? " Write in Japanese." : ""}
- "naturalExpressions[].example": REQUIRED — ALWAYS include this. One short English sentence showing the natural expression used in a similar context.

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "scores": { "grammar": <number 0-100>, "vocabulary": <number 0-100>, "naturalness": <number 0-100>, "communication": <number 0-100> },
  "overall": <number>,
  "encouragement": "<${isJa ? "日本語で励ましの一文" : "one encouraging sentence"}>",
  "strengths": ["<${isJa ? "日本語で良かった点" : "specific strength"}>", "<${isJa ? "日本語で良かった点" : "specific strength"}>"],
  "improvements": ["<${isJa ? "日本語で改善点" : "specific tip"}>"],
  "foundPhrases": [],
  "suggestedResponse": "<2-4 sentence natural English response>",
  "naturalExpressions": [
    {
      "original": "<exact words from user response>",
      "natural": "<more native-sounding English>",
      "explanation": "<${isJa ? "日本語で理由" : "why this sounds more natural"}>",
      "example": "<one short English example sentence>"
    }
  ]
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);
    const wordCount = userResponse.trim().split(/\s+/).filter(Boolean).length;

    return NextResponse.json({ ...data, wordCount });
  } catch (error) {
    console.error("feedback error:", error);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}
