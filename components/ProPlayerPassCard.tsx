import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck, Activity, AlertTriangle, CheckCircle2, Ruler,
  Footprints, Droplet, PhoneCall, MapPin, Shirt, CreditCard, Edit,
  QrCode, RotateCw, Printer, X, Calendar, Award, Trophy, UserCheck, FileCheck
} from 'lucide-react';
import { AppState, Person } from '../types';
import { getPlayerMedicalCard } from '../utils/medicalHelpers';
import ClubLogo from './ClubLogo';

interface ProPlayerPassCardProps {
  player: Person;
  state: AppState;
  selectedSeason?: string;
  onSeasonChange?: (season: string) => void;
  onEditProfile?: () => void;
  onOpenDocuments?: () => void;
  onPrint?: () => void;
}

export const ProPlayerPassCard: React.FC<ProPlayerPassCardProps> = ({
  player,
  state,
  selectedSeason: controlledSeason,
  onSeasonChange,
  onEditProfile,
  onOpenDocuments,
  onPrint,
}) => {
  const [isBackView, setIsBackView] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const playerSeasons = useMemo(() => {
    const raw = [
      ...(Array.isArray(player.seasons) ? player.seasons : []),
      ...(typeof player.season === 'string' ? player.season.split(',') : []),
    ]
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set(raw));
    return unique.length > 0 ? unique : [state.activeSeason || '2025/2026'];
  }, [player.seasons, player.season, state.activeSeason]);

  const activeSeasonFilter = controlledSeason || state.activeSeason || '2025/2026';

  const medicalCard = useMemo(() => getPlayerMedicalCard(player), [player]);

  // إحصائيات الموسم المختار أو جميع المواسم مجتمعة من المباريات والتمارين الفعلية
  const quickStats = useMemo(() => {
    const pName = (player.name || '').trim();
    let appearances = 0;
    let goals = 0;
    let assists = 0;
    let totalMins = 0;

    const matchesSeason = (mSeasonRaw?: string, mDate?: string) => {
      if (activeSeasonFilter === 'all' || activeSeasonFilter === 'الكل') return true;
      const mSeason = mSeasonRaw || (mDate?.startsWith('2027') ? '2026/2027' : '2025/2026');
      return mSeason === activeSeasonFilter;
    };

    (state.matches || [])
      .filter((m) => m.isCompleted && matchesSeason(m.season, m.date))
      .forEach((m) => {
        const starter = m.lineup?.starters?.find(
          (s) => s.playerId === player.id || (s.name && s.name.trim() === pName)
        );
        const sub = m.lineup?.subs?.find(
          (s) => s.playerId === player.id || (s.name && s.name.trim() === pName)
        );
        const inSquad = Array.isArray(m.squad) && m.squad.includes(player.id);
        const events = (m.events || []).filter(
          (e) => e.player === player.id || e.player === player.name || String(e.player || '').trim() === pName
        );
        if (starter || sub || inSquad || events.length > 0) {
          appearances += 1;
          const defMin = starter ? parseInt(m.matchDuration || '90', 10) || 90 : 0;
          totalMins += parseInt(starter?.minutesPlayed || sub?.minutesPlayed || String(defMin), 10) || defMin;
          goals += events.filter((e) => e.type === 'goal').length;
          assists += events.filter((e) => e.type === 'assist').length;
        }
      });

    const sessionMap = new Map((state.sessions || []).map((s) => [s.id, s]));
    const records = (state.attendance || []).filter((a) => {
      if (a.personId !== player.id) return false;
      if (activeSeasonFilter === 'all' || activeSeasonFilter === 'الكل') return true;
      const sess = sessionMap.get(a.sessionId) as any;
      const sessSeason = sess?.season || (a.date?.startsWith('2027') ? '2026/2027' : '2025/2026');
      return sessSeason === activeSeasonFilter;
    });
    const present = records.filter((r) => r.status === 'حاضر').length;
    const late = records.filter((r) => r.status === 'متأخر').length;
    const absent = records.filter((r) => r.status === 'غائب').length;
    const totalAtt = present + late + absent;
    const attendanceRate = totalAtt > 0 ? Math.min(100, Math.round(((present + late * 0.5) / totalAtt) * 100)) : 0;

    return { appearances, goals, assists, totalMins, attendanceRate, hasAttendance: totalAtt > 0 };
  }, [state.matches, state.sessions, state.attendance, player.id, player.name, activeSeasonFilter]);

  // حالة الجواز والوثائق
  const docSummary = useMemo(() => {
    const hasIdImages = Boolean(player.idCardImage || player.idCardBackImage);
    const hasPassport = Boolean(player.passportNumber || player.passportImage);

    if (player.passportExpiryDate) {
      const expiry = new Date(player.passportExpiryDate);
      const now = new Date();
      const diffMonths = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (expiry < now) {
        return { label: 'جواز السفر منتهي الصلاحية', tone: 'text-rose-300', Icon: AlertTriangle };
      }
      if (diffMonths <= 6) {
        return { label: 'الجواز ينتهي خلال أقل من 6 أشهر', tone: 'text-amber-300', Icon: AlertTriangle };
      }
      return { label: 'الوثائق وجواز السفر سارية', tone: 'text-emerald-300', Icon: FileCheck };
    }

    if (hasIdImages && hasPassport) {
      return { label: 'الوثائق الثبوتية مكتملة', tone: 'text-emerald-300', Icon: FileCheck };
    }
    if (hasIdImages || hasPassport) {
      return { label: 'بعض الوثائق مرفقة · يرجى استكمال الباقي', tone: 'text-amber-300', Icon: CreditCard };
    }
    return { label: 'يرجى رفع صورة الهوية وجواز السفر', tone: 'text-orange-300', Icon: CreditCard };
  }, [player.idCardImage, player.idCardBackImage, player.passportNumber, player.passportImage, player.passportExpiryDate]);

  // حالة الجاهزية الطبية المقروءة
  const readinessInfo = useMemo(() => {
    const activeInjuries = (state.injuries || []).filter(
      (inj) => inj.personId === player.id && inj.status !== 'تعافى'
    );
    const hasIntensive = activeInjuries.some(
      (inj) => inj.status === 'علاج مكثف' || inj.rtpStage === 'clinic' || inj.rtpStage === 'gym'
    );
    const effectiveStatus =
      medicalCard.availabilityStatus === 'unavailable' || hasIntensive
        ? 'unavailable'
        : medicalCard.availabilityStatus === 'modified' || activeInjuries.length > 0
          ? 'modified'
          : 'available';

    switch (effectiveStatus) {
      case 'unavailable':
        return {
          label: 'تحت العلاج والتأهيل',
          colorClass: 'text-rose-200 border-rose-400/30 bg-rose-500/15',
          Icon: AlertTriangle,
        };
      case 'modified':
        return {
          label: 'تدريب جزئي · متابعة',
          colorClass: 'text-amber-200 border-amber-400/30 bg-amber-500/15',
          Icon: Activity,
        };
      default:
        return {
          label: 'جاهز للمشاركة',
          colorClass: 'text-emerald-200 border-emerald-400/30 bg-emerald-500/15',
          Icon: CheckCircle2,
        };
    }
  }, [medicalCard.availabilityStatus, state.injuries, player.id]);

  const seasonHeadingLabel =
    activeSeasonFilter === 'all'
      ? `جميع المواسم (${playerSeasons.length})`
      : `موسم ${activeSeasonFilter}`;

  const qrValue = `${window.location.origin}${window.location.pathname}?playerId=${player.id}`;
  const emergencyPhone = player.emergencyPhone || (player as any).emergencyContact || '';
  const ReadinessIcon = readinessInfo.Icon;
  const DocIcon = docSummary.Icon;

  return (
    <>
      <section
        aria-label="البطاقة الرقمية الرسمية للاعب"
        className="mb-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#061229] via-[#0B1F44] to-[#081733] text-white border border-slate-700/60 shadow-xl overflow-hidden"
      >
        {/* الشريط العلوي للبطاقة - متجاوب تماماً مع شاشات الموبايل */}
        <div className="px-4 sm:px-7 py-3.5 border-b border-white/10 bg-black/25 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <ClubLogo size={30} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300 font-semibold">
                  <span className="text-white font-bold">نادي الكرامة الرياضي</span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-orange-300 font-mono tabular-nums font-bold">{seasonHeadingLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2">
            {/* محدد الموسم المتزامن مباشرة مع سجل اللاعب */}
            {onSeasonChange ? (
              <select
                aria-label="اختيار الموسم المعروض في البطاقة"
                value={activeSeasonFilter}
                onChange={(e) => onSeasonChange(e.target.value)}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-orange-200 border border-white/15 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all" className="text-slate-900 bg-white">جميع المواسم</option>
                {playerSeasons.map((s) => (
                  <option key={s} value={s} className="text-slate-900 bg-white">
                    موسم {s}
                  </option>
                ))}
              </select>
            ) : null}

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-bold whitespace-nowrap ${readinessInfo.colorClass}`}
            >
              <ReadinessIcon size={13} className="shrink-0" />
              <span>{readinessInfo.label}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsBackView((prev) => !prev)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="التبديل بين الوجه الأمامي وبيانات الطوارئ والهوية"
            >
              <RotateCw size={13} className="shrink-0" />
              <span>{isBackView ? 'الواجهة الرياضية' : 'الهوية والطوارئ'}</span>
            </button>
          </div>
        </div>

        {/* محتوى البطاقة */}
        {!isBackView ? (
          <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">
            {/* الجزء الرئيسي: الصورة + الهوية + رقم القميص + QR */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-right">
                {/* صورة اللاعب */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-orange-400/70 bg-slate-900 shadow-lg flex items-center justify-center">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={player.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-950 flex items-center justify-center text-3xl sm:text-4xl font-black text-orange-400">
                        {player.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {player.number !== undefined && player.number !== null && String(player.number).trim() !== '' && (
                    <div
                      className="absolute -bottom-2 -left-2 px-2.5 py-0.5 sm:py-1 rounded-xl bg-orange-500 text-white font-mono tabular-nums font-black text-xs sm:text-sm shadow-md border-2 border-[#081733]"
                      title="رقم القميص"
                    >
                      #{player.number}
                    </div>
                  )}
                </div>

                {/* تفاصيل الهوية الرياضية */}
                <div className="space-y-2 min-w-0 w-full">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-300 font-semibold">
                    <span className="text-orange-300 font-bold">فئة {player.category}</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span>{player.position || 'المركز غير محدد'}</span>
                  </div>

                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-snug break-words">
                    {player.name}
                  </h2>

                  {/* صف المواصفات المدمج */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3.5 gap-y-1.5 text-xs text-slate-300 font-medium pt-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Footprints size={14} className="text-orange-400 shrink-0" />
                      <span>القدم: <strong className="text-white">{player.preferredFoot || 'غير محدد'}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Droplet size={14} className="text-rose-400 shrink-0" />
                      <span>الدم: <strong className="text-white font-mono tabular-nums">{player.bloodType || '---'}</strong></span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} className="text-sky-400 shrink-0" />
                      <span>الانضمام: <strong className="text-white font-mono tabular-nums">{player.joinDate || '---'}</strong></span>
                    </span>
                  </div>

                  {/* مؤشر الجواز والوثائق */}
                  <div className="pt-0.5 flex justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={onOpenDocuments}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold hover:underline ${docSummary.tone}`}
                    >
                      <DocIcon size={14} className="shrink-0" />
                      <span>{docSummary.label}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* صندوق الرمز الرقمي والأرقام الرسمية - متجاوب للموبايل */}
              <div className="flex items-center justify-between lg:justify-end gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-r border-white/10 lg:pr-6 shrink-0 w-full lg:w-auto bg-white/[0.03] lg:bg-transparent p-3.5 lg:p-0 rounded-2xl lg:rounded-none">
                <div className="text-right space-y-2 text-xs min-w-0">
                  <div>
                    <span className="text-slate-400 block text-[11px]">الرقم الاتحادي</span>
                    <span className="font-mono tabular-nums font-bold text-white break-all">
                      {player.federalNumber || 'غير مسجل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الرقم الدولي ID</span>
                    <span className="font-mono tabular-nums font-bold text-orange-300 break-all">
                      {player.internationalId || player.id.substring(0, 8)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="group bg-white p-2 rounded-2xl shadow-md hover:scale-105 transition-transform shrink-0 flex flex-col items-center gap-1"
                  title="اضغط لتكبير رمز التحقق الرقمي"
                >
                  <QRCodeSVG value={qrValue} size={64} level="M" />
                  <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <QrCode size={10} /> تكبير الرمز
                  </span>
                </button>
              </div>
            </div>

            {/* شريط المؤشرات الأربعة للموسم - مصمم ليتناسب مع شاشة الموبايل 2×2 بدون أي تزاحم */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-300 font-semibold block truncate">الطول والوزن</span>
                  <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums block mt-0.5">
                    {player.height ? `${player.height} سم` : '--'}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono tabular-nums block">
                    {player.weight ? `${player.weight} كغ` : '-- كغ'}
                  </span>
                </div>
                <Ruler size={16} className="text-sky-400 shrink-0 mt-0.5" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-300 font-semibold block truncate">نسبة الالتزام</span>
                  <span className="text-sm sm:text-base font-black text-emerald-300 font-mono tabular-nums block mt-0.5">
                    {quickStats.hasAttendance ? `%${quickStats.attendanceRate}` : '--'}
                  </span>
                  <span className="text-[11px] text-slate-300 block truncate">
                    {quickStats.hasAttendance ? 'من التمارين' : 'لا توجد سجلات'}
                  </span>
                </div>
                <UserCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-300 font-semibold block truncate">
                    {activeSeasonFilter === 'all' ? 'إجمالي المشاركات' : 'مشاركات الموسم'}
                  </span>
                  <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums block mt-0.5">
                    {quickStats.appearances} مباراة
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono tabular-nums block">
                    {quickStats.totalMins} دقيقة لعب
                  </span>
                </div>
                <Trophy size={16} className="text-orange-400 shrink-0 mt-0.5" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-300 font-semibold block truncate">الأهداف والصناعة</span>
                  <span className="text-sm sm:text-base font-black text-orange-300 font-mono tabular-nums block mt-0.5">
                    {quickStats.goals} أهداف
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono tabular-nums block">
                    {quickStats.assists} تمريرة حاسمة
                  </span>
                </div>
                <Award size={16} className="text-amber-400 shrink-0 mt-0.5" />
              </div>
            </div>
          </div>
        ) : (
          /* الوجه الخلفي: بطاقة الهوية والطوارئ والمقاسات */
          <div className="p-4 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">بطاقة الهوية المدنية وبيانات الطوارئ</h3>
                <p className="text-xs text-slate-300 mt-0.5">كافة بيانات التعريف الرسمية والمقاسات المعتمدة في ملف اللاعب</p>
              </div>
              <span className="text-xs font-mono tabular-nums text-orange-300 font-bold">
                {playerSeasons.map((s) => `موسم ${s}`).join(' · ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 block">الرقم الوطني</span>
                <span className="text-sm font-black text-white font-mono tabular-nums break-all">{player.nationalId || '---'}</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 block">الرقم الاتحادي والدولي</span>
                <span className="text-sm font-black text-white font-mono tabular-nums break-all">
                  {player.federalNumber || '---'} / {player.internationalId || '---'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <PhoneCall size={12} className="text-rose-400" /> هاتف الطوارئ
                </span>
                <span className="text-sm font-black text-rose-200 font-mono tabular-nums block text-right" dir="ltr">
                  {emergencyPhone || 'غير مسجل'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Shirt size={12} className="text-orange-400" /> مقاسات التجهيزات
                </span>
                <span className="text-sm font-black text-white font-mono tabular-nums">
                  حذاء: {player.shoeSize || '--'} · طقم: {player.clothesSize || '--'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1 sm:col-span-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <MapPin size={12} className="text-sky-400" /> العنوان والهاتف الشخصي
                </span>
                <span className="text-sm font-bold text-white break-words">
                  {player.address || 'غير محدد'} {player.phone ? `· ${player.phone}` : ''}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1 sm:col-span-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" /> جواز السفر والصلاحية
                </span>
                <span className="text-sm font-bold text-white font-mono tabular-nums break-words">
                  جواز: {player.passportNumber || 'غير مسجل'} {player.passportExpiryDate ? `(ينتهي ${player.passportExpiryDate})` : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* شريط الإجراءات السفلي - أزرار مريحة وموزعة بنظام على الموبايل */}
        <div className="px-4 sm:px-7 py-3.5 bg-black/25 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <p className="text-xs text-slate-300 font-medium">
            يتم تحديث الإحصائيات والجاهزية الطبية تلقائياً فور اعتمادها من الجهاز الفني والطبي.
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {onEditProfile && (
              <button
                type="button"
                onClick={onEditProfile}
                className="col-span-2 sm:col-span-1 min-h-[42px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm"
              >
                <Edit size={15} />
                <span>تعديل بياناتي</span>
              </button>
            )}
            {onOpenDocuments && (
              <button
                type="button"
                onClick={onOpenDocuments}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <CreditCard size={15} />
                <span>الوثائق والجواز</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Printer size={15} />
                <span>طباعة البطاقة</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* نافذة تكبير رمز QR للمسح السريع */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsQrModalOpen(false)}
          dir="rtl"
        >
          <div
            className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClubLogo size={28} />
                <span className="font-black text-sm text-blue-950">البطاقة الرقمية للاعب</span>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex justify-center">
              <QRCodeSVG value={qrValue} size={200} level="H" />
            </div>

            <div>
              <h4 className="font-black text-lg text-blue-950">{player.name}</h4>
              <p className="text-xs text-slate-600 font-bold mt-1">
                فئة {player.category} · {player.position || 'لاعب'} {player.number ? `· #${player.number}` : ''}
              </p>
              <p className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
                {player.nationalId || player.id}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProPlayerPassCard;
