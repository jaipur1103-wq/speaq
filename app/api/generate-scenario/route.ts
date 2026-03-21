import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Difficulty, Industry, PersonaStyle, Topic } from "@/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const INDUSTRIES: Record<Industry, string> = {
  technology: "tech/software/startup",
  finance: "banking/investment/fintech",
  consulting: "management consulting/advisory",
  healthcare: "pharma/hospital/medtech",
  retail: "e-commerce/consumer goods/FMCG",
  manufacturing: "industrial/supply chain/operations",
  general: "general business",
};

const TOPICS: Partial<Record<Topic, string>> = {
  travel: "travel/airport/hotel/tourism — non-business, everyday travel situations",
  daily: "daily life/shopping/restaurant/neighborhood — non-business, everyday errands and activities",
  social: "social situations/parties/casual networking/making friends — non-business, informal",
  study: "study/university/online courses/language exchange — academic or self-improvement, non-business",
};

const PERSONAS: Record<PersonaStyle, string> = {
  friendly: "warm and collaborative, easy to talk to",
  tough: "demanding and assertive, pushes back hard",
  neutral: "professional and balanced, straightforward",
};

const DIFFICULTIES: Record<Difficulty, string> = {
  beginner:
    "CEFR A2-B1 only. Extremely easy, low-stakes situation. No jargon whatsoever. " +
    "Friendly, patient counterpart. Short simple sentences only. " +
    "IMPORTANT: Generate a VARIED scenario. Do NOT repeat meeting scheduling or new-team introductions. " +
    "Pick randomly from a wide range of everyday situations such as: " +
    "recommending a restaurant to a coworker, chatting about weekend plans, asking for directions at an airport, " +
    "ordering coffee or lunch, checking into a hotel, complaining politely about a wrong order, " +
    "asking a neighbor to turn down music, shopping for a gift, returning a purchase, " +
    "asking a classmate about homework, joining a study group, chatting at a social event, " +
    "asking about local attractions as a tourist, talking with a hotel receptionist about facilities, " +
    "making small talk about the weather or hobbies, asking for help at a library, " +
    "talking to a gym staff member, arranging to meet a friend, discussing a movie or show, " +
    "asking a pharmacist for advice on medicine, talking to a doctor about mild symptoms. " +
    "Keep the situation specific and concrete — avoid generic openers.",
  intermediate:
    "CEFR B1-B2. Conversational business English. Accessible vocabulary. " +
    "Counterpart is professional but approachable. Mild challenges only. Real but manageable situations.",
  advanced:
    "CEFR C1-C2. Sophisticated business language, complex negotiations, high stakes. " +
    "Counterpart is challenging and demanding. Use industry-specific terminology.",
};

export async function POST(req: NextRequest) {
  try {
    const { topic, difficulty, industry, personaStyle } = await req.json() as {
      topic: Topic;
      difficulty: Difficulty;
      industry: Industry;
      personaStyle: PersonaStyle;
    };

    const themeContext = topic === "business"
      ? `Industry: ${INDUSTRIES[industry] ?? "general business"}`
      : `Theme: ${TOPICS[topic] ?? "everyday situations"}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an English speaking scenario generator. Always return valid JSON only, no markdown, no backticks.",
        },
        {
          role: "user",
          content: `Generate a realistic English speaking scenario for practice.

${themeContext}
Difficulty: ${difficulty} — ${DIFFICULTIES[difficulty]}
Counterpart persona: ${PERSONAS[personaStyle]}

Return ONLY valid JSON with this exact structure:
{
  "category": "<choose best fit: for business: Negotiation/Sales/1-on-1/Cross-team/Presentation/Client Meeting/Performance Review/Crisis Management/Partnership/Hiring; for non-business: Travel/Restaurant/Shopping/Hotel/Social/Study/Daily Life>",
  "title": "<concise action-oriented title, max 8 words>",
  "brief": "<2 sentences: situation context + what the user needs to achieve>",
  "opener": "<what the counterpart says first, 1-2 sentences, natural spoken English>",
  "keyPhrases": ["<phrase1>", "<phrase2>", "<phrase3>", "<phrase4>", "<phrase5>"],
  "personaName": "<realistic first name>",
  "personaRole": "<job title or role, e.g. CFO, Hotel Receptionist, Classmate>"
}

Requirements:
- Make it a specific, realistic scenario (include numbers, context, stakes)
- Opener should feel natural, not scripted
- Key phrases should be vocabulary relevant to the scenario
- Vary the scenario type`,
        },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json({ ...data, difficulty, industry, personaStyle });
  } catch (error) {
    console.error("generate-scenario error:", error);
    return NextResponse.json({ error: "Failed to generate scenario" }, { status: 500 });
  }
}
