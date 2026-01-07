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
    // Try Gemini first
    return await generateWithGemini(messages, systemPrompt);
  } catch (geminiError) {
    console.error("Gemini API failed, falling back to Claude:", geminiError);
    try {
      // Fallback to Claude
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Convert messages to Gemini format
  const chat = model.startChat({
    history: messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    generationConfig: {
      maxOutputTokens: 8000,
      temperature: 0.7,
    },
  });

  // Add system prompt as first user message if provided
  let prompt = messages[messages.length - 1].content;
  if (systemPrompt && messages.length === 1) {
    prompt = `${systemPrompt}\n\n${prompt}`;
  }

  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}

async function generateWithClaude(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8000,
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
    // Try Gemini first
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(
      `${prompt}\n\nReturn either 'node' or 'react' based on what this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.`
    );
    const response = await result.response;
    return response.text().trim().toLowerCase();
  } catch (error) {
    console.error("Gemini template detection failed, using Claude:", error);
    // Fallback to Claude
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