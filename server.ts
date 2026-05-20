import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route for Omni-Search AI
  app.post("/api/omnisearch", async (req, res) => {
    try {
      const { query, summary } = req.body;
      if (!query || !summary) {
        return res.status(400).json({ error: "Missing query or summary" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ error: "GEMINI_API_KEY is missing from environment variables." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        أنت المحلل الذكي لنظام "Eagle OS" الخاص بنادي الكرامة الرياضي.
        تم تدريبك للإجابة باختصار ودقة على أسئلة المستخدم (المدرب/المدير) بناءً على البيانات المقدمة لك بصيغة JSON.
        كن مباشراً ورسمياً (Eagle OS AI). قدم معلومات دقيقة وأرقام صحيحة بناءً على تحليل الـ JSON المرفق حصرياً.
      `;

      const prompt = `
        المعطيات (JSON):
        ${summary}
        
        تعليمات خاصة للبحث:
        إذا سأل كم لاعب من مواليد سنة معينة، ابحث في الحقل birthDate للمطابقة مع تلك السنة.
        قم بتحليل الكائنات والعلاقات بينها بصورة عميقة ومباشرة.
        
        سؤال المستخدم:
        ${query}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { systemInstruction }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to generate AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
