import { GoogleGenAI } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: "hello"
    });
    console.log("Success with gemini-3-pro-preview");
  } catch (e) {
    console.log("Error gemini-3-pro-preview:", e.message);
  }
}
test();
