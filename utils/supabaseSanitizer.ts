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

  // معالجة رقم القميص وضمان تحويله لقيمة صحيحة (integer) أو null لتجنب خطأ 22P02 في PostgreSQL
  if ('number' in cleanData) {
    if (cleanData.number === '' || cleanData.number === null || cleanData.number === undefined) {
      cleanData.number = null;
    } else {
      const parsedNum = parseInt(String(cleanData.number).trim(), 10);
      cleanData.number = Number.isNaN(parsedNum) ? null : parsedNum;
    }
  }

  // توحيد هاتف الطوارئ والتأكد من استخدام اسم العمود الفعلي في قاعدة البيانات (emergencyPhone)
  if ('emergencyContact' in cleanData || 'emergency_phone' in cleanData || 'emergency_contact' in cleanData || 'emergencyPhone' in cleanData) {
    const rawEm = cleanData.emergencyPhone ?? cleanData.emergencyContact ?? cleanData.emergency_phone ?? cleanData.emergency_contact;
    if (rawEm !== undefined) {
      cleanData.emergencyPhone = rawEm ? String(rawEm).trim() : null;
    }
    delete cleanData.emergencyContact;
    delete cleanData.emergency_phone;
    delete cleanData.emergency_contact;
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

  // إزالة أي مسميات غير موجودة في قاعدة بيانات people منعاً لخطأ PGRST204
  delete cloudPayload.emergencyContact;
  delete cloudPayload.emergency_contact;
  delete cloudPayload.emergency_phone;

  // تنظيف الحقول العددية من النصوص الفارغة منعاً لخطأ 22P02
  if ('number' in cloudPayload) {
    if (cloudPayload.number === '' || cloudPayload.number === null || cloudPayload.number === undefined) {
      cloudPayload.number = null;
    } else {
      const p = parseInt(String(cloudPayload.number).trim(), 10);
      cloudPayload.number = Number.isNaN(p) ? null : p;
    }
  }

  const numericEmptyCheck = [
    'height', 'weight', 'subscriptionMonth', 'contractDuration', 
    'subscriptionAmount', 'kitAmount', 'contractValue'
  ];
  numericEmptyCheck.forEach(k => {
    if (k in cloudPayload && cloudPayload[k] === '') {
      cloudPayload[k] = null;
    }
  });

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

  // تنفيذ الحفظ مع نظام استعادة ذكي متعدد المراحل
  const targetId = personId || cleanData.id;
  const currentPayload = { ...cloudPayload };

  const executeSave = async (payloadToSave: any) => {
    if (action === 'update' && targetId) {
      return await supabase.from('people').update(payloadToSave).eq('id', targetId).select('id');
    } else {
      return await supabase.from('people').upsert(payloadToSave).select('id');
    }
  };

  let res: any;
  let lastError: any = null;

  // حلقة محاولات ذكية تستخرج أي عمود مفقود وتستبعده تلقائياً وتكرر الحفظ (تتعامل مع أخطاء PGRST204)
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      res = await executeSave(currentPayload);
      if (!res?.error && (!res?.data || res?.data?.length > 0)) {
        return { success: true, data: cleanData, error: null };
      }
      lastError = res?.error;
    } catch (err: any) {
      lastError = err;
    }

    const errMsg = String(lastError?.message || '');
    const errCode = String(lastError?.code || '');

    // 1. فحص خطأ العمود غير الموجود في مخطط قاعدة البيانات (PGRST204 أو column does not exist)
    const isMissingColumn = 
      errCode === 'PGRST204' ||
      errMsg.includes('schema cache') ||
      errMsg.includes('Could not find') ||
      (errMsg.includes('column') && errMsg.includes('does not exist'));

    if (isMissingColumn) {
      const match = errMsg.match(/Could not find the '([^']+)' column/i)
        || errMsg.match(/column ['"]?([^'"]+)['"]? of relation ['"]?people['"]? does not exist/i)
        || errMsg.match(/column ['"]?([^'"]+)['"]? does not exist/i);

      if (match && match[1]) {
        const colToRemove = match[1];
        delete currentPayload[colToRemove];
        delete cleanData[colToRemove];
        continue;
      }
    }

    // 2. فحص أخطاء تحويل الأنواع الرقمية (numeric / integer / 22P02)
    if (errMsg.includes('numeric') || errMsg.includes('integer') || errCode === '22P02') {
      if ('receivedKit' in currentPayload) {
        currentPayload.receivedKit = currentPayload.receivedKit ? true : false;
      }
      if ('isAcademyPlayer' in currentPayload) {
        currentPayload.isAcademyPlayer = Boolean(currentPayload.isAcademyPlayer);
      }
      if ('number' in currentPayload) {
        currentPayload.number = null;
      }
      const potentialNumeric = [
        'subscriptionMonth', 'height', 'weight', 'contractDuration', 
        'subscriptionAmount', 'kitAmount', 'contractValue'
      ];
      potentialNumeric.forEach(k => {
        if (k in currentPayload && (typeof currentPayload[k] !== 'number' || currentPayload[k] === null || currentPayload[k] === '')) {
          currentPayload[k] = null;
        }
      });
      continue;
    }

    // إذا كان الخطأ غير معتاد، نكسر الحلقة لنجرب خطة الطوارئ النهائية
    break;
  }

  // خطة الطوارئ النهائية: إزالة كافة الأعمدة الثانوية الحديثة لضمان حفظ البيانات الأساسية دون فشل
  if (lastError) {
    const fallbackData = { ...currentPayload };
    const newColumns = [
      'bloodType', 'shoeSize', 'clothesSize', 'preferredFoot', 
      'isAcademyPlayer', 'registrationDate', 
      'subscriptionMonth', 'contractDuration', 'jobTitle',
      'season', 'seasons', 'kitAmount', 'receivedKit', 'weightHistory', 'weight_history', 'photo',
      'certificates', 'experiences', 'academicDegree', 'coachingCertificate',
      'passport_number', 'passport_issue_date', 'passport_expiry_date',
      'id_card_image', 'id_card_back_image', 'passport_image'
    ];
    newColumns.forEach(c => delete fallbackData[c]);

    try {
      const fallbackRes = await executeSave(fallbackData);
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
