import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ corrected: text });
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Add punctuation and capitalization to the English speech transcription. Return only the corrected text, nothing else.",
        },
        { role: "user", content: text },
      ],
      temperature: 0,
      max_tokens: 300,
    });
    const corrected = completion.choices[0].message.content?.trim() ?? text;
    return NextResponse.json({ corrected });
  } catch {
    return NextResponse.json({ corrected: text });
  }
}
