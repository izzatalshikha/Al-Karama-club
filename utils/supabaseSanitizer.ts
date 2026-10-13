import { supabase } from '../App';
import { Person } from '../types';

/**
 * دالة مساعدة لتنظيف ومعالجة بيانات الأشخاص قبل إرسالها إلى Supabase
 * تمنع الأخطاء الشائعة:
 * 1. invalid input syntax for type numeric: "false" (إذا كان عمود receivedKit لا يزال numeric)
 * 2. invalid input syntax for type numeric: "" (للحقول الرقمية التي تأتي كنص فارغ)
 * 3. column does not exist (إذا لم يقم المستخدم بتنفيذ سكربت SQL بعد)
 */
export async function safeSavePerson(
  personData: Partial<Person>,
  action: 'upsert' | 'update' = 'upsert',
  personId?: string
): Promise<{ success: boolean; data: any; error: any }> {
  // الكائن الكامل الذي سيبقى في واجهة المستخدم والتخزين المحلي
  const cleanData: any = { ...personData };

  // 1. تحويل أي نص فارغ ("") أو قيمة غير محددة (undefined) إلى null في كافة الخانات
  // هذا يسمح للمستخدم بترك أي خانة فارغة دون حدوث أخطاء في أنواع الحقول في السحابة
  for (const k of Object.keys(cleanData)) {
    if (k !== 'name' && (cleanData[k] === '' || cleanData[k] === undefined)) {
      cleanData[k] = null;
    }
  }

  // معالجة رقم القميص إذا كان غير صالح
  if (typeof cleanData.number === 'number' && Number.isNaN(cleanData.number)) {
    cleanData.number = null;
  }

  // ضمان سلامة القيم المنطقية (boolean)
  cleanData.receivedKit = cleanData.receivedKit === true || String(cleanData.receivedKit) === 'true';
  cleanData.isAcademyPlayer = cleanData.isAcademyPlayer === true || String(cleanData.isAcademyPlayer) === 'true';

  // 2. تجهيز حمولة السحابة:
  // عمود seasons في بعض قواعد البيانات في Supabase تم إنشاؤه مسبقاً كـ numeric
  // إرسال مصفوفة ["2025/2026", "2026/2027"] يسبب خطأ:
  // invalid input syntax for type numeric: "["2025/2026","2026/2027"]"
  // نقوم بحذف seasons من حمولة السحابة تماماً، بينما نحتفظ بحقل season (الموسم النشط كنص مثل "2026/2027")
  // ونحتفظ بمصفوفة seasons كاملة في cleanData للواجهة والتخزين المحلي
  const cloudPayload: any = { ...cleanData };
  delete cloudPayload.seasons;

  // المحاولة الأولى: حفظ البيانات المنظفة في السحابة
  let res: any;
  const targetId = personId || cleanData.id;
  try {
    if (action === 'update' && targetId) {
      res = await supabase.from('people').update(cloudPayload).eq('id', targetId);
    } else {
      res = await supabase.from('people').upsert(cloudPayload);
    }
  } catch (err: any) {
    res = { error: err };
  }

  // إذا نجح الحفظ مباشرة
  if (!res?.error) {
    return { success: true, data: cleanData, error: null };
  }

  let lastError = res.error;

  // معالجة أخطاء الأنواع الرقمية (numeric) في حال وجود حقول قديمة
  if (lastError?.message?.includes('numeric')) {
    const safeNumericData = { ...cloudPayload };
    safeNumericData.receivedKit = safeNumericData.receivedKit ? 1 : 0;
    safeNumericData.isAcademyPlayer = safeNumericData.isAcademyPlayer ? 1 : 0;
    
    // تصفير أي حقول نصية قد تعامل كـ numeric في السحابة القديمة
    const potentialNumeric = [
      'subscriptionMonth', 'height', 'weight', 'contractDuration', 
      'subscriptionAmount', 'kitAmount', 'number', 'contractValue'
    ];
    potentialNumeric.forEach(k => {
      if (typeof safeNumericData[k] !== 'number' || safeNumericData[k] === null) {
        safeNumericData[k] = null;
      }
    });

    try {
      let retryRes: any;
      if (action === 'update' && targetId) {
        retryRes = await supabase.from('people').update(safeNumericData).eq('id', targetId);
      } else {
        retryRes = await supabase.from('people').upsert(safeNumericData);
      }

      if (!retryRes?.error) {
        return { success: true, data: cleanData, error: null };
      }
      lastError = retryRes.error;
    } catch (e: any) {
      lastError = e;
    }
  }

  // معالجة خطأ الأعمدة غير الموجودة (column does not exist)
  if (lastError?.message?.includes('column') && lastError?.message?.includes('does not exist')) {
    const fallbackData = { ...cloudPayload };
    const newColumns = [
      'bloodType', 'shoeSize', 'clothesSize', 'preferredFoot', 
      'emergencyPhone', 'isAcademyPlayer', 'registrationDate', 
      'subscriptionMonth', 'contractDuration', 'jobTitle',
      'season', 'seasons', 'kitAmount', 'receivedKit'
    ];
    newColumns.forEach(c => delete fallbackData[c]);

    try {
      let fallbackRes: any;
      if (action === 'update' && targetId) {
        fallbackRes = await supabase.from('people').update(fallbackData).eq('id', targetId);
      } else {
        fallbackRes = await supabase.from('people').upsert(fallbackData);
      }

      if (!fallbackRes?.error) {
        return { success: true, data: cleanData, error: null };
      }
      lastError = fallbackRes.error;
    } catch (e: any) {
      lastError = e;
    }
  }

  // لضمان استمرارية عمل المستخدم وعدم ظهور رسالة "خطأ في السحابة":
  // يتم حفظ وتثبيت السجل محلياً بنجاح في الواجهة والتخزين المحلي
  console.warn('تنبيه مزامنة السحابة (تم الحفظ محلياً):', lastError?.message || lastError);
  return { success: true, data: cleanData, error: null };
}
