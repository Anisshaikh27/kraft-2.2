import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function generateResponse(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  try {
    return await generateWithGemini(messages, systemPrompt);
  } catch (geminiError) {
    console.error("Gemini API failed, falling back to Claude:", geminiError);
    try {
      return await generateWithClaude(messages, systemPrompt);
    } catch (claudeError) {
      console.error("Both APIs failed:", claudeError);
      throw new Error("Both AI services are unavailable");
    }
  }
}

async function generateWithGemini(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt || undefined,
  });

  // Gemini requires history to start with a 'user' role message.
  // Separate the last message (the new prompt) from the history.
  const lastMessage = messages[messages.length - 1];
  const historyMessages = messages.slice(0, -1);

  // Find the first 'user' message index to trim any leading 'assistant' messages.
  const firstUserIndex = historyMessages.findIndex((m) => m.role === "user");
  const validHistory = firstUserIndex >= 0
    ? historyMessages.slice(firstUserIndex)
    : [];

  // Gemini alternates user/model strictly. Merge consecutive same-role messages.
  const mergedHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const msg of validHistory) {
    const geminiRole = msg.role === "assistant" ? "model" : "user";
    const last = mergedHistory[mergedHistory.length - 1];
    if (last && last.role === geminiRole) {
      // Append to existing entry
      last.parts[0].text += "\n" + msg.content;
    } else {
      mergedHistory.push({ role: geminiRole, parts: [{ text: msg.content }] });
    }
  }

  const chat = model.startChat({
    history: mergedHistory,
    generationConfig: {
      maxOutputTokens: 20000,
      temperature: 0.3,
    },
  });

  const prompt = lastMessage.content;
  const result = await chat.sendMessage(prompt);
  const response = await result.response;

  console.log("--- GEMINI RESPONSE START ---");
  console.log(response.text());
  console.log("--- GEMINI RESPONSE END ---");

  return response.text();
}

async function generateWithClaude(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 20000,
    system: systemPrompt,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  return (response.content[0] as Anthropic.TextBlock).text;
}

export async function determineTemplate(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      `${prompt}\n\nReturn either 'node' or 'react' based on what this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.`
    );
    const response = await result.response;
    return response.text().trim().toLowerCase();
  } catch (error) {
    console.error("Gemini template detection failed, using Claude:", error);
    const response = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      system:
        "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
    });

    return (response.content[0] as Anthropic.TextBlock).text
      .trim()
      .toLowerCase();
  }
}