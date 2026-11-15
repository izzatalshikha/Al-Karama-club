import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// إعداد عميل Supabase على خادم Node.js للمصادقة الآمنة بعيداً عن حزمة المتصفح
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kfwqoigsghlgigjriyxf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';
const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// دالة توحيد وتطبيع النصوص العربية للتحقق من الأسماء بدقة
function normalizeArabic(text: string): string {
  return (text || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // حذف التشكيل والحركات
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// محدد معدل الطلبات في الذاكرة (In-Memory Sliding Window Rate Limiter)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  const requests = new Map<string, RateLimitRecord>();

  // تنظيف دوري للذاكرة كل 5 دقائق
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requests.entries()) {
      if (record.resetTime <= now) {
        requests.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || record.resetTime <= now) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec
      });
    }

    record.count += 1;
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // خفض حد الـ Payload إلى 2MB لمنع هجمات حجب الخدمة واستهلاك الذاكرة (DoS)
  app.use(express.json({ limit: '2mb' }));

  // ترويسات الحماية الأساسية
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // محددات معدل الطلبات
  // تسجيل الدخول: 10 محاولات كل 5 دقائق لمنع التخمين (Brute-Force Protection)
  const authLimiter = createRateLimiter(
    5 * 60 * 1000, 
    10, 
    "تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. يرجى الانتظار 5 دقائق والمحاولة مجدداً."
  );

  // استعلامات الذكاء الاصطناعي: 25 طلباً بالدقيقة
  const aiLimiter = createRateLimiter(
    60 * 1000, 
    25, 
    "تم تجاوز المعدل المسموح لاستعلامات الذكاء الاصطناعي. يرجى الانتظار قليلاً."
  );

  // -------------------------------------------------------------
  // مسار المصادقة الآمن في السيرفر (Server-Side Authentication)
  // لا يرسل كلمات السر الصريحة للواجهة ولا يسرب بيانات الحسابات
  // -------------------------------------------------------------
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const inputU = String(req.body.username || '').trim();
      const inputP = String(req.body.password || '').trim();
      const isPlayerLogin = Boolean(req.body.isPlayerLogin);

      if (!inputU || !inputP) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبة." });
      }

      // 1. تسجيل دخول اللاعبين (الاسم + آخر 6 أرقام من الرقم الوطني)
      if (isPlayerLogin) {
        const { data: matchedPlayers, error: pErr } = await supabaseServer
          .from('people')
          .select('id, name, nationalId, role, category')
          .eq('role', 'لاعب')
          .ilike('name', `%${inputU}%`);

        if (!pErr && matchedPlayers && matchedPlayers.length > 0) {
          const targetNorm = normalizeArabic(inputU);
          const found = matchedPlayers.find(pl => {
            const nameNorm = normalizeArabic(pl.name);
            const rawNat = String(pl.nationalId || '').trim();
            const last6Nat = rawNat.length >= 6 ? rawNat.slice(-6) : rawNat;
            const isNameMatch = nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
            const isPassMatch = last6Nat && last6Nat === inputP;
            return isNameMatch && isPassMatch;
          });

          if (found) {
            return res.json({
              success: true,
              user: {
                id: found.id,
                username: found.name,
                role: 'لاعب',
                relatedPersonId: found.id,
                restrictedCategory: found.category
              }
            });
          }
        }
        return res.status(401).json({ error: "اسم اللاعب أو آخر 6 أرقام من الرقم الوطني غير متطابقة." });
      }

      // 2. تسجيل دخول المدير العام (عزت عامر الشيخة) - فحص آمن على الخادم فقط
      if ((inputU === 'عزت' || inputU.toUpperCase() === 'IZZAT') && (inputP === '123' || inputP === 'KSC@2006')) {
        return res.json({
          success: true,
          user: {
            id: '4487c375-26ba-44a6-84bb-c59e5abb99f8',
            username: 'عزت عامر الشيخة',
            role: 'مدير'
          }
        });
      }

      // 3. مطابقة حسابات الكادر في جدول app_users دون تسريب كلمات المرور للعميل
      const { data: dbUser } = await supabaseServer
        .from('app_users')
        .select('id, username, role, restrictedCategory')
        .eq('username', inputU)
        .eq('password', inputP)
        .maybeSingle();

      if (dbUser) {
        return res.json({
          success: true,
          user: {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            restrictedCategory: dbUser.restrictedCategory
          }
        });
      }

      // 4. مطابقة حسابات الكوادر والمدربين في جدول people (بالاسم ورقم الهاتف أو آخر 6 أرقام وطني)
      const { data: matchedStaff } = await supabaseServer
        .from('people')
        .select('id, name, nationalId, phone, role, category')
        .neq('role', 'لاعب')
        .ilike('name', `%${inputU}%`);

      if (matchedStaff && matchedStaff.length > 0) {
        const targetNorm = normalizeArabic(inputU);
        const foundStaff = matchedStaff.find(st => {
          const nameNorm = normalizeArabic(st.name);
          const rawNat = String(st.nationalId || '').trim();
          const last6Nat = rawNat.length >= 6 ? rawNat.slice(-6) : rawNat;
          const phone = String(st.phone || '').trim();
          const isNameMatch = nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
          const isPassMatch = (last6Nat && last6Nat === inputP) || (phone && phone === inputP);
          return isNameMatch && isPassMatch;
        });

        if (foundStaff) {
          return res.json({
            success: true,
            user: {
              id: foundStaff.id,
              username: foundStaff.name,
              role: foundStaff.role || 'مدرب',
              relatedPersonId: foundStaff.id,
              restrictedCategory: foundStaff.category
            }
          });
        }
      }

      // 5. مطابقة أولياء الأمور في جدول people
      const { data: parentData } = await supabaseServer
        .from('people')
        .select('id, phone, birthDate, category')
        .eq('phone', inputU)
        .limit(1);

      if (parentData && parentData.length > 0) {
        const parentRecord = parentData[0];
        if (parentRecord.birthDate && parentRecord.birthDate.substring(0, 4) === inputP) {
          return res.json({
            success: true,
            user: {
              id: parentRecord.id,
              username: parentRecord.phone,
              role: 'ولي أمر',
              relatedPersonId: parentRecord.id,
              restrictedCategory: parentRecord.category
            }
          });
        }
      }

      return res.status(401).json({ error: "بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور." });
    } catch (err: any) {
      console.error("Login route error:", err);
      return res.status(500).json({ error: "حدث خطأ غير متوقع أثناء معالجة تسجيل الدخول." });
    }
  });

  // -------------------------------------------------------------
  // مسار مقارنة اللاعبين الذكية مع حماية Rate Limiter
  // -------------------------------------------------------------
  app.post("/api/compare-players", aiLimiter, async (req, res) => {
    try {
      const { player1, player2 } = req.body;
      if (!player1 || !player2) {
        return res.status(400).json({ error: "Missing players data" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ error: "GEMINI_API_KEY is missing from environment variables." });
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        أنت المحلل الفني الذكي لنظام "Eagle OS" الخاص بنادي الكرامة الرياضي.
        مهمتك هي قراءة الإحصائيات والمعلومات الخاصة بلاعبين اثنين، وإجراء مقارنة فنية بينهما وتقديم "توصية سريعة" للمدرب حول اللاعب الأنسب لمركزهما بناءً على الأرقام.
        كن مباشراً، موضوعياً، وركز على نقاط القوة لكل منهما واختم بتوصية واضحة.
      `;
      const prompt = `
        بيانات اللاعب الأول:
        ${JSON.stringify(player1, null, 2)}
        
        بيانات اللاعب الثاني:
        ${JSON.stringify(player2, null, 2)}
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

  // -------------------------------------------------------------
  // مسار البحث الشامل الذكي Omni-Search مع حماية Rate Limiter
  // -------------------------------------------------------------
  app.post("/api/omnisearch", aiLimiter, async (req, res) => {
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
      server: { middlewareMode: true, hmr: false, ws: false },
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
