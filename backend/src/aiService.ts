import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
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
  // Build the contents array for the new SDK
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Gemini requires history to start with a 'user' role message.
  // Find the first 'user' message index to trim any leading 'model' messages.
  const firstUserIndex = contents.findIndex((c) => c.role === "user");
  const validContents = firstUserIndex >= 0
    ? contents.slice(firstUserIndex)
    : contents;

  // Gemini alternates user/model strictly. Merge consecutive same-role messages.
  const mergedContents: { role: string; parts: { text: string }[] }[] = [];
  for (const msg of validContents) {
    const last = mergedContents[mergedContents.length - 1];
    if (last && last.role === msg.role) {
      last.parts[0].text += "\n" + msg.parts[0].text;
    } else {
      mergedContents.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
    }
  }

  // Use gemini-3.1-pro-preview for code generation — superior React/front-end output
  const response = await genAI.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: mergedContents,
    config: {
      systemInstruction: systemPrompt || undefined,
      maxOutputTokens: 20000,
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";

  console.log("--- GEMINI RESPONSE START ---");
  console.log(text);
  console.log("--- GEMINI RESPONSE END ---");

  return text;
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
    // Use 2.5-flash for template detection — fast, cheap, sufficient for classification
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n\nReturn either 'node' or 'react' based on what this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.`,
    });

    return (response.text ?? "").trim().toLowerCase();
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