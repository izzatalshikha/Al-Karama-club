import { GoogleGenAI } from "@google/genai";

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY + " " });
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello"
    });
  } catch(e) {
    console.log("Error space key:", e.message);
  }
}
test();
