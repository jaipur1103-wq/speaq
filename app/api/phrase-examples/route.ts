import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, chunkDetail, reason, lang } = await req.json();
    const isJa = lang === "ja";

    const prompt = `You are an English language coach. Generate 3 example sentences using the English chunk expression below.

Chunk: "${chunk}"
${chunkDetail ? `Usage note: ${chunkDetail}` : ""}
${reason ? `Category: ${reason}` : ""}

Return ONLY valid JSON, no markdown, no backticks:
{
  "examples": [
    { "scene": "scene label", "sentence": "example sentence using the chunk", "sentenceJa": "Japanese translation of the sentence" },
    { "scene": "scene label", "sentence": "example sentence using the chunk", "sentenceJa": "Japanese translation of the sentence" },
    { "scene": "scene label", "sentence": "example sentence using the chunk", "sentenceJa": "Japanese translation of the sentence" }
  ]
}

Rules:
- Use 3 different real-world scenes (e.g. business meeting, email, casual conversation)
- Each sentence must naturally include the chunk expression
- sentence: 1 English sentence using the chunk
- sentenceJa: Japanese translation of sentence — REQUIRED for every item, do not omit
- Scene labels must be in Japanese (4-6 characters max)

Example output:
{
  "examples": [
    { "scene": "会議", "sentence": "This project has great potential.", "sentenceJa": "このプロジェクトは大きな可能性を秘めています。" },
    { "scene": "メール", "sentence": "Your proposal has great potential.", "sentenceJa": "あなたの提案は大きな可能性を持っています。" },
    { "scene": "雑談", "sentence": "She has great potential as a leader.", "sentenceJa": "彼女はリーダーとして大きな可能性があります。" }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 800,
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
