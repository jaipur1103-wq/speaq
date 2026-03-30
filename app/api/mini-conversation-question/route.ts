import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, chunkDetail, lang } = await req.json();

    const prompt = `You are designing a speaking practice exercise for a Japanese business English learner.

Target chunk expression: "${chunk}"
${chunkDetail ? `Usage note: ${chunkDetail}` : ""}

Create a natural Japanese sentence that, when translated into English, would most naturally use the chunk expression "${chunk}".

Return ONLY valid JSON, no markdown, no backticks:
{ "jaPrompt": "Japanese sentence here" }

Rules:
- The Japanese sentence must be written in Japanese
- The sentence should be realistic in a business context
- When translated to English, using "${chunk}" should be the most natural choice
- Keep it concise: 1 sentence only
- Do NOT include the English chunk or any English words in the Japanese sentence

Example (for chunk: "have great potential"):
{ "jaPrompt": "このプロジェクトは大きな可能性を秘めていると思います。" }

Example (for chunk: "run into issues"):
{ "jaPrompt": "開発中にいくつかの問題に直面しました。" }

Example (for chunk: "It might be worth ~ing"):
{ "jaPrompt": "予算を見直してみる価値があるかもしれません。" }`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("mini-conversation-question error", e);
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
