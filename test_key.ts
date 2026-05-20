import { GoogleGenAI } from "@google/genai";

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: "invalid_key_format!@#" });
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello"
    });
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
