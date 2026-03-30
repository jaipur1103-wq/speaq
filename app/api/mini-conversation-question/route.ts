import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { chunk, chunkDetail } = await req.json();

    const prompt = `You are playing the role of a business colleague in a short English conversation practice.

The learner needs to practice using this English expression: "${chunk}"
${chunkDetail ? `Usage note: ${chunkDetail}` : ""}

Generate a single natural question or statement (1-2 sentences) that would naturally prompt the learner to use this expression in their response. The situation should be a realistic business context.

Return ONLY valid JSON, no markdown, no backticks:
{ "question": "your question or statement here" }

Rules:
- Make it feel like a real conversation opener, not a test
- The question should naturally lead to using the chunk expression
- Keep it short and conversational (1-2 sentences)
- English only`;

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
