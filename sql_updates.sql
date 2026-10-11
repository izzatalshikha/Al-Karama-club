-- تحديث جدول التقييمات الفنية لإضافة بيانات الرادار (إذا لم يكن موجوداً)
ALTER TABLE public.technical_reports ADD COLUMN IF NOT EXISTS "radarData" JSONB;

-- إنشاء جدول الانتقالات والإعارة
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY,
    "playerId" UUID,
    "playerName" TEXT,
    "playerData" TEXT,
    "coachName" TEXT,
    "supervisorName" TEXT,
    "documentUrl" TEXT,
    notes TEXT,
    status TEXT DEFAULT 'قيد الانتظار',
    date TEXT
);

-- تفعيل أمان مستوى الصف (RLS)
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الوصول للجدول الجديد
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transfers;
CREATE POLICY "Enable read access for all users" ON public.transfers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.transfers;
CREATE POLICY "Enable insert access for all users" ON public.transfers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.transfers;
CREATE POLICY "Enable update access for all users" ON public.transfers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.transfers;
CREATE POLICY "Enable delete access for all users" ON public.transfers FOR DELETE USING (true);
