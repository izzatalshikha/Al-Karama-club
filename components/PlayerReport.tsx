
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, Calendar, 
  TrendingUp, Activity, Trophy, 
  CheckCircle, Hash, User, Timer, StickyNote, 
  HeartPulse, ShieldAlert, Gavel, Wallet, 
  Phone, Fingerprint, Ruler, Weight, BadgeCheck, MapPin, 
  Globe, BarChart, Users, Star, AlertCircle, FileText,
  Loader2, GraduationCap, Award, Home, Info, Zap, Medal,
  Save, History, BookOpen, Briefcase, DollarSign, CalendarCheck, UserX, Clock, Map,
  CreditCard, Eye, X, Download, FileCheck, Edit2, Plus, Trash2, Upload, UserCheck, ShieldCheck,
  Shirt, Footprints, Droplet, Package, PhoneCall
} from 'lucide-react';
import { AppState, Person, Match, CoachingCertificate, PreviousExperience } from '../types';
import { supabase, generateUUID } from '../App';
import { safeSavePerson } from '../utils/supabaseSanitizer';
import ClubLogo from './ClubLogo';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import DocumentUploadCard from './DocumentUploadCard';
import { compressDocumentImage } from '../utils/imageCompressor';
import EditPersonModal from './EditPersonModal';

interface PlayerReportProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  player: Person | null;
  onBack: () => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, setState, player, onBack, addLog }) => {
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [monthlyNotes, setMonthlyNotes] = useState<{ [key: string]: string }>(player?.monthlyReports || {});
  const [previewDoc, setPreviewDoc] = useState<{ title: string; src: string } | null>(null);
  
  // Edit Person Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Person>>(player ? { ...player } : {});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);
  const [selectedSeason, setSelectedSeason] = useState<string>(state.activeSeason || '2025/2026');

  if (!player || !state.currentUser) return null;

  const playerSeasons = Array.isArray(player.seasons) && player.seasons.length > 0
    ? player.seasons
    : (player.season ? [player.season] : ['2025/2026']);

  const isSelf = Boolean(
    (state.currentUser?.relatedPersonId && state.currentUser.relatedPersonId === player.id) ||
    (state.currentUser?.username && (state.currentUser.username === player.name || player.name.includes(state.currentUser.username))) ||
    (state.currentUser?.id === player.id)
  );
  const isManager = state.currentUser.role === 'مدير';
  const isCoach = state.currentUser.role === 'مدرب' || state.currentUser.role === 'مساعد مدرب' || state.currentUser.role === 'إداري فئة';
  const canEditPerson = isManager || isSelf || (isCoach && (!state.currentUser?.restrictedCategory || String(state.currentUser.restrictedCategory).includes(player.category)));

  const handleSavePersonEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPerson) return;
    setIsSavingEdit(true);
    try {
      const cleanData: any = { ...editFormData };
      const saveRes = await safeSavePerson(cleanData, 'update', player.id);
      if (!saveRes.success) throw saveRes.error;

      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, ...cleanData } : p)
      }));

      Object.assign(player, cleanData);

      addLog?.('تم حفظ وتحديث البيانات بنجاح', 'success');
      alert('تم حفظ وتحديث بيانات ' + (player.role === 'لاعب' ? 'اللاعب' : 'الكادر') + ' بنجاح في النظام!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert('خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isViewer = state.currentUser.role === 'مشاهد' || state.currentUser.role === 'لاعب';

  const stats = useMemo(() => {
    let totalMins = 0;
    let goals = 0;
    let assists = 0;
    let yellows = 0;
    let reds = 0;
    let appearances = 0;
    const matchHistory: any[] = [];
    const groupedStats: Record<string, { matches: number; mins: number; goals: number; assists: number; yellows: number; reds: number }> = {};

    const targetSeason = selectedSeason;
    const matchSeasonFilter = (m: Match) => {
      if (targetSeason === 'all') return true;
      const mSeason = m.season || '2025/2026';
      return mSeason === targetSeason;
    };

    state.matches.filter(m => m.isCompleted && matchSeasonFilter(m)).forEach(m => {
      const starter = m.lineup.starters.find(s => s.playerId === player.id);
      const sub = m.lineup.subs.find(s => s.playerId === player.id);
      
      if (starter || sub) {
        appearances++;
        const mins = parseInt(starter?.minutesPlayed || sub?.minutesPlayed || '0');
        totalMins += mins;

        const playerGoals = m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length;
        const playerAssists = m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length;
        const playerYellows = m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length;
        const playerReds = m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length;

        goals += playerGoals;
        assists += playerAssists;
        yellows += playerYellows;
        reds += playerReds;
        
        let typeName = m.matchType || 'أخرى';
        if (m.matchType === 'مباراة بطولة' && m.notes) {
           const tourNameMatch = m.notes.match(/من بطولة: (.*?) -/);
           if (tourNameMatch && tourNameMatch[1]) {
             typeName = `بطولة ${tourNameMatch[1]}`;
           }
        }
        
        if (!groupedStats[typeName]) {
           groupedStats[typeName] = { matches: 0, mins: 0, goals: 0, assists: 0, yellows: 0, reds: 0 };
        }
        groupedStats[typeName].matches += 1;
        groupedStats[typeName].mins += mins;
        groupedStats[typeName].goals += playerGoals;
        groupedStats[typeName].assists += playerAssists;
        groupedStats[typeName].yellows += playerYellows;
        groupedStats[typeName].reds += playerReds;

        matchHistory.push({
          opponent: m.opponent,
          date: m.date,
          matchType: typeName,
          mins,
          goals: playerGoals,
          assists: playerAssists,
          cards: { y: playerYellows, r: playerReds },
          score: `${m.ourScore}-${m.opponentScore}`,
          season: m.season || '2025/2026'
        });
      }
    });

    return { totalMins, goals, assists, yellows, reds, appearances, matchHistory, groupedStats };
  }, [state.matches, player, selectedSeason]);

  const attendanceStats = useMemo(() => {
    const targetSeason = selectedSeason;
    const catSessions = state.sessions.filter(s => {
      if (s.category !== player.category || !s.isCompleted) return false;
      if (targetSeason === 'all') return true;
      const sSeason = s.season || '2025/2026';
      return sSeason === targetSeason;
    });
    const records = state.attendance.filter(a => a.personId === player.id);
    
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const absent = records.filter(r => r.status === 'غائب').length;
    const excused = records.filter(r => r.status === 'غياب بعذر').length;
    
    const effectiveTotal = Math.max(0, catSessions.length - excused);
    const score = effectiveTotal > 0 ? ((present + (late * 0.5)) / effectiveTotal) * 100 : 0;
    const rate = Math.min(100, Math.round(score));

    const commitmentIndex = rate >= 90 ? 'ممتاز' : rate >= 75 ? 'جيد جداً' : rate >= 50 ? 'متوسط' : 'ضعيف';

    // Calculate monthly trend
    const monthlyGroups: Record<string, { total: number, score: number }> = {};
    catSessions.forEach(session => {
        const month = session.date.substring(0, 7); // YYYY-MM
        if (!monthlyGroups[month]) monthlyGroups[month] = { total: 0, score: 0 };
        
        const record = records.find(r => r.sessionId === session.id);
        const st = record?.status;
        if (st !== 'غياب بعذر') {
            monthlyGroups[month].total += 1;
            if (st === 'حاضر') monthlyGroups[month].score += 1;
            if (st === 'متأخر') monthlyGroups[month].score += 0.5;
        }
    });

    const monthlyTrend = Object.keys(monthlyGroups).sort().map(month => {
        const d = monthlyGroups[month];
        const mRate = d.total > 0 ? Math.round((d.score / d.total) * 100) : 0;
        return {
            name: month,
            rate: mRate
        };
    });

    return { rate, present, late, absent, excused, total: catSessions.length, commitmentIndex, monthlyTrend };
  }, [state.sessions, state.attendance, player]);

  const handleSaveMonthlyReport = async () => {
    setIsSavingReport(true);
    try {
      const updatedReports = { ...monthlyNotes };
      const { error } = await supabase.from('people').update({ monthlyReports: updatedReports }).eq('id', player.id);
      if (error) throw error;
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, monthlyReports: updatedReports } : p)
      }));
      addLog?.(`تم حفظ تقرير شهر ${selectedMonth} بنجاح`, 'success');
    } catch (err: any) { alert(err.message); } finally { setIsSavingReport(false); }
  };

  const InfoBlock = ({ icon: Icon, label, value, color = "text-blue-950" }: any) => (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-1 hover:bg-slate-100 transition-all group">
      <div className="flex items-center gap-2 text-slate-500 group-hover:text-orange-600">
        <Icon size={14} />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xs font-black ${color} truncate`}>{value || '---'}</span>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color = "text-orange-500" }: any) => (
    <h3 className={`text-xs font-black ${color} border-r-4 border-current pr-3 mb-6 flex items-center gap-2 uppercase tracking-widest`}>
      <Icon size={16}/> {title}
    </h3>
  );

  const sortedSavedReports = useMemo(() => {
    return months
      .map(m => ({ month: m, content: monthlyNotes[m] }))
      .filter(r => r.content && r.content.trim().length > 0);
  }, [monthlyNotes, months]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 print:pb-0 px-2 md:px-0" dir="rtl">
      {/* Print-only Header */}
      <div className="hidden print:flex flex-col items-center justify-center text-center space-y-2 mb-8 border-b-4 border-slate-900 pb-6 w-full">
         <img src="https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg" alt="Logo" className="w-24 h-24 rounded-full object-contain mb-2 border-2 border-slate-200" />
         <h1 className="text-3xl font-black text-slate-900">نادي الكرامة الرياضي</h1>
         <h2 className="text-xl font-bold text-slate-700">مكتب كرة القدم</h2>
         <div className="mt-2 text-xl font-black bg-slate-900 text-white px-6 py-2 rounded-full inline-block tracking-widest">
            تقرير عن {player.role === 'لاعب' ? 'لاعب' : 'عضو كادر'} - {player.name}
         </div>
      </div>

      {/* هيدر الملف الفني */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-900 shadow-xl gap-4 md:gap-6 print:hidden">
        <button onClick={onBack} className="w-full md:w-auto bg-white/5 hover:bg-orange-500 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2">
          <ChevronRight size={18} /> العودة
        </button>
        <div className="flex items-center gap-3 md:gap-4 text-center md:text-right">
           <ClubLogo size={40} className="md:w-[60px] md:h-[60px]" />
           <div>
              <h1 className="text-xl md:text-2xl font-black text-white bg-gradient-to-l from-orange-500 to-white bg-clip-text text-transparent leading-none">سجل العضو الرقمي</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">EAGLE OS PERFORMANCE PASSPORT</p>
           </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {canEditPerson && (
            <button
              type="button"
              onClick={() => {
                setEditFormData({ ...player });
                setIsEditModalOpen(true);
              }}
              className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 whitespace-nowrap"
            >
              <Edit2 size={16} /> تعديل البيانات
            </button>
          )}
          <button onClick={() => window.print()} className="flex-1 md:flex-none bg-white text-slate-950 px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-orange-600 hover:text-white transition-all whitespace-nowrap">
            <Printer size={16} /> طباعة السجل
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
         
         {/* العمود الأيمن: الهوية والالتزام */}
         <div className="lg:col-span-4 space-y-6">
            {/* بطاقة البروفايل */}
            <div className="modern-card p-6 md:p-8 text-center border-b-8 border-orange-500 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
               <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-800 rounded-full mx-auto flex items-center justify-center font-black text-5xl md:text-6xl text-white mb-6 border-8 border-white/5 shadow-2xl relative">
                  {player.name.charAt(0)}
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 md:w-14 md:h-14 bg-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl border-4 border-[#0f172a] shadow-xl">#{player.number || '0'}</div>
               </div>
               <h2 className="text-2xl md:text-3xl font-black text-blue-950 tracking-tighter leading-tight">{player.name}</h2>
               <p className="text-orange-500 font-black mt-3 tracking-widest uppercase bg-orange-500/10 inline-block px-4 py-1 rounded-full text-[10px]">
                 {player.role} • {player.category}
               </p>
               
               {/* QR Code Section */}
               <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center justify-center print:hidden">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">امسح الكود لفتح ملف {player.role}</p>
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                     <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?playerId=${player.id}`} size={120} level="H" includeMargin={false} fgColor="#0f172a" />
                  </div>
               </div>
            </div>

            {/* تحليل الالتزام */}
            <div className="modern-card p-5 md:p-6 space-y-4">
               <SectionTitle icon={TrendingUp} title="تحليل الانضباط" color="text-emerald-500" />
               <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl">
                     <span className="text-[9px] md:text-[10px] font-black text-slate-500">مؤشر الالتزام</span>
                     <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-lg font-black text-[9px] md:text-[10px] ${attendanceStats.rate > 80 ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                        {attendanceStats.commitmentIndex} (%{attendanceStats.rate})
                     </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                        <CheckCircle size={14} className="text-emerald-600 mx-auto mb-1"/>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase">حاضر</p>
                        <p className="text-base md:text-lg font-black text-blue-950">{attendanceStats.present}</p>
                     </div>
                     <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                        <Clock size={14} className="text-amber-600 mx-auto mb-1"/>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase">متأخر</p>
                        <p className="text-base md:text-lg font-black text-blue-950">{attendanceStats.late}</p>
                     </div>
                  </div>
                  {attendanceStats.monthlyTrend.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-500 mb-3 text-center">منحنى الالتزام الشهري</h4>
                        <div className="h-32 w-full" dir="ltr">
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={attendanceStats.monthlyTrend}>
                                 <XAxis dataKey="name" tick={{fontSize: 8}} tickLine={false} axisLine={false} />
                                 <YAxis hide domain={[0, 100]} />
                                 <RechartsTooltip contentStyle={{fontSize: '10px', borderRadius: '8px'}} formatter={(value) => [`${value}%`]} labelStyle={{color: '#0f172a'}} />
                                 <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{r: 3, fill: '#10b981'}} />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* البيانات الشخصية (الهوية) */}
            <div className="modern-card p-5 md:p-6 space-y-4">
               <SectionTitle icon={Fingerprint} title="الهوية والبيانات" />
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                  <InfoBlock icon={User} label="الاسم الكامل" value={player.name} />
                  <InfoBlock icon={User} label="اسم الأب" value={player.fatherName} />
                  <InfoBlock icon={User} label="اسم الأم" value={player.motherName} />
                  <InfoBlock icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
                  <InfoBlock icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
                  <InfoBlock icon={Home} label="الخانة (القيد)" value={player.khana} />
                  <InfoBlock icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
                  <InfoBlock icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
                  <InfoBlock icon={Globe} label="الرقم الدولي ID" value={player.internationalId} />
                  <InfoBlock icon={Phone} label="رقم الهاتف" value={player.phone} color="text-blue-600" />
                  {player.emergencyPhone && (
                    <InfoBlock icon={PhoneCall} label="هاتف الطوارئ / ولي الأمر" value={player.emergencyPhone} color="text-rose-600" />
                  )}
                  <InfoBlock icon={Map} label="عنوان السكن" value={player.address} />
                  {player.registrationDate && (
                    <InfoBlock icon={CalendarCheck} label="تاريخ التسجيل الرسمي" value={player.registrationDate} color="text-emerald-700" />
                  )}
               </div>
            </div>

            {/* بطاقة جواز السفر والوثائق الثبوتية */}
            <div className="modern-card p-5 md:p-6 space-y-4">
               <SectionTitle icon={CreditCard} title="جواز السفر والوثائق الرسمية" color="text-blue-600" />
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                  <InfoBlock icon={CreditCard} label="رقم جواز السفر" value={player.passportNumber} color="text-blue-700" />
                  <InfoBlock icon={Calendar} label="تاريخ إصدار الجواز" value={player.passportIssueDate} />
                  <InfoBlock icon={Calendar} label="تاريخ انتهاء الجواز" value={player.passportExpiryDate} />
               </div>

               {/* حالة الجواز */}
               {player.passportExpiryDate && (
                 <div className="pt-2">
                   {(() => {
                     const expiry = new Date(player.passportExpiryDate);
                     const now = new Date();
                     const diffMonths = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
                     if (expiry < now) {
                       return (
                         <div className="bg-red-50 text-red-700 border border-red-200 p-2.5 rounded-xl text-center text-xs font-black">
                           ⚠️ جواز السفر منتهي الصلاحية
                         </div>
                       );
                     }
                     if (diffMonths <= 6) {
                       return (
                         <div className="bg-amber-50 text-amber-700 border border-amber-200 p-2.5 rounded-xl text-center text-xs font-black">
                           ⏳ الجواز ينتهي خلال أقل من 6 أشهر
                         </div>
                       );
                     }
                     return (
                       <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-2.5 rounded-xl text-center text-xs font-black">
                         ✓ جواز السفر ساري المفعول
                       </div>
                     );
                   })()}
                 </div>
               )}

               {/* معاينة صور الوثائق */}
               <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المستندات الثبوتية المرفوعة</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                     {player.idCardImage ? (
                       <button
                         type="button"
                         onClick={() => setPreviewDoc({ title: 'صورة الهوية (الوجه الأول)', src: player.idCardImage! })}
                         className="group p-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center"
                       >
                         <div className="w-full h-20 bg-slate-200 rounded-lg overflow-hidden mb-1.5 flex items-center justify-center">
                            <img src={player.idCardImage} alt="الهوية (الوجه 1)" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                         </div>
                         <span className="text-[10px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1">
                           <Eye size={12} /> الهوية (وجه 1)
                         </span>
                       </button>
                     ) : (
                       <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[10px] font-bold text-slate-400 flex flex-col items-center justify-center h-28">
                         لا توجد صورة وجه 1
                       </div>
                     )}

                     {player.idCardBackImage ? (
                       <button
                         type="button"
                         onClick={() => setPreviewDoc({ title: 'صورة الهوية (الوجه الثاني)', src: player.idCardBackImage! })}
                         className="group p-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center"
                       >
                         <div className="w-full h-20 bg-slate-200 rounded-lg overflow-hidden mb-1.5 flex items-center justify-center">
                            <img src={player.idCardBackImage} alt="الهوية (الوجه 2)" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                         </div>
                         <span className="text-[10px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1">
                           <Eye size={12} /> الهوية (وجه 2)
                         </span>
                       </button>
                     ) : (
                       <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[10px] font-bold text-slate-400 flex flex-col items-center justify-center h-28">
                         لا توجد صورة وجه 2
                       </div>
                     )}

                     {player.passportImage ? (
                       <button
                         type="button"
                         onClick={() => setPreviewDoc({ title: 'صورة جواز السفر', src: player.passportImage! })}
                         className="group p-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center col-span-2 sm:col-span-1 lg:col-span-2"
                       >
                         <div className="w-full h-20 bg-slate-200 rounded-lg overflow-hidden mb-1.5 flex items-center justify-center">
                            <img src={player.passportImage} alt="جواز السفر" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                         </div>
                         <span className="text-[10px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1">
                           <Eye size={12} /> صورة الجواز
                         </span>
                       </button>
                     ) : (
                       <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[10px] font-bold text-slate-400 flex flex-col items-center justify-center h-28 col-span-2 sm:col-span-1 lg:col-span-2">
                         لا توجد صورة جواز
                       </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* العمود الأيسر: الإحصائيات الفنية */}
         <div className="lg:col-span-8 space-y-6 md:space-y-8">
            
            {/* شريط المواسم الرياضية في النادي وسجل المواسم */}
            <div className="modern-card p-5 md:p-6 border-r-8 border-orange-500 bg-gradient-to-l from-orange-50/50 via-white to-white shadow-sm space-y-4">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5">
                     <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <Calendar size={20} />
                     </div>
                     <div>
                        <h3 className="text-sm md:text-base font-black text-blue-950">
                           المواسم الرياضية في النادي ({playerSeasons.length} مواسم مسجلة)
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold">
                           استعرض إحصائيات وأداء {player.role === 'لاعب' ? 'اللاعب' : 'الكادر'} حسب كل موسم
                        </p>
                     </div>
                  </div>

                  {/* محدد الموسم للإحصائيات */}
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                     <span className="text-[10px] font-black text-slate-500 px-2 whitespace-nowrap">عرض إحصائيات:</span>
                     <select
                       value={selectedSeason}
                       onChange={(e) => setSelectedSeason(e.target.value)}
                       className="bg-white text-blue-950 font-black text-xs px-3 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer shadow-sm flex-1 sm:flex-none"
                     >
                        <option value="all">جميع المواسم مجتمعة</option>
                        {playerSeasons.map(s => (
                          <option key={s} value={s}>موسم {s}</option>
                        ))}
                     </select>
                  </div>
               </div>

               {/* بطاقات المواسم المسجلة في سجل اللاعب */}
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                  {playerSeasons.map(s => {
                    const isCurrentSelected = selectedSeason === s;
                    const isSystemActive = state.activeSeason === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSeason(s)}
                        className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 relative overflow-hidden ${
                          isCurrentSelected 
                            ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20' 
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      >
                        {isSystemActive && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full self-start ${isCurrentSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                            الموسم الحالي
                          </span>
                        )}
                        <div>
                           <span className="text-xs font-black block">موسم {s}</span>
                           <span className={`text-[9px] font-bold ${isCurrentSelected ? 'text-orange-100' : 'text-slate-500'}`}>
                             مقيد في الفريق ✓
                           </span>
                        </div>
                      </button>
                    );
                  })}
               </div>
            </div>

            {/* مؤشرات الأداء السريعة */}
            {player.role === 'لاعب' && (
              <div className={`grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4`}>
                 <div className="modern-card p-4 md:p-6 border-t-4 border-emerald-500 text-center group transition-all">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-500 mb-1 uppercase">الأداء</p>
                    <p className="text-2xl md:text-4xl font-black text-emerald-500">%{attendanceStats.rate}</p>
                    <div className="w-full bg-slate-100 h-1 md:h-1.5 rounded-full mt-3 overflow-hidden">
                       <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${attendanceStats.rate}%` }}></div>
                    </div>
                 </div>
                 
                 <div className="modern-card p-4 md:p-6 border-t-4 border-orange-500 text-center group transition-all">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">أهداف</p>
                    <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.goals}</p>
                    <Zap size={14} className="text-orange-600 mx-auto mt-1" />
                 </div>
                 <div className="modern-card p-4 md:p-6 border-t-4 border-blue-500 text-center group transition-all">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">صناعة</p>
                    <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.assists}</p>
                    <TrendingUp size={14} className="text-blue-600 mx-auto mt-1" />
                 </div>
                 <div className="modern-card p-4 md:p-6 border-t-4 border-purple-500 text-center group transition-all">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">دقائق</p>
                    <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.totalMins}</p>
                    <Timer size={14} className="text-purple-600 mx-auto mt-1" />
                 </div>
              </div>
            )}

            {/* إحصائيات المباريات المفصلة حسب البطولة/النوع */}
            {player.role === 'لاعب' && Object.keys(stats.groupedStats).length > 0 && (
               <div className="modern-card p-6 md:p-8 border-r-8 border-blue-600">
                  <SectionTitle icon={Trophy} title="سجل المباريات المفصل" color="text-blue-500" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                     {Object.entries(stats.groupedStats).map(([type, s]: any) => (
                        <div key={type} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 hover:bg-slate-100 transition-all">
                           <div className="flex items-center gap-2 text-slate-500">
                              <Trophy size={14} className="text-orange-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{type}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-500">المباريات:</span>
                              <span className="text-blue-900">{s.matches}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-500">الدقائق:</span>
                              <span className="text-emerald-600">{s.mins} دقيقة</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-500">الأهداف:</span>
                              <span className="text-orange-600">{s.goals}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-500">الصناعة:</span>
                              <span className="text-blue-600">{s.assists}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs font-bold font-mono">
                              <span className="text-slate-500 text-[10px]">بطاقات (ص | ح):</span>
                              <span className="text-slate-700">
                                <span className="text-yellow-600">{s.yellows}</span> | <span className="text-red-500">{s.reds}</span>
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* المواصفات الفنية والبدنية الشاملة */}
            {player.role === 'لاعب' ? (
               <div className="modern-card p-6 md:p-8 border-r-8 border-emerald-600 space-y-6">
                  <div>
                     <SectionTitle icon={Activity} title="المواصفات الفنية والبدنية" color="text-emerald-500" />
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                        <InfoBlock icon={Target} label="المركز" value={player.position} />
                        <InfoBlock icon={Droplet} label="زمرة الدم" value={player.bloodType} color="text-red-600 font-black" />
                        <InfoBlock icon={Footprints} label="القدم المفضلة" value={player.preferredFoot} color="text-orange-600 font-bold" />
                        <InfoBlock icon={Footprints} label="قياس الحذاء" value={player.shoeSize} color="text-blue-700 font-black" />
                        <InfoBlock icon={Shirt} label="قياس الملابس" value={player.clothesSize} color="text-indigo-700 font-black" />
                        <InfoBlock icon={Ruler} label="الطول" value={player.height ? `${player.height} سم` : '---'} color="text-emerald-700" />
                        <InfoBlock icon={Weight} label="الوزن" value={player.weight ? `${player.weight} كغ` : '---'} color="text-emerald-700" />
                        <InfoBlock icon={CalendarCheck} label="تاريخ الانضمام" value={player.joinDate} />
                        <InfoBlock icon={GraduationCap} label="الشهادة العلمية" value={player.academicDegree} />
                        <InfoBlock icon={UserCheck} label="تصنيف اللاعب" value="لاعب نادي رسمي" color="text-blue-900 font-black" />
                        {player.coachingCertificate && (
                           <InfoBlock icon={Award} label="الشهادة التدريبية" value={player.coachingCertificate} />
                        )}
                     </div>
                  </div>

                  {/* بيانات التجهيزات والعهد الرياضية والاشتراكات */}
                  <div className="pt-4 border-t border-slate-100">
                     <h4 className="text-xs font-black text-slate-700 flex items-center gap-2 mb-3">
                        <Package size={15} className="text-orange-500" />
                        التجهيزات الرياضية والاشتراكات
                     </h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase">استلام طقم اللباس</span>
                           <span className={`text-xs font-black ${player.receivedKit ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {player.receivedKit ? 'تم الاستلام بنجاح ✓' : 'لم يستلم بعد'}
                           </span>
                        </div>
                        {player.kitAmount && (
                           <InfoBlock icon={Wallet} label="مبلغ طقم اللباس" value={`${player.kitAmount} ل.س`} color="text-emerald-600" />
                        )}
                        {player.isAcademyPlayer && player.subscriptionAmount && (
                           <InfoBlock icon={Wallet} label="قسط الاشتراك" value={`${player.subscriptionAmount} ل.س`} color="text-emerald-600" />
                        )}
                        {player.isAcademyPlayer && player.subscriptionMonth && (
                           <InfoBlock icon={Calendar} label="شهر الاشتراك" value={player.subscriptionMonth} color="text-blue-600" />
                        )}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="modern-card p-6 md:p-8 border-r-8 border-emerald-600">
                  <SectionTitle icon={Activity} title="2. التوصيف الوظيفي بالنادي" color="text-emerald-500" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                     <InfoBlock icon={Target} label="الدور الوظيفي" value={player.role} />
                     <InfoBlock icon={UserCheck} label="الصفة والانتماء" value="كادر نادي رسمي" color="text-blue-900 font-black" />
                     <InfoBlock icon={CalendarCheck} label="الفئة" value={player.category || 'غير محدد'} />
                     <InfoBlock icon={CalendarCheck} label="تاريخ الانضمام" value={player.joinDate} />
                  </div>
               </div>
            )}

            {player.role !== 'لاعب' && player.certificates && (
              <div className="modern-card p-6 md:p-8 border-r-8 border-orange-500 bg-orange-50">
                 <div className="flex justify-between items-center mb-4">
                   <SectionTitle icon={Medal} title="3. الشهادات التدريبية المعتمدة" color="text-orange-500" />
                   <span className="text-xs font-black bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                     {player.certificates.length} شهادات
                   </span>
                 </div>
                 <div className="space-y-3 mt-4">
                    {player.certificates.map(cert => (
                      <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <Medal size={20} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-sm">{cert.name}</span>
                            <span className="text-xs text-slate-500 font-semibold">{cert.date || 'تاريخ غير محدد'}</span>
                          </div>
                        </div>

                        {cert.image && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ title: `وثيقة شهادة: ${cert.name}`, src: cert.image! })}
                            className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 self-start sm:self-auto"
                          >
                            <div className="w-6 h-6 rounded bg-slate-200 overflow-hidden flex items-center justify-center">
                              <img src={cert.image} alt={cert.name} className="w-full h-full object-cover" />
                            </div>
                            <Eye size={14} />
                            <span>عرض وثيقة الشهادة</span>
                          </button>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {player.role !== 'لاعب' && (
              <div className="modern-card p-6 md:p-8 border-r-8 border-blue-500 bg-blue-50">
                 <SectionTitle icon={Medal} title="4. الخبرات السابقة" color="text-blue-500" />
                 <div className="space-y-3 mt-4">
                    {player.experiences && player.experiences.length > 0 ? player.experiences.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <span className="font-bold text-slate-900">{exp.employer}</span>
                        <span className="text-sm text-blue-900 font-bold px-3 py-1 bg-blue-100 rounded-lg">{exp.position}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 italic p-4 bg-white rounded-xl border border-slate-200">لا يوجد خبرات سابقة مضافة</p>
                    )}
                 </div>
              </div>
            )}

            {/* السجل المالي والتعاقدي */}
            {(Boolean(player.contractStart) || Boolean(player.contractEnd) || Boolean(player.contractValue) || Boolean(player.contractDuration)) && (
              <div className="modern-card p-6 md:p-8 border-r-8 border-yellow-600 bg-yellow-600/5">
                 <SectionTitle icon={Wallet} title="السجل التعاقدي" color="text-yellow-500" />
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <InfoBlock icon={Calendar} label="بداية العقد" value={player.contractStart} />
                    <InfoBlock icon={Calendar} label="نهاية العقد" value={player.contractEnd} />
                    <InfoBlock icon={CalendarCheck} label="مدة العقد" value={player.contractDuration} />
                    <InfoBlock icon={DollarSign} label="قيمة العقد" value={player.contractValue} color="text-yellow-700" />
                 </div>
              </div>
            )}

            {/* الحالة الطبية */}
            {player.role === 'لاعب' && (
              <div className="modern-card p-6 md:p-8 border-r-8 border-red-600 bg-red-600/5">
                 <SectionTitle icon={ShieldAlert} title="الحالة الطبية والانضباط" color="text-red-500" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><HeartPulse size={12}/> السجل الطبي</p>
                       <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                          {player.medicalHistory || 'لا يوجد سجلات طبية.'}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> الإصابات</p>
                       <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                          {player.injuries || 'لا يوجد إصابات.'}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Gavel size={12}/> العقوبات</p>
                       <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                          {player.penalties || 'نظيف.'}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><StickyNote size={12}/> ملاحظات</p>
                       <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-slate-700 shadow-sm">
                          {player.notes || 'لا ملاحظات.'}
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* سجل المشاركة التنافسي */}
            {player.role === 'لاعب' && (
              <div className="modern-card p-6 md:p-8 border-r-8 border-orange-600 overflow-hidden shadow-2xl">
                 <SectionTitle icon={Trophy} title="سجل المشاركة" color="text-orange-500" />
                 
                 {/* Mobile Cards for Match History */}
                 <div className="block md:hidden space-y-3">
                    {stats.matchHistory.map((m, i) => (
                      <div key={i} className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-center">
                            <div>
                               <p className="text-[11px] font-black text-blue-950">{m.opponent}</p>
                               <p className="text-[8px] text-slate-600 font-bold">{m.date}</p>
                            </div>
                            <span className="text-xs font-black text-orange-600">{m.score}</span>
                         </div>
                         <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black">
                            <div className="text-slate-600">{m.mins}د</div>
                            <div className="text-emerald-600">⚽ {m.goals || '-'}</div>
                            <div className="text-blue-600">👟 {m.assists || '-'}</div>
                            <div className="text-slate-700">🟨{m.cards.y} 🟥{m.cards.r}</div>
                         </div>
                      </div>
                    ))}
                    {stats.matchHistory.length === 0 && <p className="p-6 text-center text-slate-500 text-xs italic">لا مشاركات مسجلة.</p>}
                 </div>

                 {/* Desktop Table View */}
                 <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                       <thead className="bg-slate-50 text-slate-700 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                          <tr>
                             <th className="p-4 rounded-tr-xl">المنافس</th>
                             <th className="p-4 text-center">النتيجة</th>
                             <th className="p-4 text-center">دقائق</th>
                             <th className="p-4 text-center text-emerald-600">⚽</th>
                             <th className="p-4 text-center text-blue-600">👟</th>
                             <th className="p-4 text-center rounded-tl-xl">🟨/🟥</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 font-bold text-[11px] text-blue-950">
                          {stats.matchHistory.map((m, i) => (
                             <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-black">{m.opponent} <span className="text-[9px] text-slate-500 block font-medium">{m.date}</span></td>
                                <td className="p-4 text-center tabular-nums">{m.score}</td>
                                <td className="p-4 text-center tabular-nums text-slate-600">{m.mins} د</td>
                                <td className="p-4 text-center tabular-nums text-emerald-600">{m.goals || '-'}</td>
                                <td className="p-4 text-center tabular-nums text-blue-600">{m.assists || '-'}</td>
                                <td className="p-4 text-center tabular-nums">
                                   <span className="text-amber-500">{m.cards.y}</span>/<span className="text-red-600">{m.cards.r}</span>
                                </td>
                             </tr>
                          ))}
                          {stats.matchHistory.length === 0 && (
                             <tr><td colSpan={6} className="p-10 text-center text-slate-500 italic">لا مشاركات مسجلة.</td></tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* التقييم الفني الشهري */}
            <div className="modern-card p-6 md:p-8 border-t-8 border-blue-600 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <SectionTitle icon={StickyNote} title="التقييم الشهري" color="text-blue-500" />
               </div>
               <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar pb-2 print:hidden">
                  {months.map(m => (
                     <button key={m} onClick={() => setSelectedMonth(m)} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all border-2 shrink-0 ${selectedMonth === m ? 'bg-blue-900 border-blue-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-900'}`}>
                        {m} {monthlyNotes[m] ? '✓' : ''}
                     </button>
                  ))}
               </div>
               <div className="space-y-4 print:hidden">
                 <textarea 
                   className="w-full bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-5 md:p-8 text-xs md:text-sm text-blue-950 h-48 md:h-56 resize-none outline-none focus:border-blue-900 transition-all font-medium leading-relaxed"
                   placeholder={`اكتب الملاحظات الفنية لشهر ${selectedMonth}...`}
                   value={monthlyNotes[selectedMonth] || ""}
                   onChange={e => setMonthlyNotes({...monthlyNotes, [selectedMonth]: e.target.value})}
                   readOnly={isViewer}
                 ></textarea>
                 {!isViewer && (
                   <button onClick={handleSaveMonthlyReport} disabled={isSavingReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-2 shadow-xl transition-all border-b-8 border-blue-900 active:translate-y-1 active:border-b-0">
                     {isSavingReport ? <Loader2 size={24} className="animate-spin"/> : <Save size={18}/>} 
                     حفظ تقرير {selectedMonth}
                   </button>
                 )}
               </div>
               
               <div className="mt-12 md:mt-16 space-y-6 md:space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                     <History size={20} className="text-blue-600" />
                     <h4 className="font-black text-base md:text-lg text-blue-950">الأرشيف الزمني</h4>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                     {sortedSavedReports.length > 0 ? sortedSavedReports.map((report, idx) => (
                       <div key={idx} className="bg-slate-50 border-r-8 border-blue-600 border border-slate-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                             <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest">{report.month}</span>
                          </div>
                          <p className="text-[11px] md:text-sm font-medium text-slate-700 leading-loose italic">"{report.content}"</p>
                       </div>
                     )) : (
                       <div className="py-12 text-center border-4 border-dashed border-slate-200 rounded-[2rem]">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">أرشيف فارغ</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
       {previewDoc && (
         <div
           className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
           onClick={() => setPreviewDoc(null)}
         >
           <div
             className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
             onClick={(e) => e.stopPropagation()}
             dir="rtl"
           >
             <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
               <div className="flex items-center gap-2">
                 <FileCheck className="text-orange-500" size={20} />
                 <h4 className="text-sm font-black text-slate-900">{previewDoc.title} - {player.name}</h4>
               </div>
               <div className="flex items-center gap-2">
                 <a
                   href={previewDoc.src}
                   download={`${player.name}_${previewDoc.title}.jpg`}
                   className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                 >
                   <Download size={16} /> تحميل
                 </a>
                 <button
                   type="button"
                   onClick={() => setPreviewDoc(null)}
                   className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl transition-all"
                 >
                   <X size={20} />
                 </button>
               </div>
             </div>
             <div className="p-4 overflow-auto flex items-center justify-center max-h-[80vh] bg-slate-100">
               <img
                 src={previewDoc.src}
                 alt={previewDoc.title}
                 className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-200"
               />
             </div>
           </div>
         </div>
       )}
        {isEditModalOpen && (
          <EditPersonModal
            person={player}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSaved={(updated) => {
              setState(prev => ({
                ...prev,
                people: prev.people.map(p => p.id === updated.id ? updated : p)
              }));
              Object.assign(player, updated);
              addLog?.('تم تحديث البيانات بنجاح', 'success');
            }}
            isSelf={isSelf}
          />
        )}
    </div>
  );
};

export default PlayerReport;
