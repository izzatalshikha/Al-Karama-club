import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, Calendar, 
  TrendingUp, TrendingDown, Activity, Trophy, 
  CheckCircle, CheckCircle2, Hash, User, Timer, StickyNote, 
  HeartPulse, ShieldAlert, Gavel, Wallet, 
  Phone, Fingerprint, Ruler, Weight, BadgeCheck, MapPin, 
  Globe, BarChart, Users, Star, AlertCircle, FileText,
  Loader2, GraduationCap, Award, Home, Info, Zap, Medal,
  Save, History, BookOpen, Briefcase, DollarSign, CalendarCheck, UserX, Clock,
  CreditCard, Eye, X, Download, FileCheck, Edit2, Plus, Trash2, Upload, UserCheck, ShieldCheck,
  Shirt, Footprints, Droplet, Package, PhoneCall, AlertTriangle, Scale
} from 'lucide-react';
import { AppState, Person, Match, CoachingCertificate, PreviousExperience, WeightEntry } from '../types';
import { supabase, generateUUID } from '../App';
import { safeSavePerson } from '../utils/supabaseSanitizer';
import ClubLogo from './ClubLogo';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DocumentUploadCard from './DocumentUploadCard';
import { compressDocumentImage } from '../utils/imageCompressor';
import EditPersonModal from './EditPersonModal';
import ProfilePhotoUploader from './ProfilePhotoUploader';

interface PlayerReportProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  player: Person | null;
  onBack: () => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, setState, player, onBack, addLog }) => {
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [monthlyNotes, setMonthlyNotes] = useState<{ [key: string]: string }>(() => {
    if (!player?.monthlyReports) return {};
    if (typeof player.monthlyReports === "string") {
      try { return JSON.parse(player.monthlyReports); } catch { return {}; }
    }
    return typeof player.monthlyReports === "object" ? player.monthlyReports : {};
  });
  const [previewDoc, setPreviewDoc] = useState<{ title: string; src: string } | null>(null);
  
  // Edit Person Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Person>>(player ? { ...player } : {});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Weight Tracking Modal state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeightVal, setNewWeightVal] = useState('');
  const [newWeightNote, setNewWeightNote] = useState('');
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);
  const [selectedSeason, setSelectedSeason] = useState<string>(state.activeSeason || '2025/2026');

  if (!player || !state.currentUser) return null;

  // مواسم اللاعب المعتمدة بدون أي تكرار
  const rawPlayerSeasons = [
    ...(Array.isArray(player.seasons) ? player.seasons : []),
    ...(typeof player.season === 'string' ? player.season.split(',') : [])
  ].map(s => String(s || '').trim()).filter(Boolean);
  const playerSeasons = Array.from(new Set(rawPlayerSeasons));
  const finalPlayerSeasons = playerSeasons.length > 0 ? playerSeasons : ['2025/2026'];

  const isSelf = Boolean(
    (state.currentUser?.relatedPersonId && state.currentUser.relatedPersonId === player.id) ||
    (state.currentUser?.username && (state.currentUser.username === player.name || player.name.includes(state.currentUser.username))) ||
    (state.currentUser?.id === player.id)
  );
  const isManager = state.currentUser.role === 'مدير';
  const isCoach = state.currentUser.role === 'مدرب' || state.currentUser.role === 'مساعد مدرب' || state.currentUser.role === 'إداري فئة';
  const canEditPerson = isManager || isSelf || (isCoach && (!state.currentUser?.restrictedCategory || String(state.currentUser.restrictedCategory).includes(player.category)));

  const isViewer = state.currentUser.role === 'مشاهد' || state.currentUser.role === 'لاعب';
  const canUploadOfficialPhoto = isManager || (isCoach && (!state.currentUser?.restrictedCategory || String(state.currentUser.restrictedCategory).includes(player.category)));

  const handlePhotoUpdate = async (newPhoto: string | null) => {
    if (!player || !canUploadOfficialPhoto) return;
    try {
      const updated = { ...player, photo: newPhoto || undefined };
      const res = await safeSavePerson(updated, 'update', player.id);
      if (!res.success) throw res.error;
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? updated : p)
      }));
      Object.assign(player, { photo: newPhoto || undefined });
      addLog?.('تم تحديث الصورة الشخصية بنجاح', 'success');
    } catch (err: any) {
      alert('خطأ أثناء حفظ الصورة: ' + (err.message || err));
    }
  };

  // الشهادات والخبرات المعتمدة للكادر
  const cadreCertificates: CoachingCertificate[] = useMemo(() => {
    if (Array.isArray(player.certificates) && player.certificates.length > 0) return player.certificates;
    if (player.monthlyReports?._certificates) {
      try { return JSON.parse(player.monthlyReports._certificates); } catch(e) {}
    }
    return [];
  }, [player.certificates, player.monthlyReports]);

  const cadreExperiences: PreviousExperience[] = useMemo(() => {
    if (Array.isArray(player.experiences) && player.experiences.length > 0) return player.experiences;
    if (player.monthlyReports?._experiences) {
      try { return JSON.parse(player.monthlyReports._experiences); } catch(e) {}
    }
    return [];
  }, [player.experiences, player.monthlyReports]);

  const handleCertificateImageUpdate = async (index: number, file: File) => {
    if (!player || !canEditPerson) return;
    try {
      const compressed = await compressDocumentImage(file, { maxWidth: 1400, maxHeight: 1400, quality: 0.78 });
      const newCerts = [...cadreCertificates];
      newCerts[index] = { ...newCerts[index], image: compressed.base64 };
      const updated = { ...player, certificates: newCerts };
      const res = await safeSavePerson(updated, 'update', player.id);
      if (!res.success) throw res.error;
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? updated : p)
      }));
      Object.assign(player, { certificates: newCerts });
      addLog?.('تم تحديث وثيقة الشهادة بنجاح', 'success');
    } catch (err: any) {
      alert('خطأ أثناء معالجة وحفظ صورة الشهادة: ' + err.message);
    }
  };

  // ==============================================================
  // 1. حساب إحصائيات الأداء الرقمي المباشر الحقيقية من المباريات
  // ==============================================================
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
      const mSeason = m.season || (m.date?.startsWith('2027') ? '2026/2027' : '2025/2026');
      return mSeason === targetSeason;
    };

    (state.matches || []).filter(m => m.isCompleted && matchSeasonFilter(m)).forEach(m => {
      const pName = (player.name || '').trim();
      const starter = m.lineup?.starters?.find(s => s.playerId === player.id || (s.name && s.name.trim() === pName));
      const sub = m.lineup?.subs?.find(s => s.playerId === player.id || (s.name && s.name.trim() === pName));
      const inSquad = Array.isArray(m.squad) && m.squad.includes(player.id);
      const playerEvents = (m.events || []).filter(e => e.player === player.id || e.player === player.name || (typeof e.player === 'string' && e.player.trim() === pName));

      if (starter || sub || inSquad || playerEvents.length > 0) {
        appearances++;
        const defaultMin = starter ? (parseInt(m.matchDuration || '90', 10) || 90) : 0;
        const mins = parseInt(starter?.minutesPlayed || sub?.minutesPlayed || String(defaultMin), 10) || defaultMin;
        totalMins += mins;

        const playerGoals = playerEvents.filter(e => e.type === 'goal').length;
        const playerAssists = playerEvents.filter(e => e.type === 'assist').length;
        const playerYellows = playerEvents.filter(e => e.type === 'yellow').length;
        const playerReds = playerEvents.filter(e => e.type === 'red').length;

        goals += playerGoals;
        assists += playerAssists;
        yellows += playerYellows;
        reds += playerReds;
        
        let typeName = m.matchType || 'أخرى';
        if (m.matchType === 'مباراة بطولة' && m.notes) {
           const tourNameMatch = m.notes.match(/بطولة: (.*?) -/);
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

  // ==============================================================
  // حساب معدلات الحضور والغياب الحقيقية من سجلات التمارين الفعلية
  // ==============================================================
  const attendanceStats = useMemo(() => {
    const targetSeason = selectedSeason;
    const sessionMap = new Map((state.sessions || []).map(s => [s.id, s]));

    // تصفية سجلات حضور اللاعب الفعلية
    const records = (state.attendance || []).filter(a => {
      if (a.personId !== player.id) return false;
      if (targetSeason === 'all') return true;
      const sess = sessionMap.get(a.sessionId) as any;
      const sessSeason = sess?.season || (a.date?.startsWith('2027') ? '2026/2027' : '2025/2026');
      return sessSeason === targetSeason;
    });

    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const absent = records.filter(r => r.status === 'غائب').length;
    const excused = records.filter(r => r.status === 'غياب بعذر').length;
    
    const totalRecorded = present + late + absent;
    const score = totalRecorded > 0 ? ((present + (late * 0.5)) / totalRecorded) * 100 : (present > 0 ? 100 : 0);
    const rate = Math.min(100, Math.round(score));

    const commitmentIndex = rate >= 90 ? 'ممتاز' : rate >= 75 ? 'جيد جداً' : rate >= 50 ? 'متوسط' : 'ضعيف';

    // حساب منحنى الالتزام الشهري من السجلات الحقيقية
    const monthlyGroups: Record<string, { total: number, score: number }> = {};
    records.forEach(r => {
      const month = r.date ? r.date.substring(0, 7) : '';
      if (!month) return;
      if (!monthlyGroups[month]) monthlyGroups[month] = { total: 0, score: 0 };
      if (r.status !== 'غياب بعذر') {
        monthlyGroups[month].total += 1;
        if (r.status === 'حاضر') monthlyGroups[month].score += 1;
        if (r.status === 'متأخر') monthlyGroups[month].score += 0.5;
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

    return { rate, present, late, absent, excused, totalRecorded, commitmentIndex, monthlyTrend };
  }, [state.sessions, state.attendance, player, selectedSeason]);

  // ==============================================================
  // سجل تتبع قياسات أوزان اللاعب وتنبيهات الزيادة أو النقصان
  // ==============================================================
  const weightHistory: WeightEntry[] = useMemo(() => {
    let list: WeightEntry[] = [];
    if (Array.isArray(player.weightHistory) && player.weightHistory.length > 0) {
      list = [...player.weightHistory];
    } else if (player.monthlyReports?._weightHistory) {
      try {
        const parsed = JSON.parse(player.monthlyReports._weightHistory);
        if (Array.isArray(parsed)) list = [...parsed];
      } catch (e) {
        // ignore
      }
    }
    // إذا كان السجل فارغاً ويوجد وزن حالي، نضع قياساً أولياً كنقطة بداية
    if (list.length === 0 && player.weight) {
      const num = parseFloat(player.weight);
      if (!isNaN(num) && num > 0) {
        list.push({
          date: player.joinDate || '2026-07-01',
          weight: num,
          note: 'الوزن الأولي المسجل'
        });
      }
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [player.weightHistory, player.monthlyReports, player.weight, player.joinDate]);

  // تحليل مؤشر الوزن والتنبيهات التلقائية
  const weightAnalysis = useMemo(() => {
    if (weightHistory.length === 0) {
      return {
        hasHistory: false,
        latestWeight: player.weight ? parseFloat(player.weight) : null,
        prevWeight: null,
        diff: 0,
        status: 'none' as const,
        message: 'لا توجد قياسات سابقة مسجلة لتتبع تطور الوزن'
      };
    }
    if (weightHistory.length === 1) {
      return {
        hasHistory: true,
        latestWeight: weightHistory[0].weight,
        prevWeight: null,
        diff: 0,
        status: 'optimal' as const,
        message: `تم تسجيل أول قياس وزن للاعب: ${weightHistory[0].weight} كغ بتاريخ ${weightHistory[0].date}`
      };
    }
    const latest = weightHistory[weightHistory.length - 1];
    const prev = weightHistory[weightHistory.length - 2];
    const diff = Number((latest.weight - prev.weight).toFixed(1));

    if (diff > 1.5) {
      return {
        hasHistory: true,
        latestWeight: latest.weight,
        prevWeight: prev.weight,
        diff,
        status: 'gain' as const,
        message: `⚠️ تنبيه زيادة في الوزن: لوحظت زيادة في وزن اللاعب بمقدار +${diff} كغ (ارتفع من ${prev.weight} كغ بتاريخ ${prev.date} إلى ${latest.weight} كغ بتاريخ ${latest.date}). يُنصح بمتابعة البرنامج البدني والحمية الغذائية.`
      };
    } else if (diff < -1.5) {
      return {
        hasHistory: true,
        latestWeight: latest.weight,
        prevWeight: prev.weight,
        diff,
        status: 'loss' as const,
        message: `📉 تنبيه انخفاض في الوزن: لوحظ انخفاض في وزن اللاعب بمقدار ${diff} كغ (نزل من ${prev.weight} كغ بتاريخ ${prev.date} إلى ${latest.weight} كغ بتاريخ ${latest.date}). يُرجى التأكد من الجاهزية البدنية والتغذية السليمة.`
      };
    } else {
      return {
        hasHistory: true,
        latestWeight: latest.weight,
        prevWeight: prev.weight,
        diff,
        status: 'optimal' as const,
        message: `✓ الوزن مستقر ومثالي: الوزن الحالي ${latest.weight} كغ مستقر وضمن النطاق الطبيعي (الفارق ${diff >= 0 ? '+' : ''}${diff} كغ مقارنة بالقياس السابق ${prev.weight} كغ).`
      };
    }
  }, [weightHistory, player.weight]);

  // حفظ قياس وزن جديد
  const handleSaveWeightEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(newWeightVal);
    if (isNaN(wNum) || wNum <= 0) return;
    setIsSavingWeight(true);
    try {
      const newEntry: WeightEntry = {
        date: newWeightDate,
        weight: wNum,
        note: newWeightNote.trim() || undefined
      };
      const updatedHistory = [...weightHistory.filter(x => x.date !== newWeightDate), newEntry]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const cleanData: Partial<Person> = {
        ...player,
        weight: String(wNum),
        weightHistory: updatedHistory,
        monthlyReports: {
          ...(player.monthlyReports || {}),
          _weightHistory: JSON.stringify(updatedHistory)
        }
      };

      const saveRes = await safeSavePerson(cleanData, 'update', player.id);
      if (!saveRes.success) throw saveRes.error;

      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, ...cleanData } : p)
      }));

      Object.assign(player, cleanData);
      addLog?.('تم حفظ قياس الوزن بنجاح', 'success');
      setIsWeightModalOpen(false);
      setNewWeightVal('');
      setNewWeightNote('');
    } catch (err: any) {
      alert('خطأ أثناء حفظ الوزن: ' + err.message);
    } finally {
      setIsSavingWeight(false);
    }
  };

  // حذف قياس وزن
  const handleDeleteWeightEntry = async (dateToDelete: string) => {
    if (!confirm('هل تريد بالتأكيد حذف هذا القياس من سجل الوزن؟')) return;
    try {
      const updatedHistory = weightHistory.filter(x => x.date !== dateToDelete);
      const latestWeight = updatedHistory.length > 0 ? String(updatedHistory[updatedHistory.length - 1].weight) : player.weight;
      const cleanData: Partial<Person> = {
        ...player,
        weight: latestWeight,
        weightHistory: updatedHistory,
        monthlyReports: {
          ...(player.monthlyReports || {}),
          _weightHistory: JSON.stringify(updatedHistory)
        }
      };
      await safeSavePerson(cleanData, 'update', player.id);
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, ...cleanData } : p)
      }));
      Object.assign(player, cleanData);
      addLog?.('تم حذف القياس بنجاح', 'info');
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

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
    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-1 hover:bg-slate-100 transition-all group">
      <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-orange-600">
        <Icon size={13} />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xs font-black ${color} truncate`}>{value || '---'}</span>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color = "text-orange-500", badge }: any) => (
    <div className="flex items-center justify-between mb-5 border-r-4 border-current pr-3" style={{ borderColor: 'currentColor' }}>
      <h3 className={`text-sm md:text-base font-black ${color} flex items-center gap-2 uppercase tracking-wider`}>
        <Icon size={18}/> {title}
      </h3>
      {badge && (
        <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
          {badge}
        </span>
      )}
    </div>
  );

  const sortedSavedReports = useMemo(() => {
    return months
      .map(m => ({ month: m, content: monthlyNotes[m] }))
      .filter(r => r.content && (typeof r.content === "string" ? r.content.trim().length > 0 : Boolean(r.content)));
  }, [monthlyNotes, months]);

  return (
    <div className="space-y-7 md:space-y-9 animate-in fade-in duration-500 pb-20 print:pb-0 px-2 md:px-0" dir="rtl">
      {/* هيدر الطباعة الرسمي */}
      <div className="hidden print:flex flex-col items-center justify-center text-center space-y-2 mb-8 border-b-4 border-slate-900 pb-6 w-full">
         <div className="flex items-center justify-center gap-6 mb-2">
           <img src="https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg" alt="Logo" className="w-24 h-24 rounded-full object-contain border-2 border-slate-200" />
           {player.photo && (
             <img src={player.photo} alt={player.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-900 shadow-sm" />
           )}
         </div>
         <h1 className="text-3xl font-black text-slate-900">نادي الكرامة الرياضي</h1>
         <h2 className="text-xl font-bold text-slate-700">مكتب كرة القدم</h2>
         <div className="mt-2 text-xl font-black bg-slate-900 text-white px-6 py-2 rounded-full inline-block tracking-widest">
            تقرير وأداء {player.role === 'لاعب' ? 'لاعب' : 'عضو كادر'} - {player.name}
         </div>
      </div>

      {/* هيدر التحكم والرجوع */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-900 shadow-xl gap-4 md:gap-6 print:hidden">
        <button onClick={onBack} className="w-full md:w-auto bg-white/5 hover:bg-orange-500 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2">
          <ChevronRight size={18} /> العودة
        </button>
        <div className="flex items-center gap-3 md:gap-4 text-center md:text-right">
           <ClubLogo size={42} className="md:w-[58px] md:h-[58px]" />
           <div>
              <h1 className="text-xl md:text-2xl font-black text-white bg-gradient-to-l from-orange-400 to-white bg-clip-text text-transparent leading-none">الملف الفني والسجل الرقمي</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">EAGLE OS PERFORMANCE & PASSPORT</p>
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

      {/* ============================================================== */}
      {/* بطاقة البروفايل العلوية الشاملة للتعريف باللاعب */}
      {/* ============================================================== */}
      <div className="modern-card p-6 md:p-8 bg-gradient-to-l from-blue-950 via-[#0f172a] to-blue-900 text-white border-2 border-blue-900 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-7 text-center sm:text-right">
            <ProfilePhotoUploader
              photo={player.photo}
              name={player.name}
              role={player.role}
              number={player.number}
              onPhotoChange={handlePhotoUpdate}
              disabled={!canUploadOfficialPhoto}
              size="2xl"
            />
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {player.role} • {player.category}
                </span>
                <span className="bg-blue-800/80 text-blue-200 border border-blue-700 px-3 py-1 rounded-full text-[10px] font-black">
                  ⚽ عضو نادي الكرامة الرسمي
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{player.name}</h2>
              <p className="text-xs text-slate-300 font-bold mt-1">
                المركز: {player.position || 'غير محدد'} | تاريخ الانضمام: {player.joinDate || '---'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-r border-white/10 pt-4 md:pt-0 md:pr-6">
            <div className="text-center sm:text-right">
              <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">رمز السجل الرقمي</span>
              <span className="text-xs font-black text-orange-400 font-mono">{player.nationalId || player.id.substring(0, 8)}</span>
            </div>
            <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 shrink-0 print:hidden">
              <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?playerId=${player.id}`} size={64} level="M" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* شريط المواسم الرياضية ومحدد الإحصائيات الفورية */}
      {/* ============================================================== */}
      <div className="modern-card p-5 md:p-6 border-r-8 border-orange-500 bg-gradient-to-l from-orange-50/40 via-white to-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-blue-950">
                المواسم الرياضية المعتمدة في النادي ({finalPlayerSeasons.length} مواسم مسجلة)
              </h3>
              <p className="text-[10px] text-slate-500 font-bold">
                اختر الموسم لعرض أداء وإحصائيات {player.role === 'لاعب' ? 'اللاعب' : 'الكادر'} فيه بدقة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
            <span className="text-[10px] font-black text-slate-600 px-2 whitespace-nowrap">فلتر الإحصائيات:</span>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-white text-blue-950 font-black text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none cursor-pointer shadow-xs flex-1 sm:flex-none"
            >
              <option value="all">جميع المواسم مجتمعة</option>
              {finalPlayerSeasons.map(s => (
                <option key={s} value={s}>موسم {s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedSeason('all')}
            className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
              selectedSeason === 'all'
                ? 'bg-blue-950 text-white border-blue-950 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            جميع المواسم
          </button>
          {finalPlayerSeasons.map(s => {
            const isSelected = selectedSeason === s;
            const isSystemActive = state.activeSeason === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSeason(s)}
                className={`px-4 py-2 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>موسم {s}</span>
                {isSystemActive && (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                    الموسم النشط
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* البند الأول: إحصائيات الأداء الرقمي المباشر (أولاً في السجل) */}
      {/* ============================================================== */}
      {player.role === 'لاعب' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-r-4 border-orange-500 pr-3">
            <div>
              <h2 className="text-base md:text-lg font-black text-blue-950">
                البند الأول: إحصائيات الأداء الرقمي المباشر (بيانات حقيقية من التمارين والمباريات)
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                معدلات الحضور الفعلي والغياب والدقائق والأهداف والبطاقات المسجلة
              </p>
            </div>
            <span className="text-xs bg-orange-100 text-orange-800 font-black px-3 py-1 rounded-lg">
              {selectedSeason === 'all' ? 'كافة المواسم' : `موسم ${selectedSeason}`}
            </span>
          </div>

          {/* شبكة البطاقات الرقمية الكبرى */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {/* معدل الحضور والالتزام */}
            <div className="modern-card p-5 border-t-4 border-emerald-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <CheckCircle size={12} className="text-emerald-500" /> معدل الحضور
                </p>
                <p className="text-3xl md:text-4xl font-black text-emerald-600 font-mono">
                  %{attendanceStats.rate}
                </p>
                <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mt-1">
                  مستوى الالتزام: {attendanceStats.commitmentIndex}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${attendanceStats.rate}%` }}></div>
              </div>
            </div>

            {/* الأهداف المسجلة */}
            <div className="modern-card p-5 border-t-4 border-orange-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Zap size={12} className="text-orange-500" /> الأهداف
                </p>
                <p className="text-3xl md:text-4xl font-black text-orange-600 font-mono">
                  {stats.goals}
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1 block">هدف رسمي</span>
              </div>
              <span className="text-[10px] text-orange-700 bg-orange-50 py-1 rounded-lg font-bold">⚽ هجوم</span>
            </div>

            {/* الأسيست / صناعة الأهداف */}
            <div className="modern-card p-5 border-t-4 border-blue-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <TrendingUp size={12} className="text-blue-500" /> الأسيست
                </p>
                <p className="text-3xl md:text-4xl font-black text-blue-600 font-mono">
                  {stats.assists}
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1 block">صناعة أهداف</span>
              </div>
              <span className="text-[10px] text-blue-700 bg-blue-50 py-1 rounded-lg font-bold">👟 تمريرات حاسمة</span>
            </div>

            {/* دقائق اللعب */}
            <div className="modern-card p-5 border-t-4 border-purple-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Timer size={12} className="text-purple-500" /> دقائق اللعب
                </p>
                <p className="text-3xl md:text-4xl font-black text-purple-600 font-mono">
                  {stats.totalMins}
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1 block">دقيقة داخل الميدان</span>
              </div>
              <span className="text-[10px] text-purple-700 bg-purple-50 py-1 rounded-lg font-bold">⏱️ مشاركة فعلية</span>
            </div>

            {/* عدد المباريات الملعوبة */}
            <div className="modern-card p-5 border-t-4 border-indigo-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <Trophy size={12} className="text-indigo-500" /> المباريات
                </p>
                <p className="text-3xl md:text-4xl font-black text-indigo-600 font-mono">
                  {stats.appearances}
                </p>
                <span className="text-[9px] font-bold text-slate-500 mt-1 block">مباراة ملعوبة</span>
              </div>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 py-1 rounded-lg font-bold">🏆 ظهور رسمي</span>
            </div>

            {/* البطاقات الملونة */}
            <div className="modern-card p-5 border-t-4 border-rose-500 text-center bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <ShieldAlert size={12} className="text-rose-500" /> البطاقات
                </p>
                <div className="flex items-center justify-center gap-2 text-2xl font-black font-mono my-1">
                  <span className="text-amber-500">🟨 {stats.yellows}</span>
                  <span className="text-rose-600">🟥 {stats.reds}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-500 block">انضباط تحكيمي</span>
              </div>
              <span className="text-[10px] text-rose-700 bg-rose-50 py-1 rounded-lg font-bold">🛡️ السلوك</span>
            </div>
          </div>

          {/* تفصيل الحضور والانضباط وسجل التمارين */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* تحليل الحضور والتفصيل بالأرقام الدقيقة */}
            <div className="lg:col-span-5 modern-card p-5 md:p-6 bg-white space-y-4">
              <SectionTitle icon={TrendingUp} title="تحليل سجل الحضور والغياب للتمارين" color="text-emerald-500" badge={`${attendanceStats.totalRecorded} حصة مسجلة`} />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                  <CheckCircle size={15} className="text-emerald-600 mx-auto mb-1"/>
                  <p className="text-[8px] font-black text-slate-600 uppercase">حاضر (تم التمرين)</p>
                  <p className="text-xl font-black text-emerald-700 font-mono">{attendanceStats.present}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                  <Clock size={15} className="text-amber-600 mx-auto mb-1"/>
                  <p className="text-[8px] font-black text-slate-600 uppercase">متأخر عن التمرين</p>
                  <p className="text-xl font-black text-amber-700 font-mono">{attendanceStats.late}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-center">
                  <UserX size={15} className="text-rose-600 mx-auto mb-1"/>
                  <p className="text-[8px] font-black text-slate-600 uppercase">غائب بدون عذر</p>
                  <p className="text-xl font-black text-rose-700 font-mono">{attendanceStats.absent}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-center">
                  <Info size={15} className="text-blue-600 mx-auto mb-1"/>
                  <p className="text-[8px] font-black text-slate-600 uppercase">غياب بعذر مقبول</p>
                  <p className="text-xl font-black text-blue-700 font-mono">{attendanceStats.excused}</p>
                </div>
              </div>

              {attendanceStats.monthlyTrend.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-600 mb-2 text-center">منحنى الالتزام الشهري في التمارين</h4>
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

            {/* تفصيل المشاركات حسب البطولات والمسابقات */}
            <div className="lg:col-span-7 modern-card p-5 md:p-6 bg-white space-y-4">
              <SectionTitle icon={Trophy} title="إحصائيات البطولات والمسابقات" color="text-blue-500" />
              {Object.keys(stats.groupedStats).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(stats.groupedStats).map(([type, s]: any) => (
                    <div key={type} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 hover:bg-slate-100 transition-all">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                          <Trophy size={14} className="text-orange-500" />
                          {type}
                        </span>
                        <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono">
                          {s.matches} مباريات
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono text-xs">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 block">دقائق</span>
                          <span className="font-black text-purple-600">{s.mins}د</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 block">أهداف</span>
                          <span className="font-black text-orange-600">⚽ {s.goals}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 block">أسيست</span>
                          <span className="font-black text-blue-600">👟 {s.assists}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[8px] text-slate-500 block">بطاقات</span>
                          <span className="font-black text-slate-700">🟨{s.yellows} 🟥{s.reds}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد مباريات مسجلة لهذا اللاعب في الموسم المختار
                </div>
              )}
            </div>
          </div>

          {/* سجل المشاركة التنافسي (جدول المباريات بالتفصيل) */}
          <div className="modern-card p-5 md:p-7 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Trophy} title="سجل المباريات التنافسية التفصيلي" color="text-orange-500" />
              <span className="text-xs font-black text-slate-500">
                إجمالي المشاركات: {stats.matchHistory.length}
              </span>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden space-y-2.5">
              {stats.matchHistory.map((m, i) => (
                <div key={i} className="bg-slate-50 p-3.5 rounded-xl space-y-2 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-blue-950">{m.opponent}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{m.date} • {m.matchType}</p>
                    </div>
                    <span className="text-xs font-black px-2 py-1 bg-white border border-slate-200 rounded-lg text-orange-600 font-mono">
                      {m.score}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-black font-mono">
                    <div className="bg-white p-1 rounded border border-slate-200 text-slate-700">{m.mins}د</div>
                    <div className="bg-white p-1 rounded border border-slate-200 text-emerald-600">⚽ {m.goals || '-'}</div>
                    <div className="bg-white p-1 rounded border border-slate-200 text-blue-600">👟 {m.assists || '-'}</div>
                    <div className="bg-white p-1 rounded border border-slate-200 text-slate-700">🟨{m.cards.y} 🟥{m.cards.r}</div>
                  </div>
                </div>
              ))}
              {stats.matchHistory.length === 0 && (
                <p className="p-6 text-center text-slate-400 text-xs italic">لا مشاركات مسجلة في هذا الموسم.</p>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 rounded-tr-xl">المنافس والبطولة</th>
                    <th className="p-3.5 text-center">التاريخ</th>
                    <th className="p-3.5 text-center">النتيجة</th>
                    <th className="p-3.5 text-center">دقائق اللعب</th>
                    <th className="p-3.5 text-center text-emerald-600">الأهداف ⚽</th>
                    <th className="p-3.5 text-center text-blue-600">صناعة 👟</th>
                    <th className="p-3.5 text-center rounded-tl-xl">إنذارات 🟨 / 🟥</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-xs text-blue-950">
                  {stats.matchHistory.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-black">
                        {m.opponent}
                        <span className="text-[10px] text-slate-500 block font-normal">{m.matchType}</span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-500">{m.date}</td>
                      <td className="p-3.5 text-center font-mono font-black text-orange-600">{m.score}</td>
                      <td className="p-3.5 text-center font-mono text-purple-700 font-black">{m.mins} د</td>
                      <td className="p-3.5 text-center font-mono text-emerald-600 font-black">{m.goals || '-'}</td>
                      <td className="p-3.5 text-center font-mono text-blue-600 font-black">{m.assists || '-'}</td>
                      <td className="p-3.5 text-center font-mono">
                        <span className="text-amber-500">{m.cards.y}</span> / <span className="text-rose-600">{m.cards.r}</span>
                      </td>
                    </tr>
                  ))}
                  {stats.matchHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">لا مشاركات مسجلة في هذا الموسم.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* البند الثاني: الهوية والبيانات الشخصية الرسمية (فوراً بعد إحصائيات الأداء الرقمي المباشر) */}
      {/* ============================================================== */}
      <section className="space-y-6">
        <div className="border-r-4 border-blue-950 pr-3">
          <h2 className="text-base md:text-lg font-black text-blue-950">
            البند الثاني: الهوية والبيانات الشخصية والوثائق الرسمية
          </h2>
          <p className="text-[11px] font-bold text-slate-500">
            البيانات المدنية المعتمدة وجواز السفر والمستندات الثبوتية
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* بيانات الهوية والقيد المدني (col-span-7) */}
          <div className="lg:col-span-7 modern-card p-5 md:p-7 bg-white space-y-4 border-r-8 border-slate-800">
            <SectionTitle icon={Fingerprint} title="الهوية والبيانات الشخصية الرسمية" color="text-slate-800" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
              <InfoBlock icon={User} label="الاسم الكامل" value={player.name} />
              <InfoBlock icon={User} label="اسم الأب" value={player.fatherName} />
              <InfoBlock icon={User} label="اسم الأم" value={player.motherName} />
              <InfoBlock icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
              <InfoBlock icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
              <InfoBlock icon={Home} label="الخانة (القيد)" value={player.khana} />
              <InfoBlock icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
              <InfoBlock icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
              <InfoBlock icon={Globe} label="الرقم الدولي ID" value={player.internationalId} />
              <InfoBlock icon={Phone} label="رقم الهاتف" value={player.phone} color="text-blue-600 font-bold" />
              {player.emergencyPhone && (
                <InfoBlock icon={PhoneCall} label="هاتف الطوارئ / ولي الأمر" value={player.emergencyPhone} color="text-rose-600 font-bold" />
              )}
              <InfoBlock icon={MapPin} label="عنوان السكن" value={player.address} />
              {player.registrationDate && (
                <InfoBlock icon={CalendarCheck} label="تاريخ التسجيل الرسمي" value={player.registrationDate} color="text-emerald-700" />
              )}
            </div>
          </div>

          {/* جواز السفر والوثائق المرفوعة (col-span-5) */}
          <div className="lg:col-span-5 modern-card p-5 md:p-7 bg-white space-y-4 border-r-8 border-blue-600">
            <SectionTitle icon={CreditCard} title="جواز السفر والمستندات المرفوعة" color="text-blue-600" />
            <div className="grid grid-cols-1 gap-2.5">
              <InfoBlock icon={CreditCard} label="رقم جواز السفر" value={player.passportNumber} color="text-blue-700 font-black font-mono" />
              <div className="grid grid-cols-2 gap-2">
                <InfoBlock icon={Calendar} label="تاريخ الإصدار" value={player.passportIssueDate} />
                <InfoBlock icon={Calendar} label="تاريخ الانتهاء" value={player.passportExpiryDate} />
              </div>
            </div>

            {/* حالة صلاحية الجواز */}
            {player.passportExpiryDate && (
              <div className="pt-1">
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

            {/* معاينة المستندات المرفوعة */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">معاينة المستندات الثبوتية المرفوعة</p>
              <div className="grid grid-cols-3 gap-2">
                {player.idCardImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'صورة الهوية (الوجه الأول)', src: player.idCardImage! })}
                    className="group p-1.5 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center"
                  >
                    <div className="w-full h-16 bg-slate-200 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                      <img src={player.idCardImage} alt="الهوية (وجه 1)" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[9px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1 truncate">
                      <Eye size={10} /> وجه 1
                    </span>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[9px] font-bold text-slate-400 flex flex-col items-center justify-center h-22">
                    لا توجد هوية 1
                  </div>
                )}

                {player.idCardBackImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'صورة الهوية (الوجه الثاني)', src: player.idCardBackImage! })}
                    className="group p-1.5 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center"
                  >
                    <div className="w-full h-16 bg-slate-200 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                      <img src={player.idCardBackImage} alt="الهوية (وجه 2)" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[9px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1 truncate">
                      <Eye size={10} /> وجه 2
                    </span>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[9px] font-bold text-slate-400 flex flex-col items-center justify-center h-22">
                    لا توجد هوية 2
                  </div>
                )}

                {player.passportImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({ title: 'صورة جواز السفر', src: player.passportImage! })}
                    className="group p-1.5 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all text-center flex flex-col items-center"
                  >
                    <div className="w-full h-16 bg-slate-200 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                      <img src={player.passportImage} alt="جواز السفر" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[9px] font-black text-slate-800 group-hover:text-orange-600 flex items-center gap-1 truncate">
                      <Eye size={10} /> الجواز
                    </span>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-[9px] font-bold text-slate-400 flex flex-col items-center justify-center h-22">
                    لا يوجد جواز
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* البند الثالث: المواصفات الفنية والبدنية وتتبع الوزن الذكي */}
      {/* ============================================================== */}
      <section className="space-y-6">
        <div className="border-r-4 border-emerald-600 pr-3">
          <h2 className="text-base md:text-lg font-black text-blue-950">
            البند الثالث: المواصفات الفنية والبدنية وتتبع قياسات الوزن
          </h2>
          <p className="text-[11px] font-bold text-slate-500">
            القياسات البدنية وتتبع الوزن عبر الأشهر مع التنبيه التلقائي للزيادة أو النقصان
          </p>
        </div>

        {player.role === 'لاعب' ? (
          <div className="modern-card p-6 md:p-8 border-r-8 border-emerald-600 bg-white space-y-6">
            <div>
              <SectionTitle icon={Activity} title="المواصفات الفنية والبدنية والتجهيزات" color="text-emerald-500" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                <InfoBlock icon={Target} label="المركز الأساسي" value={player.position} />
                <InfoBlock icon={Droplet} label="زمرة الدم" value={player.bloodType} color="text-red-600 font-black" />
                <InfoBlock icon={Footprints} label="القدم المفضلة" value={player.preferredFoot} color="text-orange-600 font-bold" />
                <InfoBlock icon={Footprints} label="قياس الحذاء" value={player.shoeSize} color="text-blue-700 font-black" />
                <InfoBlock icon={Shirt} label="قياس الملابس" value={player.clothesSize} color="text-indigo-700 font-black" />
                <InfoBlock icon={Ruler} label="الطول" value={player.height ? `${player.height} سم` : '---'} color="text-emerald-700" />
                <InfoBlock icon={Weight} label="الوزن الحالي" value={player.weight ? `${player.weight} كغ` : '---'} color="text-emerald-700 font-black" />
                <InfoBlock icon={CalendarCheck} label="تاريخ الانضمام" value={player.joinDate} />
                <InfoBlock icon={GraduationCap} label="الشهادة العلمية" value={player.academicDegree} />
                <InfoBlock icon={UserCheck} label="تصنيف اللاعب" value="لاعب نادي رسمي" color="text-blue-900 font-black" />
                {player.coachingCertificate && (
                  <InfoBlock icon={Award} label="الشهادة التدريبية" value={player.coachingCertificate} />
                )}
              </div>
            </div>

            {/* التجهيزات والاشتراكات */}
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

            {/* ============================================================== */}
            {/* نظام تتبع الوزن الذكي والرسم البياني والتنبيه التلقائي */}
            {/* ============================================================== */}
            <div className="pt-6 border-t-2 border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950 flex items-center gap-2">
                      تتبع سجل أوزان اللاعب عبر الأشهر
                      <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-md font-mono">
                        {weightHistory.length} قياسات
                      </span>
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500">
                      يتم حفظ الوزن مع كل قياس ورسم المنحنى البياني والتنبيه التلقائي لأي زيادة أو نقصان
                    </p>
                  </div>
                </div>

                {canEditPerson && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewWeightVal(player.weight || '');
                      setNewWeightDate(new Date().toISOString().split('T')[0]);
                      setNewWeightNote('');
                      setIsWeightModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-950 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm shrink-0"
                  >
                    <Plus size={15} /> تسجيل قياس وزن جديد
                  </button>
                )}
              </div>

              {/* بطاقة التنبيه التلقائي للوزن */}
              {weightAnalysis.hasHistory && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                  weightAnalysis.status === 'gain'
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : weightAnalysis.status === 'loss'
                      ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                      : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                    {weightAnalysis.status === 'gain' ? (
                      <AlertTriangle className="text-amber-600" size={20} />
                    ) : weightAnalysis.status === 'loss' ? (
                      <TrendingDown className="text-blue-600" size={20} />
                    ) : (
                      <CheckCircle2 className="text-emerald-600" size={20} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black block">
                      {weightAnalysis.status === 'gain' 
                        ? 'تنبيه مراقبة الوزن (زيادة ملحوظة)' 
                        : weightAnalysis.status === 'loss' 
                          ? 'تنبيه مراقبة الوزن (انخفاض ملحوظ)' 
                          : 'مؤشر الوزن البدني (مثالي ومستقر)'}
                    </span>
                    <p className="text-xs font-bold leading-relaxed">
                      {weightAnalysis.message}
                    </p>
                  </div>
                </div>
              )}

              {/* الرسم البياني لتطور الوزن عبر الأشهر */}
              {weightHistory.length > 0 && (
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <BarChart size={15} className="text-orange-500" />
                      منحنى تطور وزن اللاعب (كغ) عبر الأشهر والتواريخ
                    </h5>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      الوزن الحالي: {weightAnalysis.latestWeight} كغ
                    </span>
                  </div>

                  <div className="h-56 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightHistory} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                        <YAxis 
                          domain={['dataMin - 3', 'dataMax + 3']} 
                          tick={{ fontSize: 10, fill: '#64748B' }} 
                          axisLine={{ stroke: '#CBD5E1' }}
                          unit=" كغ" 
                        />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                          formatter={(value: any) => [`${value} كغ`, 'الوزن']}
                          labelFormatter={(label) => `التاريخ: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="#EA580C" 
                          strokeWidth={3} 
                          dot={{ r: 5, fill: '#EA580C', stroke: '#FFFFFF', strokeWidth: 2 }} 
                          activeDot={{ r: 7, fill: '#001F3F' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* جدول سجل القياسات بالتفصيل */}
              {weightHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">تاريخ القياس</th>
                        <th className="p-3 text-center">الوزن (كغ)</th>
                        <th className="p-3 text-center">الفارق عن القياس السابق</th>
                        <th className="p-3">ملاحظات</th>
                        {canEditPerson && <th className="p-3 text-center">إجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-900">
                      {weightHistory.map((w, idx) => {
                        const prevW = idx > 0 ? weightHistory[idx - 1].weight : null;
                        const diff = prevW !== null ? Number((w.weight - prevW).toFixed(1)) : null;
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-blue-950">{w.date}</td>
                            <td className="p-3 text-center font-mono font-black text-orange-600 text-sm">{w.weight} كغ</td>
                            <td className="p-3 text-center font-mono">
                              {diff === null ? (
                                <span className="text-slate-400 font-normal">نقطة البداية</span>
                              ) : diff > 0 ? (
                                <span className="text-amber-600 font-black flex items-center justify-center gap-0.5">
                                  <TrendingUp size={12} /> +{diff} كغ (زيادة)
                                </span>
                              ) : diff < 0 ? (
                                <span className="text-blue-600 font-black flex items-center justify-center gap-0.5">
                                  <TrendingDown size={12} /> {diff} كغ (نقصان)
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-black">مستقر (0 كغ)</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 text-[11px]">{w.note || 'قياس دوري'}</td>
                            {canEditPerson && (
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWeightEntry(w.date)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                                  title="حذف هذا القياس"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* بطاقة التوصيف الوظيفي للكادر */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-emerald-600 bg-white space-y-4">
              <SectionTitle icon={Activity} title="التوصيف الوظيفي للكادر في النادي" color="text-emerald-500" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <InfoBlock icon={Target} label="الدور الوظيفي" value={player.role} />
                <InfoBlock icon={UserCheck} label="الصفة والانتماء" value="كادر نادي رسمي" color="text-blue-900 font-black" />
                <InfoBlock icon={CalendarCheck} label="الفئة" value={player.category || 'غير محدد'} />
                <InfoBlock icon={CalendarCheck} label="تاريخ الانضمام" value={player.joinDate} />
                {player.academicDegree && (
                  <InfoBlock icon={GraduationCap} label="المؤهل العلمي" value={player.academicDegree} />
                )}
                {player.coachingCertificate && (
                  <InfoBlock icon={Award} label="الشهادة التدريبية الأساسية" value={player.coachingCertificate} color="text-emerald-700 font-bold" />
                )}
              </div>
            </div>

            {/* الشهادات التدريبية التخصصية ووثائقها المرفوعة */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-blue-600 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <SectionTitle icon={GraduationCap} title={"الشهادات التدريبية والتأهيلية (" + cadreCertificates.length + ")"} color="text-blue-600" />
                <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                  معتمدة في سجل النادي
                </span>
              </div>

              {cadreCertificates.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                  لم يتم إضافة شهادات تدريبية تخصصية للكادر بعد.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cadreCertificates.map((cert, cIdx) => (
                    <div key={cIdx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:border-blue-300 transition-all shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-sm text-blue-950 flex items-center gap-1.5">
                            <Award size={16} className="text-blue-600 shrink-0" />
                            {cert.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            الجهة المانحة: {cert.issuer || 'غير محدد'}
                          </p>
                        </div>
                        {cert.year && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono shrink-0">
                            سنة {cert.year}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                        {cert.image ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ title: "وثيقة شهادة " + cert.name, src: cert.image })}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Eye size={13} />
                              <span>معاينة وثيقة الشهادة</span>
                            </button>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              وثيقة مرفقة ✓
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold">لا توجد صورة للشهادة</span>
                        )}

                        {canEditPerson && (
                          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-orange-500 text-slate-700 hover:text-orange-600 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs">
                            <Upload size={13} />
                            <span>{cert.image ? 'تعديل الوثيقة' : 'رفع صورة الشهادة'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCertificateImageUpdate(cIdx, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* الخبرات التدريبية والمهنية السابقة */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-indigo-600 bg-white space-y-4">
              <SectionTitle icon={Briefcase} title={"الخبرات السابقة في الأندية والمؤسسات (" + cadreExperiences.length + ")"} color="text-indigo-600" />
              {cadreExperiences.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                  لم يتم إضافة سجل خبرات سابقة بعد.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cadreExperiences.map((exp, eIdx) => (
                    <div key={eIdx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-blue-950 flex items-center gap-1.5">
                          <Briefcase size={16} className="text-indigo-600" />
                          {exp.clubOrOrg}
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
                          {exp.fromYear} - {exp.toYear || 'حتى الآن'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">المسمى الوظيفي: {exp.role}</p>
                      {exp.achievements && (
                        <p className="text-[11px] font-medium text-slate-500 italic">
                          أبرز المهام والإنجازات: {exp.achievements}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* البند الرابع: التقييم الفني الشهري وملاحظات الكادر والأرشيف */}
      {/* ============================================================== */}
      <section className="space-y-6">
        <div className="border-r-4 border-blue-600 pr-3">
          <h2 className="text-base md:text-lg font-black text-blue-950">
            البند الرابع: التقييم الفني الشهري والملاحظات الفنية
          </h2>
          <p className="text-[11px] font-bold text-slate-500">
            ملاحظات وتقارير المدرب والكادر الفني الشهرية مع الأرشيف الزمني
          </p>
        </div>

        <div className="modern-card p-6 md:p-8 border-t-8 border-blue-600 bg-white shadow-sm space-y-6">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 print:hidden">
            {months.map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all border-2 shrink-0 ${selectedMonth === m ? 'bg-blue-900 border-blue-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-900'}`}>
                {m} {monthlyNotes[m] ? '✓' : ''}
              </button>
            ))}
          </div>
          <div className="space-y-4 print:hidden">
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-4 md:p-6 text-xs md:text-sm text-blue-950 h-36 md:h-44 resize-none outline-none focus:border-blue-900 transition-all font-medium leading-relaxed"
              placeholder={`اكتب الملاحظات والتقييم الفني لشهر ${selectedMonth}...`}
              value={monthlyNotes[selectedMonth] || ""}
              onChange={e => setMonthlyNotes({...monthlyNotes, [selectedMonth]: e.target.value})}
              readOnly={isViewer}
            ></textarea>
            {!isViewer && (
              <button onClick={handleSaveMonthlyReport} disabled={isSavingReport} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-0.5">
                {isSavingReport ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} 
                حفظ تقرير {selectedMonth}
              </button>
            )}
          </div>
          
          {sortedSavedReports.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="font-black text-sm text-blue-950 flex items-center gap-2">
                <History size={16} className="text-blue-600" /> أرشيف التقييمات الفنية المحفوظة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedSavedReports.map((report, idx) => (
                  <div key={idx} className="bg-slate-50 border-r-4 border-blue-600 p-4 rounded-xl border border-slate-200">
                    <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded text-[8px] font-black uppercase mb-1.5 inline-block">
                      {report.month}
                    </span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{report.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* البند الخامس: السجل المالي والتعاقدي (العقود الاحترافية) */}
      {/* ============================================================== */}
      {(Boolean(player.contractStart) || Boolean(player.contractEnd) || Boolean(player.contractValue) || Boolean(player.contractDuration)) && (
        <section className="space-y-4">
          <div className="border-r-4 border-amber-600 pr-3">
            <h2 className="text-base md:text-lg font-black text-blue-950">
              البند الخامس: السجل التعاقدي والمالي
            </h2>
          </div>
          <div className="modern-card p-6 md:p-8 border-r-8 border-amber-600 bg-amber-600/5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoBlock icon={Calendar} label="بداية العقد" value={player.contractStart} />
              <InfoBlock icon={Calendar} label="نهاية العقد" value={player.contractEnd} />
              <InfoBlock icon={CalendarCheck} label="مدة العقد" value={player.contractDuration} />
              <InfoBlock icon={DollarSign} label="قيمة العقد / الراتب" value={player.contractValue} color="text-amber-700 font-black" />
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* البند السادس: الحالة الطبية والانضباط */}
      {/* ============================================================== */}
      {player.role === 'لاعب' && (
        <section className="space-y-4">
          <div className="border-r-4 border-red-600 pr-3">
            <h2 className="text-base md:text-lg font-black text-blue-950">
              البند السادس: الحالة الطبية والانضباط
            </h2>
          </div>
          <div className="modern-card p-6 md:p-8 border-r-8 border-red-600 bg-red-600/5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><HeartPulse size={12}/> السجل الطبي</p>
                <div className="bg-white p-3 rounded-xl border border-red-100 min-h-[50px] text-xs font-medium text-red-950">
                  {player.medicalHistory || 'لا يوجد سجلات طبية.'}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> الإصابات الحالية</p>
                <div className="bg-white p-3 rounded-xl border border-red-100 min-h-[50px] text-xs font-medium text-red-950">
                  {player.injuries || 'لا توجد إصابات.'}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Gavel size={12}/> العقوبات السابقة</p>
                <div className="bg-white p-3 rounded-xl border border-red-100 min-h-[50px] text-xs font-medium text-red-950">
                  {player.penalties || 'سجل نظيف.'}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><StickyNote size={12}/> ملاحظات المدرب</p>
                <div className="bg-white p-3 rounded-xl border border-slate-200 min-h-[50px] text-xs font-medium text-slate-700">
                  {player.notes || 'لا توجد ملاحظات.'}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* نافذة معاينة المستندات المنبثقة */}
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

      {/* نافذة تسجيل قياس وزن جديد */}
      {isWeightModalOpen && (
        <div
          className="fixed inset-0 z-[180] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setIsWeightModalOpen(false)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-blue-950">تسجيل قياس وزن جديد</h3>
                  <p className="text-[10px] font-bold text-slate-500">للاعب: {player.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWeightEntry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">تاريخ القياس</label>
                <input
                  type="date"
                  required
                  value={newWeightDate}
                  onChange={(e) => setNewWeightDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">الوزن بالكيلوغرام (كغ)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="160"
                    required
                    placeholder="مثال: 60 أو 65.5"
                    value={newWeightVal}
                    onChange={(e) => setNewWeightVal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 pr-4 pl-12 text-base font-black text-blue-950 outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    كغ
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">ملاحظات القياس (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: فحص دوري، بعد المعسكر، زيادة عضلية..."
                  value={newWeightNote}
                  onChange={(e) => setNewWeightNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingWeight || !newWeightVal}
                  className="flex-1 bg-blue-950 hover:bg-orange-500 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  {isSavingWeight ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  حفظ وتحديث المنحنى
                </button>
                <button
                  type="button"
                  onClick={() => setIsWeightModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل بيانات العضو */}
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
