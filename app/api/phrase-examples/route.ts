import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, chunkDetail, reason, lang } = await req.json();
    const isJa = lang === "ja";

    const prompt = `You are an English language coach. Generate 4 example sentences using the English chunk expression below.

Chunk: "${chunk}"
${chunkDetail ? `Usage note: ${chunkDetail}` : ""}
${reason ? `Category: ${reason}` : ""}

Return ONLY valid JSON, no markdown, no backticks:
{
  "examples": [
    { "scene": "scene label", "sentence": "example sentence using the chunk" },
    { "scene": "scene label", "sentence": "example sentence using the chunk" },
    { "scene": "scene label", "sentence": "example sentence using the chunk" },
    { "scene": "scene label", "sentence": "example sentence using the chunk" }
  ]
}

Rules:
- Use 4 different real-world scenes (e.g. business meeting, email, casual conversation, presentation)
- Each sentence must naturally include the chunk expression
- Sentences should be 1-2 sentences, realistic and useful
- Scene labels must be in ${isJa ? "Japanese" : "English"} (short, 4-8 characters)
- Sentences must be in English`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("phrase-examples error", e);
    return NextResponse.json({ error: "Failed to generate examples" }, { status: 500 });
  }
}
