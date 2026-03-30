import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, chunkDetail, lang } = await req.json();

    const isJa = lang === "ja";

    const prompt = `You are designing a speaking practice exercise for a Japanese business English learner.

Target chunk expression: "${chunk}"
${chunkDetail ? `Usage note: ${chunkDetail}` : ""}

Create a realistic business situation description where using "${chunk}" would be the most natural and expected response.

Return ONLY valid JSON, no markdown, no backticks:
{ "situation": "situation description here" }

Rules:
- The situation must be written in ${isJa ? "Japanese" : "English"}
- Describe ONLY the scene and context — do NOT include a question or prompt to use the phrase
- The situation should make it obvious that using "${chunk}" would fit naturally
- Keep it concise: 2-3 sentences max
- Do NOT mention the target phrase in the situation description

Example (for chunk: "have great potential"):
{ "situation": "新しいプロジェクト提案について上司から意見を求められています。そのプロジェクトはまだ初期段階ですが、あなたは可能性を感じています。" }

Example (for chunk: "run into issues"):
{ "situation": "チームメンバーから進捗報告を受けています。開発中にいくつか問題が発生したことを報告しなければなりません。" }`;

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
