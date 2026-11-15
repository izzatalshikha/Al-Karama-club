-- ============================================================================
-- تحديث صلاحيات الحسابات وسجل التدقيق والتعديلات (RBAC + Audit Trail)
-- آمن تماماً (Idempotent) بدون أي حذف أو تعديل لبيانات قائمة
-- ============================================================================

-- 1) إضافة حقل اسم ودور آخر معدل في جدول المستودع (warehouse)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'warehouse'
  ) THEN
    ALTER TABLE public.warehouse ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
  END IF;
END $$;

-- 2) إنشاء جدول سجل التعديلات والحسابات (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  section TEXT NOT NULL,
  "targetName" TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهرس زمني لتسريع عرض السجل للمدير
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs ("createdAt" DESC);

-- تفعيل سياسة الوصول لجدول سجل التعديلات
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow all access to audit_logs"
    ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- إعادة تحميل مخطط PostgREST ليتعرف على الجدول والعمود الجديد فوراً
NOTIFY pgrst, 'reload schema';
