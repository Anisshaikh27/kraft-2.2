import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function generateReactComponent() {
  const prompt = `Generate a simple React component called Button with TypeScript types. 
Include props for label, onClick, and disabled state. Use Tailwind CSS for styling.
Return only the component code.`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    console.log("Generated Component:\n");
    console.log(response.text);
  } catch (error) {
    console.error("Error:", error);
  }
}

generateReactComponent();
