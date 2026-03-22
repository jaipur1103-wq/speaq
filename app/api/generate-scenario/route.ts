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

const SCENARIO_TYPES: Record<Topic, Record<Difficulty, string[]>> = {
  business: {
    beginner: [
      "greeting a new colleague", "asking your manager a simple question",
      "requesting to reschedule a meeting", "introducing yourself to a client",
      "asking for clarification on a task", "checking in with your team about progress",
      "asking about the dress code", "thanking a coworker for their help",
    ],
    intermediate: [
      "presenting project progress to your team", "negotiating a deadline extension",
      "handling a client complaint", "discussing a budget proposal",
      "coordinating with a cross-functional team", "requesting resources for a project",
      "asking for feedback on your work", "preparing for a performance review",
    ],
    advanced: [
      "leading a high-stakes negotiation", "presenting a business case to senior leadership",
      "managing a crisis communication", "discussing a strategic partnership",
      "navigating a difficult performance review", "pitching a new initiative to stakeholders",
      "resolving a conflict between team members", "closing a major sales deal",
    ],
  },
  travel: {
    beginner: [
      "checking into a hotel", "ordering at a restaurant", "asking for directions",
      "buying a train ticket", "returning a wrong item at a shop",
      "asking about opening hours", "requesting a wake-up call", "ordering room service",
    ],
    intermediate: [
      "reporting lost luggage at the airport", "negotiating a room upgrade at a hotel",
      "dealing with a flight delay", "getting restaurant recommendations from a local",
      "handling a wrong hotel charge", "arranging a day trip through a tour desk",
      "dealing with a language barrier at a pharmacy", "booking a restaurant over the phone",
    ],
    advanced: [
      "resolving a visa complication at immigration", "negotiating a group tour package",
      "dealing with a cancelled connecting flight", "handling a medical situation abroad",
      "disputing a charge at a luxury hotel", "arranging emergency travel assistance",
    ],
  },
  daily: {
    beginner: [
      "shopping for groceries", "asking a neighbor for help", "ordering takeout food",
      "calling to make a doctor appointment", "returning a purchase to a store",
      "asking for help at a post office", "buying items at a pharmacy",
    ],
    intermediate: [
      "negotiating with a landlord about repairs", "disputing a utility bill",
      "discussing renovation plans with a contractor", "handling a package delivery issue",
      "setting up a new service subscription", "dealing with a noisy neighbor",
      "reporting a problem to building management",
    ],
    advanced: [
      "navigating a complex insurance claim", "negotiating terms with a real estate agent",
      "handling a legal dispute with a service provider", "advocating for yourself in a medical consultation",
    ],
  },
  social: {
    beginner: [
      "introducing yourself at a party", "making small talk about hobbies",
      "talking about your hometown", "discussing a movie or TV show",
      "complimenting someone on their outfit", "chatting with a new classmate",
    ],
    intermediate: [
      "discussing current events with a colleague", "sharing opinions about a controversial topic",
      "catching up with an old friend", "networking at a professional event",
      "talking about career goals with a mentor", "discussing cultural differences",
    ],
    advanced: [
      "debating a complex social issue", "giving and receiving constructive criticism",
      "discussing philosophical or ethical questions", "navigating a sensitive cultural topic",
    ],
  },
  study: {
    beginner: [
      "asking a teacher for help after class", "discussing homework with a classmate",
      "asking about an assignment deadline", "joining a study group",
      "asking for clarification on a lecture",
    ],
    intermediate: [
      "presenting research findings to a class", "discussing an academic paper with a professor",
      "participating in a seminar discussion", "asking for feedback on an essay",
      "discussing a group project plan with teammates",
    ],
    advanced: [
      "defending a thesis proposal", "peer-reviewing a colleague's research",
      "presenting at an academic conference", "negotiating research collaboration terms",
    ],
  },
};

const MODIFIERS = [
  "there has been a mistake on their end",
  "you are in a hurry and have limited time",
  "it is your first time dealing with this situation",
  "a previous attempt to resolve this already failed",
  "there is an unexpected policy or rule blocking you",
  "the staff member or counterpart is new and unsure",
  "it is peak hour and things are unusually busy",
  "you have already been waiting a long time",
  "the situation turns out more complicated than expected",
  "the counterpart is reluctant or unhelpful at first",
  "you need to stay calm despite being frustrated",
  "there is a misunderstanding due to different expectations",
  "you need to negotiate for a better outcome",
  "the system or process is down or broken",
  "you are representing someone else, not just yourself",
  "the counterpart gives you conflicting information",
  "you realize mid-conversation you made a mistake",
  "the stakes are higher than you initially thought",
  "there is a cultural or language barrier to navigate",
  "you need to be persuasive without being pushy",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function getDifficultyDesc(difficulty: Difficulty): string {
  if (difficulty === "beginner") {
    return (
      "CEFR A2-B1 only. Extremely easy, low-stakes situation. No jargon whatsoever. " +
      "Friendly, patient counterpart. Short simple sentences only. Keep it specific and concrete."
    );
  }
  if (difficulty === "intermediate") {
    return (
      "CEFR B1-B2. Conversational English. Accessible vocabulary. " +
      "Counterpart is professional but approachable. Mild challenges only."
    );
  }
  return (
    "CEFR C1-C2. Sophisticated language, complex negotiations, high stakes. " +
    "Counterpart is challenging and demanding. Use topic-appropriate terminology."
  );
}

export async function POST(req: NextRequest) {
  try {
    const { topic, difficulty, industry, personaStyle } = await req.json() as {
      topic: Topic;
      difficulty: Difficulty;
      industry: Industry;
      personaStyle: PersonaStyle;
    };

    const effectiveIndustry: Industry = topic === "business" ? industry : "general";
    const themeContext = topic === "business"
      ? `Industry: ${INDUSTRIES[effectiveIndustry]}`
      : `Theme: ${TOPICS[topic] ?? "everyday situations"}`;

    const types = SCENARIO_TYPES[topic]?.[difficulty] ?? [];
    const scenarioType = pick(types);
    const modifier = pick(MODIFIERS);

    // Step 1: Generate English scenario
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
Scenario type: ${scenarioType}
Twist: ${modifier}
Difficulty: ${difficulty} — ${getDifficultyDesc(difficulty)}
Counterpart persona: ${PERSONAS[personaStyle]}

Return ONLY valid JSON with this exact structure:
{
  "category": "<choose best fit: for business: Negotiation/Sales/1-on-1/Cross-team/Presentation/Client Meeting/Performance Review/Crisis Management/Partnership/Hiring; for non-business: Travel/Restaurant/Shopping/Hotel/Social/Study/Daily Life>",
  "title": "<concise action-oriented title, max 8 words>",
  "brief": "<2 sentences: situation context + what the user needs to achieve>",
  "opener": "<what the counterpart says first, 1-2 sentences, natural spoken English>",
  "personaName": "<realistic first name>",
  "personaRole": "<job title or role, e.g. CFO, Hotel Receptionist, Classmate>"
}

Requirements:
- Make it a specific, realistic scenario (include numbers, context, stakes)
- Opener should feel natural, not scripted`,
        },
      ],
      temperature: 0.9,
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content?.trim() ?? "";
    const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(cleaned);

    // Step 2: Translate title, brief, opener to Japanese
    const transCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a Japanese translator. Always return valid JSON only, no markdown, no backticks.",
        },
        {
          role: "user",
          content: `Translate these 3 English texts to natural Japanese. Return ONLY this JSON:
{"titleJa":"<Japanese>","briefJa":"<Japanese>","openerJa":"<Japanese>"}

title: ${data.title}
brief: ${data.brief}
opener: ${data.opener}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 400,
    });

    const transText = transCompletion.choices[0].message.content?.trim() ?? "";
    const transCleaned = transText.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const transData = JSON.parse(transCleaned);

    return NextResponse.json({ ...data, ...transData, difficulty, industry: effectiveIndustry, personaStyle });
  } catch (error) {
    console.error("generate-scenario error:", error);
    return NextResponse.json({ error: "Failed to generate scenario" }, { status: 500 });
  }
}
