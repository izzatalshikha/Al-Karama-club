import { InjuryRecord, Person, PlayerMedicalCard, RTPStage, InjuryMechanism, TreatmentSession } from '../types';

export const RTP_STAGES_CONFIG: Record<RTPStage, { step: number; label: string; shortLabel: string; description: string; badgeClass: string; barColor: string }> = {
  clinic: {
    step: 1,
    label: '1. العيادة والعلاج الفيزيائي',
    shortLabel: 'عيادة',
    description: 'العلاج السريري، تخفيف التورم والألم، استعادة المدى الحركي السلبي.',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    barColor: 'bg-rose-500'
  },
  gym: {
    step: 2,
    label: '2. صالة التقوية والاستشفاء',
    shortLabel: 'صالة حديد',
    description: 'تمارين التقوية العضلية، الثبات والاتزان، واستعادة التناظر العضلي.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    barColor: 'bg-amber-500'
  },
  pitch: {
    step: 3,
    label: '3. التأهيل الفردي على العشب',
    shortLabel: 'تأهيل بالملعب',
    description: 'الجري الميداني، تغيير الاتجاهات بالكرة وبدونها تحت إشراف المعالج.',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    barColor: 'bg-sky-500'
  },
  partial: {
    step: 4,
    label: '4. تدريب جزئي مع الفريق',
    shortLabel: 'تدريب جزئي',
    description: 'المشاركة في الإحماء والتدريبات الفنية مع تجنب الاحتكاك العنيف.',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    barColor: 'bg-indigo-500'
  },
  cleared: {
    step: 5,
    label: '5. تصريح طبي كامل وجاهز للمباريات',
    shortLabel: 'جاهز تماماً',
    description: 'اجتياز الفحوصات الوظيفية بالكامل والموافقة الطبية على خوض المباريات.',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barColor: 'bg-emerald-500'
  }
};

export const COMMON_INJURY_TYPES = [
  'تمزق عضلي (عضلة خلفية Hamstring)',
  'تمزق عضلي (عضلة ضامة Adductor)',
  'إجهاد عضلي (عضلة أمامية Quadriceps)',
  'شد عضلي (عضلة السمانة Calf)',
  'التواء الكاحل (Ankle Sprain)',
  'إصابة رباط ركبة (ACL / MCL)',
  'إصابة غضروف الركبة (Meniscus)',
  'خلع أو التواء الكتف (Shoulder Injury)',
  'كسر عظمي / شرخ إجهادي (Stress Fracture)',
  'التهاب أوتار (Tendinitis)',
  'رض كدمي حاد (Severe Contusion)',
  'ارتجاج في المخ (Concussion)',
  'إصابة أخرى'
];

export const ANATOMICAL_BODY_ZONES = [
  'الرأس والرقبة',
  'الكتف والترقوة',
  'الذراع والمرفق',
  'المعصم واليد',
  'الصدر والأضلاع',
  'أسفل الظهر والعمود الفقري',
  'الحوض والعانة (الضامة)',
  'الفخذ (الأمامي / الخلفي)',
  'الركبة (الأربطة والغضاريف)',
  'الساق والسمانة',
  'مفصل الكاحل',
  'أخمص وقوس القدم والأصابع'
];

const METADATA_DELIMITER = '\n---[MED_META_START]---\n';
const METADATA_END = '\n---[MED_META_END]---';

/**
 * دمج البيانات المتقدمة للإصابة داخل حقل notes لتخزينها في Supabase
 * دون الحاجة لأعمدة إضافية تسبب أخطاء PGRST204
 */
export function encodeInjuryToDbPayload(injury: InjuryRecord): any {
  const metadata: any = {
    rtpStage: injury.rtpStage || (injury.status === 'تعافى' ? 'cleared' : injury.status === 'علاج مكثف' ? 'clinic' : 'pitch'),
    mechanism: injury.mechanism || 'non_contact',
    imagingUrls: injury.imagingUrls || [],
    imagingType: injury.imagingType || 'MRI',
    doctorNotesToCoach: injury.doctorNotesToCoach || '',
    bodyZone: injury.bodyZone || injury.location || '',
    treatmentsLog: injury.treatmentsLog || []
  };

  const rawNotes = (injury.notes || '').split('---[MED_META_START]---')[0].trim();
  const encodedNotes = `${rawNotes}${METADATA_DELIMITER}${JSON.stringify(metadata)}${METADATA_END}`;

  return {
    id: injury.id,
    personId: injury.personId,
    type: injury.type || 'إصابة',
    location: injury.location || 'غير محدد',
    severity: injury.severity || 'خفيفة',
    startDate: injury.startDate || new Date().toISOString().split('T')[0],
    expectedReturn: injury.expectedReturn || '',
    status: injury.status || 'تأهيل',
    notes: encodedNotes
  };
}

/**
 * فك تشفير البيانات المتقدمة من حقل notes عند القراءة من Supabase
 */
export function decodeInjuryRecord(injury: any): InjuryRecord {
  const rawNotes = injury.notes || '';
  let cleanNotes = rawNotes;
  let parsedMeta: any = {};

  if (rawNotes.includes('---[MED_META_START]---')) {
    try {
      const parts = rawNotes.split('---[MED_META_START]---');
      cleanNotes = parts[0].trim();
      const metaPart = parts[1].split('---[MED_META_END]---')[0].trim();
      parsedMeta = JSON.parse(metaPart);
    } catch (e) {
      // fallback
    }
  }

  // تحديد مرحلة RTP الافتراضية الذكية إن لم تكن مخزنة
  let rtpStage: RTPStage = parsedMeta.rtpStage;
  if (!rtpStage) {
    if (injury.status === 'تعافى') rtpStage = 'cleared';
    else if (injury.status === 'علاج مكثف') rtpStage = 'clinic';
    else rtpStage = 'pitch';
  }

  return {
    ...injury,
    notes: cleanNotes,
    rtpStage,
    mechanism: parsedMeta.mechanism || 'non_contact',
    imagingUrls: Array.isArray(parsedMeta.imagingUrls) ? parsedMeta.imagingUrls : [],
    imagingType: parsedMeta.imagingType || 'MRI',
    doctorNotesToCoach: parsedMeta.doctorNotesToCoach || '',
    bodyZone: parsedMeta.bodyZone || injury.location || '',
    treatmentsLog: Array.isArray(parsedMeta.treatmentsLog) ? parsedMeta.treatmentsLog : []
  };
}

/**
 * استخراج وتطبيع البطاقة الطبية للاعب من حقول Person
 */
export function getPlayerMedicalCard(player: Person): PlayerMedicalCard {
  if (player.medicalCard) return player.medicalCard;

  let parsedFromReport: any = null;
  if (player.monthlyReports?._medicalCard) {
    try {
      parsedFromReport = JSON.parse(player.monthlyReports._medicalCard);
    } catch (e) {}
  }

  return {
    bloodType: player.bloodType || parsedFromReport?.bloodType || '',
    allergies: parsedFromReport?.allergies || (player.medicalHistory?.includes('حساسية') ? player.medicalHistory : ''),
    chronicConditions: parsedFromReport?.chronicConditions || '',
    cardioScreeningDate: parsedFromReport?.cardioScreeningDate || '',
    cardioStatus: parsedFromReport?.cardioStatus || 'سليم',
    tueDetails: parsedFromReport?.tueDetails || '',
    ecgReportUrl: parsedFromReport?.ecgReportUrl || '',
    bloodPressure: parsedFromReport?.bloodPressure || '',
    restingHeartRate: parsedFromReport?.restingHeartRate || '',
    availabilityStatus: player.availabilityStatus || parsedFromReport?.availabilityStatus || 'available',
    availabilityNotes: parsedFromReport?.availabilityNotes || ''
  };
}

/**
 * تجهيز بيانات اللاعب لحفظ بطاقته الطبية بأمان في السحابة
 */
export function preparePlayerWithMedicalCard(player: Person, updatedCard: PlayerMedicalCard): Partial<Person> {
  const newMonthlyReports = {
    ...(player.monthlyReports || {}),
    _medicalCard: JSON.stringify(updatedCard)
  };

  const humanSummary = [
    updatedCard.allergies ? `الحساسية: ${updatedCard.allergies}` : null,
    updatedCard.chronicConditions ? `أمراض سابقة: ${updatedCard.chronicConditions}` : null,
    updatedCard.cardioStatus ? `فحص القلب: ${updatedCard.cardioStatus}` : null,
    updatedCard.tueDetails ? `استثناء المنشطات: ${updatedCard.tueDetails}` : null
  ].filter(Boolean).join(' | ');

  return {
    ...player,
    bloodType: updatedCard.bloodType || player.bloodType,
    medicalHistory: humanSummary || player.medicalHistory || '',
    medicalCard: updatedCard,
    availabilityStatus: updatedCard.availabilityStatus || player.availabilityStatus || 'available',
    monthlyReports: newMonthlyReports
  };
}
