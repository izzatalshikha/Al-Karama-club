import React, { useState, useMemo, useRef } from 'react';
import { AppState, Match, TrainingSession, TournamentMatch } from '../types';
import { 
  ChevronRight, ChevronLeft, Calendar as CalendarIcon, MapPin, 
  Clock, Trophy, RotateCcw, ArrowRight, ArrowLeft
} from 'lucide-react';

interface SeasonCalendarProps {
  state: AppState;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
}

export interface CalendarMatchItem {
  id: string;
  source: 'regular' | 'tournament';
  linkedId?: string;
  category: string;
  ourTeamName: string;
  opponentName: string;
  competitionName: string;
  time: string;
  date: string;
  pitch?: string;
  isCompleted: boolean;
  scoreText?: string;
  ourScore?: number | string;
  opponentScore?: number | string;
  resultType?: 'win' | 'draw' | 'loss' | 'pending';
  notes?: string;
}

export interface CalendarSessionItem {
  id: string;
  category: string;
  date: string;
  normDate: string;
  time: string;
  pitch?: string;
  objective: string;
  duration?: string;
  isCompleted?: boolean;
  notes?: string;
}

export const normalizeDateStr = (raw: string | undefined | null): string => {
  if (!raw) return '';
  const str = String(raw).trim();
  // Handle DD/MM/YYYY or D/M/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  // Handle YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return str;
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export const SeasonCalendar: React.FC<SeasonCalendarProps> = ({ state, onMatchClick, onSessionClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const monthNames = [
    'كانون الثاني (يناير)', 'شباط (فبراير)', 'آذار (مارس)', 'نيسان (أبريل)', 'أيار (مايو)', 'حزيران (يونيو)',
    'تموز (يوليو)', 'آب (أغسطس)', 'أيلول (سبتمبر)', 'تشرين الأول (أكتوبر)', 'تشرين الثاني (نوفمبر)', 'كانون الأول (ديسمبر)'
  ];

  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const restrictedCat = state.currentUser?.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : [];
  const globalFilter = state.globalCategoryFilter;

  // 1. تجميع وتجهيز جميع مباريات فرق نادي الكرامة (العادية + مباريات البطولات)
  const monthMatches = useMemo(() => {
    const items: CalendarMatchItem[] = [];
    const regularIdsIncluded = new Set<string>();

    // المباريات العادية المسجلة
    (state.matches || []).forEach(m => {
      const normDate = normalizeDateStr(m.date);
      if (!normDate) return;
      const parts = normDate.split('-');
      if (parts.length !== 3) return;
      const mYear = parseInt(parts[0], 10);
      const mMonth = parseInt(parts[1], 10) - 1;

      if (mYear !== year || mMonth !== month) return;
      if (restrictedCat && !allowedCategories.includes(m.category)) return;
      if (globalFilter !== 'الكل' && m.category !== globalFilter) return;

      const isDone = Boolean(m.isCompleted) || (m.ourScore !== '' && m.ourScore !== undefined && m.opponentScore !== '' && m.opponentScore !== undefined);
      let resType: 'win' | 'draw' | 'loss' | 'pending' = 'pending';
      let scoreText = '';

      if (isDone) {
        const our = Number(m.ourScore || 0);
        const opp = Number(m.opponentScore || 0);
        scoreText = `${m.ourScore} - ${m.opponentScore}`;
        if (our > opp) resType = 'win';
        else if (our === opp) resType = 'draw';
        else resType = 'loss';
      }

      regularIdsIncluded.add(m.id);
      items.push({
        id: m.id,
        source: 'regular',
        linkedId: m.id,
        category: m.category,
        ourTeamName: `الكرامة (${m.category})`,
        opponentName: m.opponent || 'الخصم',
        competitionName: m.matchType || 'مباراة ودية',
        time: m.time || '15:00',
        date: normDate,
        pitch: m.pitch,
        isCompleted: isDone,
        scoreText,
        ourScore: m.ourScore,
        opponentScore: m.opponentScore,
        resultType: resType,
        notes: m.notes
      });
    });

    // مباريات البطولات لفرق نادينا فقط (الشباب، الناشئين، الرجال، إلخ)
    (state.tournamentMatches || []).forEach(tm => {
      if (tm.linkedMatchId && regularIdsIncluded.has(tm.linkedMatchId)) {
        return;
      }

      const normDate = normalizeDateStr(tm.matchDate);
      if (!normDate) return;
      const parts = normDate.split('-');
      if (parts.length !== 3) return;
      const mYear = parseInt(parts[0], 10);
      const mMonth = parseInt(parts[1], 10) - 1;

      if (mYear !== year || mMonth !== month) return;

      const tour = (state.tournaments || []).find(t => t.id === tm.tournamentId);
      const tourCat = tour?.category || '';

      if (restrictedCat && tourCat && !allowedCategories.includes(tourCat)) return;
      if (globalFilter !== 'الكل' && tourCat && tourCat !== globalFilter) return;

      const t1 = (state.tournamentTeams || []).find(t => t.id === tm.team1Id);
      const t2 = (state.tournamentTeams || []).find(t => t.id === tm.team2Id);

      const isOur1 = Boolean(t1?.isOurTeam || t1?.name?.includes('الكرامة') || (tourCat && t1?.name?.trim() === tourCat));
      const isOur2 = Boolean(t2?.isOurTeam || t2?.name?.includes('الكرامة') || (tourCat && t2?.name?.trim() === tourCat));

      // استبعاد صارم لأي مباراة في الدوري لا تشارك فيها فرق نادي الكرامة
      if (!isOur1 && !isOur2) {
        return;
      }

      let ourName = '';
      let oppName = '';
      let ourScore: number | null | undefined = null;
      let oppScore: number | null | undefined = null;

      if (isOur1) {
        ourName = t1?.name || (tourCat ? `الكرامة (${tourCat})` : 'الكرامة');
        oppName = t2?.name || 'الخصم';
        ourScore = tm.team1Score;
        oppScore = tm.team2Score;
      } else {
        ourName = t2?.name || (tourCat ? `الكرامة (${tourCat})` : 'الكرامة');
        oppName = t1?.name || 'الخصم';
        ourScore = tm.team2Score;
        oppScore = tm.team1Score;
      }

      const hasScore = (ourScore !== null && ourScore !== undefined && oppScore !== null && oppScore !== undefined);
      const isDone = tm.status === 'ملعوبة' || hasScore;
      let resType: 'win' | 'draw' | 'loss' | 'pending' = 'pending';
      let scoreText = '';

      if (isDone && hasScore) {
        scoreText = `${ourScore} - ${oppScore}`;
        if (ourScore! > oppScore!) resType = 'win';
        else if (ourScore! === oppScore!) resType = 'draw';
        else resType = 'loss';
      }

      items.push({
        id: tm.id,
        source: 'tournament',
        linkedId: tm.linkedMatchId || tm.id,
        category: tourCat || ourName,
        ourTeamName: ourName,
        opponentName: oppName,
        competitionName: tour?.name ? `بطولة: ${tour.name}` : 'مباراة بطولة رسمية',
        time: tm.matchTime || '15:00',
        date: normDate,
        pitch: tm.pitch,
        isCompleted: isDone,
        scoreText,
        ourScore: ourScore !== null ? ourScore : undefined,
        opponentScore: oppScore !== null ? oppScore : undefined,
        resultType: resType,
        notes: tm.notes
      });
    });

    return items;
  }, [state.matches, state.tournamentMatches, state.tournamentTeams, state.tournaments, year, month, restrictedCat, allowedCategories, globalFilter]);

  // 2. الحصص التدريبية لفرق النادي
  const monthSessions: CalendarSessionItem[] = useMemo(() => {
    return (state.sessions || []).filter(s => {
      const normDate = normalizeDateStr(s.date);
      if (!normDate) return false;
      const parts = normDate.split('-');
      if (parts.length !== 3) return false;
      const sYear = parseInt(parts[0], 10);
      const sMonth = parseInt(parts[1], 10) - 1;

      return sYear === year && sMonth === month &&
             (!restrictedCat || allowedCategories.includes(s.category)) &&
             (globalFilter === 'الكل' || s.category === globalFilter);
    }).map(s => ({
      ...s,
      normDate: normalizeDateStr(s.date)
    }));
  }, [state.sessions, year, month, restrictedCat, allowedCategories, globalFilter]);

  // خلايا شبكة التقويم الشهرية الموسعة جداً (Extra-Wide Day Cards)
  const renderCells = () => {
    const cells = [];
    // خلايا الأيام الفارغة السابقة لبداية الشهر
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[220px] bg-slate-50/40 border border-slate-100 rounded-2xl hidden lg:block" />
      );
    }

    // أيام الشهر الحالي
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayMatches = monthMatches.filter(m => m.date === dateStr);
      const daySessions = monthSessions.filter(s => s.normDate === dateStr);
      
      const isToday = todayStr === dateStr;
      const totalActivities = dayMatches.length + daySessions.length;

      cells.push(
        <div 
          key={day} 
          className={`min-h-[230px] p-3 sm:p-3.5 border-2 rounded-2xl flex flex-col gap-2.5 transition-all ${
            isToday 
              ? 'bg-orange-50/50 border-orange-400 ring-2 ring-orange-500/20 shadow-sm' 
              : totalActivities > 0
                ? 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
                : 'bg-white/90 border-slate-100 hover:border-slate-300'
          }`}
        >
          {/* رأس بطاقة اليوم: رقم اليوم وعداد الأنشطة وتاريخه */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-colors font-mono ${
                isToday 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-slate-800 bg-slate-100'
              }`}>
                {day}
              </span>
              {isToday && (
                <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                  اليوم
                </span>
              )}
            </div>

            {totalActivities > 0 ? (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                isToday ? 'bg-orange-100 text-orange-900 border border-orange-200' : 'bg-blue-50 text-blue-900 border border-blue-100'
              }`}>
                {totalActivities} {totalActivities === 1 ? 'فعالية' : 'فعاليات'}
              </span>
            ) : (
              <span className="text-[10px] text-slate-300 font-bold">-</span>
            )}
          </div>
          
          {/* محتوى أنشطة اليوم: بطاقات عريضة وفسيحة تشمل كافة تفاصيل المباراة والتدريب دون أي اختصار */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[350px] custom-scrollbar flex-1 pr-0.5">
            {/* بطاقات المباريات داخل اليوم */}
            {dayMatches.map(m => {
              const isWin = m.resultType === 'win';
              const isDraw = m.resultType === 'draw';
              const isLoss = m.resultType === 'loss';

              return (
                <div 
                  key={m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatchClick(m.linkedId || m.id);
                  }}
                  className={`text-right w-full p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col gap-2 ${
                    m.isCompleted
                      ? (isWin 
                          ? 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-500 text-emerald-950' 
                          : isDraw 
                            ? 'bg-amber-50/90 border-amber-300 hover:border-amber-500 text-amber-950' 
                            : 'bg-rose-50/90 border-rose-300 hover:border-rose-500 text-rose-950')
                      : 'bg-orange-50/90 border-orange-200 hover:border-orange-400 text-orange-950'
                  }`}
                  title="اضغط لعرض تفاصيل المباراة والإحصائيات"
                >
                  {/* رأس بطاقة المباراة: المسابقة ونوع المباراة */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-black border-b border-black/5 pb-1.5">
                    <span className="flex items-center gap-1.5 text-slate-700 truncate">
                      <Trophy size={13} className={m.isCompleted ? 'text-blue-600 shrink-0' : 'text-orange-600 shrink-0'} />
                      <span className="truncate">{m.competitionName}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap shrink-0 ${
                      m.isCompleted ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'
                    }`}>
                      {m.isCompleted ? 'ملعوبة ✓' : 'قادمة'}
                    </span>
                  </div>

                  {/* صلب المباراة العريض: طرفا اللقاء بوضوح + لوحة النتيجة المعتمدة في المنتصف */}
                  <div className="flex items-center justify-between gap-2 bg-white/95 p-2 rounded-xl border border-black/5 shadow-xs">
                    {/* الطرف الأيمن: فريقنا */}
                    <div className="text-right flex-1 min-w-0">
                      <span className="text-[9px] font-black text-blue-600 uppercase block">فريقنا</span>
                      <h5 className="text-[11px] font-black text-blue-950 truncate">
                        {m.ourTeamName}
                      </h5>
                    </div>

                    {/* المنتصف: النتيجة الرقمية العريضة أو التوقيت */}
                    <div className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-[70px]">
                      {m.isCompleted && m.scoreText ? (
                        <div className="flex flex-col items-center">
                          <span className={`font-mono text-sm font-black tracking-wider ${
                            isWin ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-800'
                          }`}>
                            {m.scoreText}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full mt-0.5 ${
                            isWin ? 'bg-emerald-100 text-emerald-800' : isLoss ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isWin ? 'فوز للكرامة' : isDraw ? 'تعادل' : 'خسارة'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-[10px] font-black text-orange-700">
                            {m.time}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500">
                            مرتقبة
                          </span>
                        </div>
                      )}
                    </div>

                    {/* الطرف الأيسر: الخصم */}
                    <div className="text-left flex-1 min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">الخصم</span>
                      <h5 className="text-[11px] font-black text-slate-800 truncate">
                        {m.opponentName}
                      </h5>
                    </div>
                  </div>

                  {/* شريط التفاصيل الإضافية: التوقيت والملعب بالكامل */}
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-bold pt-1 gap-1">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Clock size={11} className="text-slate-400" />
                      {m.time}
                    </span>
                    {m.pitch && (
                      <span className="flex items-center gap-1 text-slate-700 truncate max-w-[170px]" title={m.pitch}>
                        <MapPin size={11} className="text-orange-500 shrink-0" />
                        <span className="truncate">{m.pitch.replace(/\[.*?\]/g, '').trim()}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* بطاقات التمارين داخل اليوم */}
            {daySessions.map(s => {
              const isDone = Boolean(s.isCompleted);
              return (
                <div 
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionClick(s.id);
                  }}
                  className={`text-right w-full p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col gap-2 ${
                    isDone 
                      ? 'bg-teal-50/90 border-teal-200 hover:border-teal-400 text-teal-950' 
                      : 'bg-blue-50/70 border-blue-200 hover:border-blue-400 text-blue-950'
                  }`}
                  title="اضغط لعرض تحضير التمرين والحضور"
                >
                  <div className="flex items-center justify-between gap-1 border-b border-black/5 pb-1.5">
                    <span className="text-[11px] font-black truncate flex items-center gap-1.5 text-slate-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
                      تمرين فئة {s.category}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                      isDone ? 'bg-teal-700 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {isDone ? 'مكتمل ✓' : 'مجدول'}
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-slate-800 leading-relaxed bg-white/95 p-2 rounded-xl border border-black/5 shadow-xs">
                    {s.objective || 'تمرين فني وبدني متكامل'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-bold pt-1 gap-1">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Clock size={11} className="text-teal-600" />
                      {s.time} ({s.duration || '90 دقيقة'})
                    </span>
                    {s.pitch && (
                      <span className="flex items-center gap-1 text-slate-700 truncate max-w-[170px]" title={s.pitch}>
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.pitch}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
      {/* هيدر التقويم الموحد وأدوات التنقل والمحاذاة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-900 flex items-center justify-center font-bold">
            <CalendarIcon className="text-orange-500" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-blue-950">تقويم وأجندة النادي الرسمية</h3>
              <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                مباريات وتمارين نادي الكرامة
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500">
              بطاقات مباريات وتمارين عريضة ومفصلة توضح الفريقين والنتيجة والملعب والتوقيت
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          {/* أزرار التمرير الأفقي السلس للشبكة العريضة */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              type="button"
              onClick={handleScrollRight}
              className="p-1.5 hover:bg-white rounded-xl transition-all text-slate-700 flex items-center gap-1 text-xs font-bold"
              title="تمرير لليمين"
            >
              <ArrowRight size={14} />
              <span className="hidden sm:inline">تمرير</span>
            </button>
            <span className="w-px h-4 bg-slate-300 mx-1" />
            <button 
              type="button"
              onClick={handleScrollLeft}
              className="p-1.5 hover:bg-white rounded-xl transition-all text-slate-700 flex items-center gap-1 text-xs font-bold"
              title="تمرير لليسار"
            >
              <span className="hidden sm:inline">تمرير</span>
              <ArrowLeft size={14} />
            </button>
          </div>

          <button 
            type="button"
            onClick={handleGoToday} 
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all shadow-xs"
            title="الانتقال إلى اليوم الحالي"
          >
            <RotateCcw size={13} /> اليوم
          </button>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <button 
              type="button"
              onClick={handleNextMonth} 
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-700 shadow-xs hover:border-slate-200"
              title="الشهر التالي"
            >
              <ChevronRight size={18} />
            </button>
            <div className="w-48 text-center font-black text-blue-950 text-xs sm:text-sm">
              {monthNames[month]} {year}
            </div>
            <button 
              type="button"
              onClick={handlePrevMonth} 
              className="p-2 hover:bg-white rounded-xl transition-colors text-slate-700 shadow-xs hover:border-slate-200"
              title="الشهر السابق"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* شبكة التقويم العريضة جداً (Extra-Wide Calendar Grid) التي تستوعب كامل تفاصيل المباراة والتدريب */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto custom-scrollbar pb-3 select-none"
      >
        <div className="min-w-[2000px]">
          {/* أسماء أيام الأسبوع */}
          <div className="grid grid-cols-7 gap-3 mb-3">
            {daysOfWeek.map(d => (
              <div key={d} className="text-center py-3.5 text-xs font-black text-blue-950 uppercase tracking-widest bg-slate-50 rounded-2xl border border-slate-200">
                {d}
              </div>
            ))}
          </div>
          
          {/* خلايا أيام الشهر العريضة والرحبة */}
          <div className="grid grid-cols-7 gap-3">
            {renderCells()}
          </div>
        </div>
      </div>

      {/* شريط الإرشادات ودليل الألوان */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500" /> فوز للكرامة (نتيجة معتمدة)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-500" /> تعادل</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-500" /> خسارة</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-orange-500" /> مباراة مرتقبة</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-teal-600" /> تمرين مكتمل</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-600" /> تمرين مجدول</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px]">
          <span>اسحب أفقياً أو استخدم أزرار التمرير لاستعراض كافة أيام الأسبوع بتفاصيلها الكاملة ↔️</span>
        </div>
      </div>
    </div>
  );
};

export default SeasonCalendar;
