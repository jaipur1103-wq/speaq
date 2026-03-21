import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { scenario, counterpartMessage, userResponse, language } = await req.json();
    const isJa = language === "ja";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a business English speaking coach. Always return valid JSON only, no markdown, no backticks.",
        },
        {
          role: "user",
          content: `Analyze this business English response.

Scenario: ${scenario.title}
Situation: ${scenario.brief}
Difficulty: ${scenario.difficulty}
${scenario.personaName} (${scenario.personaRole}) said: "${counterpartMessage}"
User responded: "${userResponse}"
Key vocabulary: ${scenario.keyPhrases.join(", ")}

${isJa ? "IMPORTANT: Write ALL strengths, improvements, and naturalExpressions.explanation in Japanese." : ""}

${scenario.difficulty === "beginner"
  ? "IMPORTANT: Score generously for beginner level. Simple, clear communication = 70+. Any attempt to communicate politely = at least 60. Tips must be very simple, encouraging, and positive. Do NOT mention advanced techniques."
  : ""}

Score on 4 axes (0-100):
- clarity: clear, appropriate length (15-150 words), well-structured. IMPORTANT: This is spoken English from voice input — ignore all punctuation (commas, periods, etc.) entirely. Do NOT penalize for missing or incorrect punctuation.
- persuasion: uses data/proposals/questions, references key phrases
- professionalism: polite, diplomatic, uses softeners
- strategy: awareness of goals, asks questions, builds dialogue

Return ONLY valid JSON:
{
  "scores": { "clarity": <0-100>, "persuasion": <0-100>, "professionalism": <0-100>, "strategy": <0-100> },
  "overall": <average rounded>,
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "improvements": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>"],
  "foundPhrases": ["<key phrase used if any>"],
  "suggestedResponse": "<model response, 2-4 sentences, natural spoken English>",
  "naturalExpressions": [
    {
      "original": "<exact phrase or sentence the user said that could sound more natural>",
      "natural": "<more natural English version a native speaker would say>",
      "explanation": "<one sentence: why this sounds more natural>"
    }
  ]
}

For naturalExpressions: pick 1-3 specific phrases from the user's response that could be improved. If the response is already very natural, return an empty array. Never suggest adding punctuation — this is spoken English.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 700,
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
