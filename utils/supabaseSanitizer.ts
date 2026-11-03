import { supabase } from '../App';
import { Person } from '../types';

/**
 * دالة مساعدة موثوقة لتنظيف وتأمين حفظ بيانات الأفراد (اللاعبين والكوادر) في Supabase
 * تمنع تراجع البيانات، وتمنع حذف المواسم عند التعديلات الجزئية، وتدعم أسماء الأعمدة بنمطيها camelCase و snake_case
 */
export async function safeSavePerson(
  personData: Partial<Person>,
  action: 'upsert' | 'update' = 'upsert',
  personId?: string
): Promise<{ success: boolean; data: any; error: any }> {
  const isPartialUpdate = action === 'update';
  const cleanData: any = { ...personData };

  // 1. تنظيف الحقول غير المحددة والنصوص الفارغة
  for (const k of Object.keys(cleanData)) {
    if (cleanData[k] === undefined) {
      if (isPartialUpdate) {
        delete cleanData[k]; // لا نرسل الحقل عند التعديل الجزئي حتى لا نمسحه في السحابة
      } else if (k !== 'name') {
        cleanData[k] = null;
      }
    } else if (cleanData[k] === '' && k !== 'name') {
      cleanData[k] = null;
    }
  }

  // معالجة رقم القميص إذا كان غير صالح
  if ('number' in cleanData) {
    if (typeof cleanData.number === 'number' && Number.isNaN(cleanData.number)) {
      cleanData.number = null;
    }
  }

  // معالجة المواسم: فقط إذا تم تمريرها صراحة أو كان upsert كاملاً
  if ('seasons' in cleanData || 'season' in cleanData || !isPartialUpdate) {
    const rawSeasons: string[] = [
      ...(Array.isArray(cleanData.seasons) ? cleanData.seasons : []),
      ...(typeof cleanData.season === 'string' ? cleanData.season.split(',') : [])
    ].map(s => String(s || '').trim()).filter(Boolean);
    const deduplicatedSeasons = Array.from(new Set(rawSeasons));
    
    if (deduplicatedSeasons.length > 0) {
      cleanData.seasons = deduplicatedSeasons;
      cleanData.season = deduplicatedSeasons[deduplicatedSeasons.length - 1];
    } else if (!isPartialUpdate) {
      cleanData.seasons = ['2025/2026'];
      cleanData.season = '2025/2026';
    }
  }

  // معالجة تصنيف الأكاديمية واستلام الطقم فقط إذا تم تمريرهما أو عند الإنشاء الكامل
  if ('receivedKit' in cleanData || !isPartialUpdate) {
    cleanData.receivedKit = cleanData.receivedKit === true || String(cleanData.receivedKit) === 'true';
  }
  if ('isAcademyPlayer' in cleanData || !isPartialUpdate) {
    cleanData.isAcademyPlayer = Boolean(cleanData.isAcademyPlayer);
  }

  // ضمان حفظ سجل الوزن بشكل مرن (سواء في عمود مستقل أو داخل monthlyReports)
  if (Array.isArray(cleanData.weightHistory)) {
    cleanData.monthlyReports = {
      ...(cleanData.monthlyReports || {}),
      _weightHistory: JSON.stringify(cleanData.weightHistory)
    };
  } else if (cleanData.monthlyReports?._weightHistory && !cleanData.weightHistory) {
    try {
      cleanData.weightHistory = JSON.parse(cleanData.monthlyReports._weightHistory);
    } catch (e) {}
  }

  // مزامنة الصور الشخصية في كائن التقرير الشهري أيضاً لضمان استرجاعها دائماً
  if (cleanData.photo) {
    cleanData.monthlyReports = {
      ...(cleanData.monthlyReports || {}),
      _photo: cleanData.photo
    };
  } else if (cleanData.monthlyReports?._photo && !cleanData.photo) {
    cleanData.photo = cleanData.monthlyReports._photo;
  }

  // مزامنة الشهادات التدريبية للكوادر
  if (Array.isArray(cleanData.certificates) && cleanData.certificates.length > 0) {
    cleanData.monthlyReports = {
      ...(cleanData.monthlyReports || {}),
      _certificates: JSON.stringify(cleanData.certificates)
    };
  } else if ((!cleanData.certificates || cleanData.certificates.length === 0) && cleanData.monthlyReports?._certificates) {
    try {
      cleanData.certificates = JSON.parse(cleanData.monthlyReports._certificates);
    } catch (e) {}
  }

  // مزامنة الخبرات السابقة للكوادر
  if (Array.isArray(cleanData.experiences) && cleanData.experiences.length > 0) {
    cleanData.monthlyReports = {
      ...(cleanData.monthlyReports || {}),
      _experiences: JSON.stringify(cleanData.experiences)
    };
  } else if ((!cleanData.experiences || cleanData.experiences.length === 0) && cleanData.monthlyReports?._experiences) {
    try {
      cleanData.experiences = JSON.parse(cleanData.monthlyReports._experiences);
    } catch (e) {}
  }

  // 2. تجهيز حمولة السحابة ودعم نمطي التسمية camelCase و snake_case بالتوازي لضمان الحفظ
  const cloudPayload: any = { ...cleanData };

  if ('passportNumber' in cleanData) cloudPayload.passport_number = cleanData.passportNumber;
  if ('passport_number' in cleanData) cloudPayload.passportNumber = cleanData.passport_number;

  if ('passportIssueDate' in cleanData) cloudPayload.passport_issue_date = cleanData.passportIssueDate;
  if ('passport_issue_date' in cleanData) cloudPayload.passportIssueDate = cleanData.passport_issue_date;

  if ('passportExpiryDate' in cleanData) cloudPayload.passport_expiry_date = cleanData.passportExpiryDate;
  if ('passport_expiry_date' in cleanData) cloudPayload.passportExpiryDate = cleanData.passport_expiry_date;

  // السماح بروابط الصور السحابية السريعة (Cloudinary URLs) وحظر نصوص Base64 الثقيلة لحماية السحابة
  const isSafeUrl = (val: any) => typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://')) && val.length < 1500;

  if (isSafeUrl(cleanData.photo)) {
    cloudPayload.photo = cleanData.photo;
  } else {
    delete cloudPayload.photo;
  }

  if (isSafeUrl(cleanData.idCardImage)) {
    cloudPayload.id_card_image = cleanData.idCardImage;
    cloudPayload.idCardImage = cleanData.idCardImage;
  } else {
    delete cloudPayload.idCardImage;
    delete cloudPayload.id_card_image;
  }

  if (isSafeUrl(cleanData.idCardBackImage)) {
    cloudPayload.id_card_back_image = cleanData.idCardBackImage;
    cloudPayload.idCardBackImage = cleanData.idCardBackImage;
  } else {
    delete cloudPayload.idCardBackImage;
    delete cloudPayload.id_card_back_image;
  }

  if (isSafeUrl(cleanData.passportImage)) {
    cloudPayload.passport_image = cleanData.passportImage;
    cloudPayload.passportImage = cleanData.passportImage;
  } else {
    delete cloudPayload.passportImage;
    delete cloudPayload.passport_image;
  }

  // تنظيف الشهادات للتأكد من عدم تمرير أي Base64 وحفظ روابط Cloudinary السريعة فقط
  if (Array.isArray(cleanData.certificates)) {
    const safeCerts = cleanData.certificates.map((cert: any) => ({
      ...cert,
      image: isSafeUrl(cert?.image) ? cert.image : (typeof cert?.image === 'string' && cert.image.startsWith('data:') ? undefined : cert?.image)
    }));
    cloudPayload.certificates = safeCerts;
    cleanData.certificates = safeCerts;
  }

  if (cloudPayload.monthlyReports) {
    const cleanMonthly = { ...cloudPayload.monthlyReports };
    delete cleanMonthly._photo;
    if (cleanData.certificates && Array.isArray(cleanData.certificates)) {
      cleanMonthly._certificates = JSON.stringify(cleanData.certificates);
    }
    cloudPayload.monthlyReports = cleanMonthly;
  }

  // المحاولة الأولى: حفظ البيانات في Supabase واسترجاع المعرف فقط (لتجنب استدعاء أعمدة TOAST الثقيلة)
  let res: any;
  const targetId = personId || cleanData.id;
  try {
    if (action === 'update' && targetId) {
      res = await supabase.from('people').update(cloudPayload).eq('id', targetId).select('id');
    } else {
      res = await supabase.from('people').upsert(cloudPayload).select('id');
    }
  } catch (err: any) {
    res = { error: err };
  }

  // إذا نجح الحفظ مباشرة
  if (!res?.error && (!res?.data || res?.data?.length > 0)) {
    return { success: true, data: cleanData, error: null };
  }

  let lastError = res?.error || new Error('تعذر تحديث السجل في السحابة');

  // محاولة ثانية: معالجة أخطاء الأنواع الرقمية (numeric)
  if (lastError?.message?.includes('numeric')) {
    const safeNumericData = { ...cloudPayload };
    if ('receivedKit' in safeNumericData) {
      safeNumericData.receivedKit = safeNumericData.receivedKit ? 1 : 0;
    }
    if ('isAcademyPlayer' in safeNumericData) {
      safeNumericData.isAcademyPlayer = safeNumericData.isAcademyPlayer ? 1 : 0;
    }
    
    const potentialNumeric = [
      'subscriptionMonth', 'height', 'weight', 'contractDuration', 
      'subscriptionAmount', 'kitAmount', 'number', 'contractValue'
    ];
    potentialNumeric.forEach(k => {
      if (k in safeNumericData && (typeof safeNumericData[k] !== 'number' || safeNumericData[k] === null)) {
        safeNumericData[k] = null;
      }
    });

    try {
      let retryRes: any;
      if (action === 'update' && targetId) {
        retryRes = await supabase.from('people').update(safeNumericData).eq('id', targetId).select('id');
      } else {
        retryRes = await supabase.from('people').upsert(safeNumericData).select('id');
      }

      if (!retryRes?.error) {
        return { success: true, data: cleanData, error: null };
      }
      lastError = retryRes.error;
    } catch (e: any) {
      lastError = e;
    }
  }

  // محاولة ثالثة: معالجة خطأ الأعمدة غير الموجودة (column does not exist)
  if (lastError?.message?.includes('column') && lastError?.message?.includes('does not exist')) {
    const fallbackData = { ...cloudPayload };
    const newColumns = [
      'bloodType', 'shoeSize', 'clothesSize', 'preferredFoot', 
      'emergencyPhone', 'isAcademyPlayer', 'registrationDate', 
      'subscriptionMonth', 'contractDuration', 'jobTitle',
      'season', 'seasons', 'kitAmount', 'receivedKit', 'weightHistory', 'weight_history', 'photo',
      'certificates', 'experiences', 'academicDegree', 'coachingCertificate',
      'passport_number', 'passport_issue_date', 'passport_expiry_date',
      'id_card_image', 'id_card_back_image', 'passport_image'
    ];
    newColumns.forEach(c => delete fallbackData[c]);

    try {
      let fallbackRes: any;
      if (action === 'update' && targetId) {
        fallbackRes = await supabase.from('people').update(fallbackData).eq('id', targetId).select('id');
      } else {
        fallbackRes = await supabase.from('people').upsert(fallbackData).select('id');
      }

      if (!fallbackRes?.error) {
        return { success: true, data: cleanData, error: null };
      }
      lastError = fallbackRes.error;
    } catch (e: any) {
      lastError = e;
    }
  }

  console.error('خطأ مزامنة مع Supabase:', lastError?.message || lastError);
  return { success: false, data: cleanData, error: lastError };
}
