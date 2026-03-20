import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Difficulty, PersonaStyle } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PERSONAS: Record<PersonaStyle, string> = {
  friendly: "warm and collaborative — respond positively but keep the conversation moving",
  skeptical: "doubtful — question their points, ask for more evidence or clarity",
  tough: "demanding — push back, challenge assumptions, maintain pressure",
  neutral: "professional — acknowledge their point and move the conversation forward",
  enthusiastic: "energetic — respond with interest and build on what they said",
};

const DIFFICULTIES: Record<Difficulty, string> = {
  beginner:
    "VERY simple reply. 1 sentence only. Use everyday words, no jargon. " +
    "Be encouraging and friendly. Easy for a beginner English speaker to understand.",
  intermediate:
    "Give a natural 2-3 sentence reply with some complexity or a mild challenge.",
  advanced:
    "Give a sophisticated 2-3 sentence reply. Raise a challenging counter-point or add pressure.",
};

export async function POST(req: NextRequest) {
  try {
    const { scenario, conversationHistory, userMessage } = await req.json();

    const historyText = conversationHistory
      .map((m: { role: string; text: string }) =>
        `${m.role === "counterpart" ? scenario.personaName : "User"}: ${m.text}`
      )
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are ${scenario.personaName}, ${scenario.personaRole}. Scenario: ${scenario.title}. Situation: ${scenario.brief}. Your persona: ${PERSONAS[scenario.personaStyle as PersonaStyle]}. ${DIFFICULTIES[scenario.difficulty as Difficulty]} Reply as ${scenario.personaName}. Stay in character. Return ONLY the spoken reply text — no name prefix, no quotes, no extra formatting.`,
        },
        {
          role: "user",
          content: `Conversation so far:\n${historyText}\nUser: ${userMessage}\n\nReply as ${scenario.personaName}:`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const reply = completion.choices[0].message.content?.trim() ?? "";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("counterpart-reply error:", error);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
