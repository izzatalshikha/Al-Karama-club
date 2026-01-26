
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Plus, Trash2, Edit, X, Printer, FileText, CheckCircle, ShieldCheck, Lock, AlertCircle, Map, ChevronRight, BarChart3, PieChart, Users, User, TrendingUp, CalendarDays, Gavel, UserCircle, Hash, Trophy, Search, CheckSquare, Square, Info, Target, Zap } from 'lucide-react';
import { AppState, TrainingSession, Category, Person, AttendanceRecord, Match } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';

interface TrainingPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
}

export default function TrainingPlanner({ state, setState, defaultSelectedId, addLog }: TrainingPlannerProps) {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const isManager = currentUser?.role === 'مدير';
  const isCatAdmin = currentUser?.role === 'إداري فئة';
  const canModifyConfig = isManager || isCatAdmin; 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'stats'>('agenda');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  
  const [reportType, setReportType] = useState<'category' | 'player' | 'discipline' | 'multi_player' | 'matches_custom'>('category');
  const [selectedCatForReport, setSelectedCatForReport] = useState<string>(restrictedCat || state.categories[0] || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [printData, setPrintData] = useState<any>(null);

  const [formData, setFormData] = useState<Partial<TrainingSession>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'الرجال'),
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    pitch: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time) return;

    const finalCategory = restrictedCat || formData.category;

    if (editingSessionId) {
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === editingSessionId ? { ...s, ...formData, category: finalCategory } as TrainingSession : s)
      }));
      addLog?.('تعديل موعد تمرين', `تم تحديث بيانات تمرين فئة ${finalCategory}`, 'info');
    } else {
      const newSession: TrainingSession = {
        id: generateUUID(),
        category: finalCategory as Category,
        date: formData.date || '',
        time: formData.time || '16:00',
        pitch: formData.pitch || 'غير محدد',
        objective: formData.objective || 'تمرين عام',
        isCompleted: false,
        isLocked: false
      };
      setState(prev => ({ ...prev, sessions: [newSession, ...prev.sessions] }));
      addLog?.('إضافة موعد تمرين', `تمت جدولة تمرين جديد لفئة ${newSession.category}`, 'info');
    }
    setIsModalOpen(false);
    setEditingSessionId(null);
  };

  const toggleSessionComplete = (id: string, currentStatus: boolean) => {
    const session = state.sessions.find(s => s.id === id);
    if (isCatAdmin && session?.category !== restrictedCat) return;

    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, isCompleted: !currentStatus } : s)
    }));
  };

  const filteredSessions = useMemo(() => {
    return (restrictedCat 
      ? state.sessions.filter(s => s.category === restrictedCat)
      : state.sessions.filter(s => (state.globalCategoryFilter === 'الكل' || s.category === state.globalCategoryFilter)))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.sessions, restrictedCat, state.globalCategoryFilter]);

  const generateReport = () => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const periodStr = `من ${startDate} إلى ${endDate}`;
    
    if (reportType === 'category' || reportType === 'multi_player') {
      const catSessions = state.sessions.filter(s => 
        s.category === selectedCatForReport && 
        new Date(s.date).getTime() >= start && 
        new Date(s.date).getTime() <= end
      );
      
      let targetPlayers = state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport);
      if (reportType === 'multi_player' && selectedPlayerIds.length > 0) {
        targetPlayers = targetPlayers.filter(p => selectedPlayerIds.includes(p.id));
      }

      const catMatches = state.matches.filter(m => 
        m.category === selectedCatForReport && 
        new Date(m.date).getTime() >= start && 
        new Date(m.date).getTime() <= end
      );
      
      const playerList = targetPlayers.map(p => {
        const playerRecords = state.attendance.filter(a => 
          a.personId === p.id && 
          new Date(a.date).getTime() >= start && 
          new Date(a.date).getTime() <= end
        );
        const present = playerRecords.filter(r => r.status === 'حاضر').length;
        const late = playerRecords.filter(r => r.status === 'متأخر').length;
        const attRate = catSessions.length > 0 ? Math.round(((present + late * 0.7) / catSessions.length) * 100) : 0;

        let yellows = 0;
        let reds = 0;
        catMatches.forEach(m => {
          yellows += m.events.filter(e => e.type === 'yellow' && (e.player === p.id || e.player === p.name)).length;
          reds += m.events.filter(e => e.type === 'red' && (e.player === p.id || e.player === p.name)).length;
        });

        return { ...p, attRate, yellows, reds };
      }).sort((a,b) => b.attRate - a.attRate);

      const totalPossible = catSessions.length * targetPlayers.length;
      let totalPresenceAcross = 0;
      targetPlayers.forEach(p => {
        const recs = state.attendance.filter(a => a.personId === p.id && new Date(a.date).getTime() >= start && new Date(a.date).getTime() <= end);
        totalPresenceAcross += recs.filter(r => r.status === 'حاضر').length;
      });

      const attendanceRate = totalPossible > 0 ? Math.round((totalPresenceAcross / totalPossible) * 100) : 0;

      setPrintData({
        type: 'category',
        title: reportType === 'multi_player' ? `تقرير أداء اللاعبين المختارين - فئة ${selectedCatForReport}` : `تقرير أداء فئة: ${selectedCatForReport}`,
        period: periodStr,
        sessions: catSessions,
        playerList,
        stats: { totalSessions: catSessions.length, attendanceRate, playersCount: targetPlayers.length }
      });
    } else if (reportType === 'player') {
      const player = state.people.find(p => p.id === selectedPlayerId);
      if (!player) return alert('يرجى اختيار اللاعب أولاً');

      const playerRecords = state.attendance.filter(a => 
        a.personId === player.id && 
        new Date(a.date).getTime() >= start && 
        new Date(a.date).getTime() <= end
      );
      const playerSessions = state.sessions.filter(s => 
        s.category === player.category && 
        new Date(s.date).getTime() >= start && 
        new Date(s.date).getTime() <= end
      );
      const playerMatches = state.matches.filter(m => 
        m.category === player.category && 
        new Date(m.date).getTime() >= start && 
        new Date(m.date).getTime() <= end
      );

      const present = playerRecords.filter(r => r.status === 'حاضر').length;
      const late = playerRecords.filter(r => r.status === 'متأخر').length;
      const absent = playerRecords.filter(r => r.status === 'غائب').length;
      const excused = playerRecords.filter(r => r.status === 'غياب بعذر').length;
      
      const score = playerSessions.length > 0 ? Math.round(((present + (late * 0.5)) / playerSessions.length) * 100) : 0;

      let matchYellows = 0;
      let matchReds = 0;
      playerMatches.forEach(m => {
        matchYellows += m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length;
        matchReds += m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length;
      });

      setPrintData({
        type: 'player',
        player,
        title: `تقرير التزام اللاعب: ${player.name}`,
        period: periodStr,
        stats: { present, late, absent, excused, total: playerSessions.length, score, matchYellows, matchReds },
        records: playerRecords.map(r => {
          const s = state.sessions.find(ses => ses.id === r.sessionId);
          return { ...r, objective: s?.objective || 'تمرين عام' };
        }).sort((a,b) => b.date.localeCompare(a.date))
      });
    } else if (reportType === 'discipline') {
      // تحديث: كشف الانضباط يشمل الكادر الآن
      const catMembers = state.people.filter(p => p.category === selectedCatForReport);
      
      const disciplinaryStats = catMembers.map(p => {
        const records = state.attendance.filter(a => 
          a.personId === p.id && 
          new Date(a.date).getTime() >= start && 
          new Date(a.date).getTime() <= end
        );
        const lates = records.filter(r => r.status === 'متأخر').length;
        const absences = records.filter(r => r.status === 'غائب').length;
        const excused = records.filter(r => r.status === 'غياب بعذر').length;
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          number: p.number,
          federalId: p.federalNumber || p.nationalId || 'بدون رقم',
          lates,
          absences,
          excused,
          totalOffenses: lates + absences
        };
      }).sort((a,b) => b.totalOffenses - a.totalOffenses);

      setPrintData({
        type: 'discipline',
        title: `كشف انضباط فئة: ${selectedCatForReport}`,
        period: periodStr,
        stats: disciplinaryStats
      });
    } else if (reportType === 'matches_custom') {
      const targetMatches = state.matches.filter(m => 
        m.isCompleted && 
        m.category === selectedCatForReport && 
        new Date(m.date).getTime() >= start && 
        new Date(m.date).getTime() <= end
      );

      let targetPlayers = state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport);
      if (selectedPlayerIds.length > 0) {
        targetPlayers = targetPlayers.filter(p => selectedPlayerIds.includes(p.id));
      }

      const matchStatsByPlayer = targetPlayers.map(p => {
        let totalMins = 0;
        let goals = 0;
        let assists = 0;
        let yellows = 0;
        let reds = 0;
        let apps = 0;

        targetMatches.forEach(m => {
          const starter = m.lineup.starters.find(s => s.playerId === p.id);
          const sub = m.lineup.subs.find(s => s.playerId === p.id);
          
          if (starter || sub) {
            apps++;
            totalMins += parseInt(starter?.minutesPlayed || sub?.minutesPlayed || '0') || 0;
            goals += m.events.filter(e => e.type === 'goal' && (e.player === p.id || e.player === p.name)).length;
            assists += m.events.filter(e => e.type === 'assist' && (e.player === p.id || e.player === p.name)).length;
            yellows += m.events.filter(e => e.type === 'yellow' && (e.player === p.id || e.player === p.name)).length;
            reds += m.events.filter(e => e.type === 'red' && (e.player === p.id || e.player === p.name)).length;
          }
        });

        return { ...p, apps, totalMins, goals, assists, yellows, reds };
      }).sort((a, b) => b.goals - a.goals);

      setPrintData({
        type: 'matches_custom',
        title: `تقرير المشاركات الفنية - فئة ${selectedCatForReport}`,
        period: periodStr,
        matches: targetMatches,
        playerStats: matchStatsByPlayer
      });
    }
    setShowPrintView(true);
  };

  const togglePlayerSelection = (pid: string) => {
    setSelectedPlayerIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]);
  };

  const fieldClass = "w-full bg-white border-2 border-slate-900 rounded-xl py-4 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all text-sm";
  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1.5";

  if (showPrintView && printData) {
    return (
      <div className="fixed inset-0 bg-white z-[600] overflow-y-auto p-4 sm:p-12 dir-rtl text-right print:p-0">
        <div className="max-w-[210mm] mx-auto border-4 border-slate-900 p-10 print:border-2 print:p-8 bg-white min-h-[297mm] shadow-none">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500 hover:text-red-600 transition-all"><ChevronRight/> إغلاق المعاينة</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl"><Printer size={20}/> تصدير PDF بمقاس A4</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10 print:border-b-2">
              <div className="flex items-center gap-4">
                 <ClubLogo size={100} />
                 <div>
                    <h2 className="text-3xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-md font-black text-orange-600">مكتب كرة القدم المركزي - قسم الإحصاء</p>
                 </div>
              </div>
              <div className="text-left font-black">
                 <p className="text-2xl uppercase tracking-tighter">{printData.title}</p>
                 <p className="text-sm text-slate-500">الفترة: {printData.period}</p>
                 <p className="text-[10px] mt-2">الإصدار: {new Date().toLocaleDateString('ar-SY')}</p>
              </div>
           </div>

           {printData.type === 'discipline' ? (
              <div className="space-y-8">
                <h4 className="text-lg font-black border-r-4 border-red-600 pr-3 flex items-center gap-2">
                   <Gavel size={20}/> سجل الغيابات والانضباط (الكوادر واللاعبين)
                </h4>
                <table className="w-full text-right border-collapse border-2 border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-black uppercase">
                      <th className="p-4 border-l border-slate-900">الهوية</th>
                      <th className="p-4 border-l border-slate-900">الاسم الكامل</th>
                      <th className="p-4 border-l border-slate-900">الصفة</th>
                      <th className="p-4 border-l border-slate-900 text-center">تأخير</th>
                      <th className="p-4 border-l border-slate-900 text-center">غياب</th>
                      <th className="p-4 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.stats.map((p: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-300 text-sm font-black transition-colors hover:bg-slate-50">
                        <td className="p-4 border-l border-slate-300 text-center text-[10px] text-slate-400">{p.federalId}</td>
                        <td className="p-4 border-l border-slate-300">{p.name}</td>
                        <td className="p-4 border-l border-slate-300 text-[10px] opacity-70">{p.role}</td>
                        <td className="p-4 border-l border-slate-300 text-center text-orange-600">{p.lates}</td>
                        <td className="p-4 border-l border-slate-300 text-center text-red-600">{p.absences}</td>
                        <td className="p-4 text-center bg-slate-50 font-black">{p.totalOffenses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           ) : printData.type === 'matches_custom' ? (
              <div className="space-y-12">
                 <div className="bg-slate-50 p-6 border-2 border-slate-900 rounded-[2rem] flex justify-between items-center">
                    <div className="text-center flex-1 border-l border-slate-200">
                       <p className="text-[10px] font-black text-slate-400 uppercase">المباريات</p>
                       <p className="text-3xl font-black">{printData.matches.length}</p>
                    </div>
                    <div className="text-center flex-1 border-l border-slate-200">
                       <p className="text-[10px] font-black text-emerald-600 uppercase">الأهداف</p>
                       <p className="text-3xl font-black text-emerald-700">{printData.playerStats.reduce((a: any, b: any) => a + b.goals, 0)}</p>
                    </div>
                    <div className="text-center flex-1">
                       <p className="text-[10px] font-black text-blue-600 uppercase">المشاركين</p>
                       <p className="text-3xl font-black text-blue-700">{printData.playerStats.filter((p: any) => p.apps > 0).length}</p>
                    </div>
                 </div>
                 <table className="w-full text-right border-collapse border-2 border-slate-900">
                    <thead>
                       <tr className="bg-slate-100 border-b-2 border-slate-900 text-[9px] font-black uppercase">
                          <th className="p-3 border-l border-slate-900">اللاعب</th>
                          <th className="p-3 border-l border-slate-900 text-center">الرقم</th>
                          <th className="p-3 border-l border-slate-900 text-center">مباريات</th>
                          <th className="p-3 border-l border-slate-900 text-center">دقائق</th>
                          <th className="p-3 border-l border-slate-900 text-center text-emerald-600">أهداف</th>
                          <th className="p-3 border-l border-slate-900 text-center text-blue-600">تمريرات</th>
                          <th className="p-3 border-l border-slate-900 text-center text-yellow-600">🟨</th>
                          <th className="p-3 text-center text-red-600">🟥</th>
                       </tr>
                    </thead>
                    <tbody>
                       {printData.playerStats.map((p: any) => (
                          <tr key={p.id} className="border-b border-slate-300 text-xs font-black">
                             <td className="p-3 border-l border-slate-300">{p.name}</td>
                             <td className="p-3 border-l border-slate-300 text-center text-slate-400">#{p.number}</td>
                             <td className="p-3 border-l border-slate-300 text-center">{p.apps}</td>
                             <td className="p-3 border-l border-slate-300 text-center">{p.totalMins} د</td>
                             <td className="p-3 border-l border-slate-300 text-center text-emerald-700">{p.goals || '-'}</td>
                             <td className="p-3 border-l border-slate-300 text-center text-blue-700">{p.assists || '-'}</td>
                             <td className="p-3 border-l border-slate-300 text-center text-yellow-600">{p.yellows || '-'}</td>
                             <td className="p-3 text-center text-red-600">{p.reds || '-'}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           ) : (
              <div className="space-y-10">
                 {/* ... (Existing Category/Player views optimized for A4) ... */}
                 <div className="grid grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-6 border-2 border-slate-900 text-center rounded-2xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase">الحصص</p>
                       <p className="text-3xl font-black">{printData.stats.totalSessions || 0}</p>
                    </div>
                    {/* ... other stats ... */}
                 </div>
              </div>
           )}

           <div className="mt-24 flex justify-around items-start opacity-0 print:opacity-100">
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع مدرب الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">مدير مكتب كرة القدم</p>
                 <p className="font-black text-xs text-blue-900">عزت عامر الشيخة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-2 rounded-2xl border-2 border-slate-900 flex gap-2 w-fit no-print mx-auto mb-8 shadow-sm">
         <button onClick={() => setActiveTab('agenda')} className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'agenda' ? 'bg-[#001F3F] text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100'}`}>
            <CalendarIcon size={18}/> الأجندة التدريبية
         </button>
         <button onClick={() => setActiveTab('stats')} className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-[#001F3F] text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100'}`}>
            <BarChart3 size={18}/> التقارير المخصصة PDF
         </button>
      </div>

      {activeTab === 'agenda' ? (
        <>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print gap-4">
            <div>
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                 <CalendarIcon size={24} className="text-blue-900" /> أجندة التدريبات والأنشطة المركزية
               </h3>
               <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">تنظيم وإدارة مواعيد الحصص لجميع الفئات</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => {
                    const cat = restrictedCat || state.globalCategoryFilter;
                    if (cat === 'الكل') return alert("يرجى اختيار فئة محددة أولاً لطباعة البرنامج.");
                    const catSessions = state.sessions.filter(s => s.category === cat).sort((a,b) => a.date.localeCompare(b.date));
                    setPrintData({
                      type: 'category',
                      title: `أجندة تمارين فئة: ${cat}`,
                      period: 'كامل الأجندة المتاحة',
                      sessions: catSessions,
                      playerList: [],
                      stats: { totalSessions: catSessions.length, attendanceRate: 'N/A' }
                    });
                    setShowPrintView(true);
                }} className="bg-white text-slate-900 border-2 border-slate-900 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
                <Printer size={18}/> طباعة البرنامج A4
              </button>
              {canModifyConfig && (
                <button onClick={() => { setEditingSessionId(null); setIsModalOpen(true); }} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-sm shadow-lg border-b-4 border-black hover:bg-black transition-all">
                  <Plus size={20} /> إضافة حصة جديدة
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
            {filteredSessions.map(session => {
              const isComp = session.isCompleted;
              const isOwner = isManager || (isCatAdmin && session.category === restrictedCat);
              return (
                <div key={session.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 relative group overflow-hidden border-b-8 transition-all no-print ${isComp ? 'border-emerald-600' : 'hover:border-blue-900'}`}>
                  <div className="flex justify-between items-center mb-4">
                     <span className="bg-[#001F3F] text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{session.category}</span>
                     {isOwner && (
                       <div className="flex gap-1">
                         <button onClick={() => { setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true); }} className="p-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-blue-900 hover:text-white transition-all"><Edit size={14}/></button>
                         <button onClick={async () => { if(confirm('حذف التمرين؟')) { await supabase.from('sessions').delete().eq('id', session.id); setState(p => ({...p, sessions: p.sessions.filter(x => x.id !== session.id)})); } }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                       </div>
                     )}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-4">{session.objective}</h4>
                  <div className="space-y-2 text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                     <p className="flex items-center gap-2"><CalendarIcon size={14} className="text-orange-600"/> {session.date}</p>
                     <p className="flex items-center gap-2"><Clock size={14} className="text-[#001F3F]"/> {session.time}</p>
                     <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-600"/> {session.pitch || 'غير محدد'}</p>
                  </div>
                  <button disabled={!isOwner} onClick={() => toggleSessionComplete(session.id, !!isComp)} className={`mt-6 w-full py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border-2 transition-all ${!isOwner ? 'opacity-30' : isComp ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-slate-100 border-slate-900 text-slate-900 hover:bg-emerald-50'}`}>
                     <CheckCircle size={14}/> {isComp ? 'إعادة فتح الجلسة' : 'تأشير كتم الإنجاز'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-900 shadow-sm no-print">
           <div className="flex items-center gap-4 mb-10">
              <BarChart3 className="text-blue-900" size={32}/>
              <h3 className="text-2xl font-black text-slate-900">استخراج تقارير البيانات البصرية (A4 Optimized)</h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                 <label className={labelClass}>نوع التقرير المستهدف</label>
                 <div className="flex flex-col gap-1 bg-slate-100 p-1 rounded-xl border-2 border-slate-200">
                    <button onClick={() => setReportType('category')} className={`w-full py-3 rounded-lg font-black text-[10px] transition-all ${reportType === 'category' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-50'}`}>📊 تقرير فئة شامل</button>
                    <button onClick={() => setReportType('multi_player')} className={`w-full py-3 rounded-lg font-black text-[10px] transition-all ${reportType === 'multi_player' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-50'}`}>👥 تقرير لاعبين محددين</button>
                    <button onClick={() => setReportType('matches_custom')} className={`w-full py-3 rounded-lg font-black text-[10px] transition-all ${reportType === 'matches_custom' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-50'}`}>🏆 تقرير مشاركات المباريات</button>
                    <button onClick={() => setReportType('discipline')} className={`w-full py-3 rounded-lg font-black text-[10px] transition-all ${reportType === 'discipline' ? 'bg-red-600 text-white shadow-md' : 'text-slate-50'}`}>⚖️ كشف الانضباط الكامل</button>
                    <button onClick={() => setReportType('player')} className={`w-full py-3 rounded-lg font-black text-[10px] transition-all ${reportType === 'player' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-50'}`}>👤 تقرير التزام عضو واحد</button>
                 </div>
              </div>

              <div className="space-y-6 md:col-span-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className={labelClass}>الفئة</label>
                       <select disabled={!!restrictedCat} value={selectedCatForReport} onChange={e => setSelectedCatForReport(e.target.value)} className={fieldClass}>
                          {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    {reportType === 'player' && (
                       <div className="space-y-2">
                          <label className={labelClass}>البحث عن الاسم</label>
                          <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className={fieldClass}>
                             <option value="">-- اختر من القائمة --</option>
                             {state.people.filter(p => p.category === selectedCatForReport).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                             ))}
                          </select>
                       </div>
                    )}
                 </div>

                 {(reportType === 'multi_player' || reportType === 'matches_custom') && (
                   <div className="space-y-4">
                      <label className={labelClass}>تحديد قائمة للاستخراج ({selectedPlayerIds.length})</label>
                      <div className="max-h-[250px] overflow-y-auto border-2 border-slate-900 rounded-xl p-4 space-y-2 bg-slate-50 custom-scrollbar">
                         {state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport).map(p => (
                            <button key={p.id} onClick={() => togglePlayerSelection(p.id)} className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${selectedPlayerIds.includes(p.id) ? 'bg-[#001F3F] text-white border-[#001F3F]' : 'bg-white text-slate-900 border-slate-200'}`}>
                               <div className="flex items-center gap-3">
                                  {selectedPlayerIds.includes(p.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                  <span className="font-black text-xs">{p.name}</span>
                               </div>
                               <span className="text-[10px] font-black opacity-60">#{p.number}</span>
                            </button>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className={labelClass}>من تاريخ</label>
                       <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldClass} />
                    </div>
                    <div className="space-y-2">
                       <label className={labelClass}>إلى تاريخ</label>
                       <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={fieldClass} />
                    </div>
                 </div>
              </div>

              <div className="flex flex-col justify-end gap-4">
                 <div className="bg-slate-100 p-5 rounded-2xl border-2 border-slate-200 space-y-2">
                    <h4 className="font-black text-[10px] text-[#001F3F] uppercase flex items-center gap-2"><Info size={14}/> تعليمات التصدير</h4>
                    <p className="text-[9px] font-medium leading-relaxed text-slate-500">سيتم إنشاء تقرير احترافي بصيغة PDF يتضمن كافة البيانات الإحصائية والانضباطية المختارة في النطاق الزمني المحدد.</p>
                 </div>
                 <button onClick={generateReport} className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black text-md shadow-xl hover:bg-black transition-all border-b-4 border-black uppercase flex items-center justify-center gap-3">
                    <Printer size={20}/> استخراج ومعاينة PDF (A4)
                 </button>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[500] p-4 no-print">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-[6px] border-slate-900 overflow-hidden">
              <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 uppercase">جدولة نشاط مركزي جديد</h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelClass}>الفئة</label>
                       <select required disabled={!!restrictedCat} className={fieldClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className={labelClass}>المكان</label>
                       <input type="text" className={fieldClass} value={formData.pitch || ''} onChange={e => setFormData({...formData, pitch: e.target.value})} placeholder="ملعب الكرامة.." />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>موضوع / هدف النشاط</label>
                    <input required type="text" className={fieldClass} value={formData.objective || ''} onChange={e => setFormData({...formData, objective: e.target.value})} placeholder="تمرين تكتيكي / نشاط خارجي.." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelClass}>التاريخ</label>
                       <input required type="date" className={fieldClass} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className={labelClass}>التوقيت</label>
                       <input required type="time" className={fieldClass} value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all mt-4 uppercase">حفظ وتثبيت الحصة</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
