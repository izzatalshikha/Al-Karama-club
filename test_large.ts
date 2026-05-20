import { GoogleGenAI } from "@google/genai";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const extremelyLargeString = "a".repeat(10 * 1024 * 1024); // 10MB
  
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello",
      config: {
        systemInstruction: extremelyLargeString
      }
    });
    console.log("Success with gemini-3-flash-preview");
  } catch (e) {
    console.log("Error 3:", e.message);
  }
}
test();
