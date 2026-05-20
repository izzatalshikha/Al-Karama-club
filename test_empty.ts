import { GoogleGenAI } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: " "
    });
    console.log("Success with space string");
  } catch (e) {
    console.log("Error empty string:", e.message);
  }
}
test();
