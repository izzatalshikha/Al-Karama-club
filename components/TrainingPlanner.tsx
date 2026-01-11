
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Plus, Trash2, Edit, X, Printer, FileText, CheckCircle, ShieldCheck, Lock, AlertCircle, Map, ChevronRight, BarChart3, PieChart, Users, User, TrendingUp, CalendarDays } from 'lucide-react';
import { AppState, TrainingSession, Category, Person, AttendanceRecord } from '../types';
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
  
  // Strict Role Control: Only Manager ('مدير') can add/edit/delete
  const isManager = currentUser?.role === 'مدير';
  const canModifyConfig = isManager; 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'stats'>('agenda');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  
  // States for Stats
  const [reportType, setReportType] = useState<'category' | 'player'>('category');
  const [selectedCatForReport, setSelectedCatForReport] = useState<string>(restrictedCat || state.categories[0] || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<{ month: string, year: string }>({
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    year: new Date().getFullYear().toString()
  });
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

    // Time validation: Prevent past dates/times
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (!editingSessionId && selectedDateTime < now) {
      alert("تنبيه: لا يمكن جدولة تمرين في تاريخ أو وقت سابق للوقت الحالي.");
      return;
    }

    if (editingSessionId) {
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === editingSessionId ? { ...s, ...formData } as TrainingSession : s)
      }));
      addLog?.('تعديل موعد تمرين', `تم تحديث بيانات تمرين فئة ${formData.category}`, 'info');
    } else {
      const newSession: TrainingSession = {
        id: generateUUID(),
        category: formData.category as Category,
        date: formData.date || '',
        time: formData.time || '16:00',
        pitch: formData.pitch || 'غير محدد',
        objective: formData.objective || 'تمرين عام',
        isCompleted: false
      };
      setState(prev => ({ ...prev, sessions: [newSession, ...prev.sessions] }));
      addLog?.('إضافة موعد تمرين', `تمت جدولة تمرين جديد لفئة ${newSession.category}`, 'info');
    }
    setIsModalOpen(false);
    setEditingSessionId(null);
  };

  const toggleSessionComplete = (id: string, currentStatus: boolean) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === id ? { ...s, isCompleted: !currentStatus } : s)
    }));
    addLog?.('تحديث حالة تمرين', currentStatus ? 'تم إعادة فتح التمرين' : 'تم تأشير التمرين كمنتهي', 'info');
  };

  const filteredSessions = useMemo(() => {
    return (restrictedCat 
      ? state.sessions.filter(s => s.category === restrictedCat)
      : state.sessions.filter(s => (state.globalCategoryFilter === 'الكل' || s.category === state.globalCategoryFilter)))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.sessions, restrictedCat, state.globalCategoryFilter]);

  // Check if session is older than 30 minutes for locking UI
  const isSessionLocked = (session: TrainingSession) => {
    const sessionTime = new Date(`${session.date}T${session.time}`);
    const now = new Date();
    const diffInMinutes = (now.getTime() - sessionTime.getTime()) / (1000 * 60);
    return diffInMinutes > 30;
  };

  // --- STATS COMPUTATION LOGIC ---
  const generateReport = () => {
    const isCategory = reportType === 'category';
    const period = `${reportPeriod.year}-${reportPeriod.month}`;
    
    if (isCategory) {
      const catSessions = state.sessions.filter(s => s.category === selectedCatForReport && s.date.startsWith(period));
      const catPlayers = state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport);
      
      let totalPresence = 0;
      let totalLates = 0;
      let totalAbsence = 0;
      let totalExcused = 0;

      catSessions.forEach(s => {
        const records = state.attendance.filter(a => a.sessionId === s.id);
        totalPresence += records.filter(r => r.status === 'حاضر').length;
        totalLates += records.filter(r => r.status === 'متأخر').length;
        totalAbsence += records.filter(r => r.status === 'غائب').length;
        totalExcused += records.filter(r => r.status === 'غياب بعذر').length;
      });

      const totalPossible = catSessions.length * catPlayers.length;
      const attendanceRate = totalPossible > 0 ? Math.round((totalPresence / totalPossible) * 100) : 0;

      setPrintData({
        type: 'category',
        title: `تقرير أداء فئة: ${selectedCatForReport}`,
        period: `${reportPeriod.month} / ${reportPeriod.year}`,
        sessions: catSessions,
        stats: { totalSessions: catSessions.length, attendanceRate, totalPresence, totalLates, totalAbsence, totalExcused, playersCount: catPlayers.length }
      });
    } else {
      const player = state.people.find(p => p.id === selectedPlayerId);
      if (!player) return alert('يرجى اختيار اللاعب أولاً');

      const playerRecords = state.attendance.filter(a => a.personId === player.id && a.date.startsWith(period));
      const playerSessions = state.sessions.filter(s => s.category === player.category && s.date.startsWith(period));

      const present = playerRecords.filter(r => r.status === 'حاضر').length;
      const late = playerRecords.filter(r => r.status === 'متأخر').length;
      const absent = playerRecords.filter(r => r.status === 'غائب').length;
      const excused = playerRecords.filter(r => r.status === 'غياب بعذر').length;
      
      const score = playerSessions.length > 0 ? Math.round(((present + (late * 0.5)) / playerSessions.length) * 100) : 0;

      setPrintData({
        type: 'player',
        player,
        title: `تقرير التزام اللاعب: ${player.name}`,
        period: `${reportPeriod.month} / ${reportPeriod.year}`,
        stats: { present, late, absent, excused, total: playerSessions.length, score },
        records: playerRecords.map(r => {
          const s = state.sessions.find(ses => ses.id === r.sessionId);
          return { ...r, objective: s?.objective || 'تمرين عام' };
        })
      });
    }
    setShowPrintView(true);
  };

  const fieldClass = "w-full bg-white border-2 border-slate-900 rounded-xl py-4 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all text-sm";
  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1.5";

  // --- PRINT VIEW MODAL ---
  if (showPrintView && printData) {
    return (
      <div className="fixed inset-0 bg-white z-[600] overflow-y-auto p-12 dir-rtl text-right">
        <div className="max-w-5xl mx-auto border-4 border-slate-900 p-12 print:border-2">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500 hover:text-red-600 transition-all"><ChevronRight/> إغلاق المعاينة</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl"><Printer size={20}/> طباعة التقرير الفني PDF</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10">
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
                 <p className="text-[10px] mt-2">تاريخ الإصدار: {new Date().toLocaleString('ar-SY')}</p>
              </div>
           </div>

           {printData.type === 'category' ? (
              <div className="space-y-10">
                 <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-6 border-2 border-slate-900 text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي الحصص</p>
                       <p className="text-3xl font-black">{printData.stats.totalSessions}</p>
                    </div>
                    <div className="bg-emerald-50 p-6 border-2 border-emerald-900 text-center">
                       <p className="text-[10px] font-black text-emerald-600 uppercase">معدل الحضور</p>
                       <p className="text-3xl font-black text-emerald-700">%{printData.stats.attendanceRate}</p>
                    </div>
                    <div className="bg-orange-50 p-6 border-2 border-orange-900 text-center">
                       <p className="text-[10px] font-black text-orange-600 uppercase">حالات التأخير</p>
                       <p className="text-3xl font-black text-orange-700">{printData.stats.totalLates}</p>
                    </div>
                    <div className="bg-red-50 p-6 border-2 border-red-900 text-center">
                       <p className="text-[10px] font-black text-red-600 uppercase">حالات الغياب</p>
                       <p className="text-3xl font-black text-red-700">{printData.stats.totalAbsence}</p>
                    </div>
                 </div>

                 <h4 className="text-lg font-black border-r-4 border-blue-900 pr-3">سجل التدريبات خلال الفترة</h4>
                 <table className="w-full text-right border-collapse">
                    <thead>
                       <tr className="bg-slate-100 border-y-2 border-slate-900 text-xs font-black">
                          <th className="p-4 border-l border-slate-200">التاريخ</th>
                          <th className="p-4 border-l border-slate-200">موضوع التمرين</th>
                          <th className="p-4 border-l border-slate-200 text-center">حاضر</th>
                          <th className="p-4 text-center">غائب</th>
                       </tr>
                    </thead>
                    <tbody>
                       {printData.sessions.map((s: any) => {
                          const att = state.attendance.filter(a => a.sessionId === s.id);
                          return (
                             <tr key={s.id} className="border-b border-slate-200 text-sm font-black">
                                <td className="p-4 border-l border-slate-200">{s.date}</td>
                                <td className="p-4 border-l border-slate-200 text-xs">{s.objective}</td>
                                <td className="p-4 border-l border-slate-200 text-center text-emerald-600">{att.filter(r => r.status === 'حاضر').length}</td>
                                <td className="p-4 text-center text-red-600">{att.filter(r => r.status === 'غائب').length}</td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           ) : (
              <div className="space-y-10">
                 <div className="flex items-center gap-8 bg-slate-50 p-8 border-4 border-slate-900 rounded-[2rem]">
                    <div className="w-32 h-32 bg-white border-4 border-slate-900 rounded-3xl flex items-center justify-center font-black text-5xl text-[#001F3F] shadow-lg">
                       {printData.player.name.charAt(0)}
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-3xl font-black text-slate-900">{printData.player.name}</h3>
                       <p className="text-md font-black text-blue-900">المركز: {printData.player.role} | الفئة: {printData.player.category}</p>
                       <div className="flex items-center gap-4 mt-4">
                          <span className="bg-emerald-600 text-white px-4 py-1 rounded-lg text-xs font-black shadow-md">درجة الالتزام: {printData.stats.score}%</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 border-2 border-slate-200">
                       <p className="text-[10px] font-black text-slate-400">حاضر</p>
                       <p className="text-2xl font-black">{printData.stats.present}</p>
                    </div>
                    <div className="text-center p-4 border-2 border-slate-200">
                       <p className="text-[10px] font-black text-slate-400">متأخر</p>
                       <p className="text-2xl font-black text-orange-600">{printData.stats.late}</p>
                    </div>
                    <div className="text-center p-4 border-2 border-slate-200">
                       <p className="text-[10px] font-black text-slate-400">غياب بعذر</p>
                       <p className="text-2xl font-black text-blue-600">{printData.stats.excused}</p>
                    </div>
                    <div className="text-center p-4 border-2 border-slate-200">
                       <p className="text-[10px] font-black text-slate-400">غائب</p>
                       <p className="text-2xl font-black text-red-600">{printData.stats.absent}</p>
                    </div>
                 </div>

                 <table className="w-full text-right border-collapse">
                    <thead>
                       <tr className="bg-slate-100 border-y-2 border-slate-900 text-xs font-black">
                          <th className="p-4 border-l border-slate-200">التاريخ</th>
                          <th className="p-4 border-l border-slate-200">التمرين</th>
                          <th className="p-4 border-l border-slate-200 text-center">الحالة</th>
                          <th className="p-4">ملاحظات العذر</th>
                       </tr>
                    </thead>
                    <tbody>
                       {printData.records.map((r: any) => (
                          <tr key={r.id} className="border-b border-slate-200 text-sm font-black">
                             <td className="p-4 border-l border-slate-200">{r.date}</td>
                             <td className="p-4 border-l border-slate-200 text-xs">{r.objective}</td>
                             <td className="p-4 border-l border-slate-200 text-center">
                                <span className={r.status === 'حاضر' ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span>
                             </td>
                             <td className="p-4 text-[10px] italic text-slate-500">{r.excuse || '--'}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
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
      {/* Tab Switcher */}
      <div className="bg-white p-2 rounded-2xl border-2 border-slate-900 flex gap-2 w-fit no-print mx-auto mb-8 shadow-sm">
         <button 
           onClick={() => setActiveTab('agenda')}
           className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'agenda' ? 'bg-[#001F3F] text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100'}`}
         >
            <CalendarIcon size={18}/> الأجندة التدريبية
         </button>
         <button 
           onClick={() => setActiveTab('stats')}
           className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-[#001F3F] text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100'}`}
         >
            <BarChart3 size={18}/> التقارير والإحصائيات
         </button>
      </div>

      {activeTab === 'agenda' ? (
        <>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print gap-4">
            <div>
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                 <CalendarIcon size={24} className="text-blue-900" /> أجندة التدريبات المركزية (الجدولة)
               </h3>
               <p className="text-[10px] font-black text-slate-400 mt-1">تنظيم مواعيد التدريب لجميع الفئات - ميزة التعديل محصورة بمدير المكتب</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                    if (state.globalCategoryFilter === 'الكل') return alert("يرجى اختيار فئة محددة أولاً لطباعة البرنامج.");
                    const catSessions = state.sessions.filter(s => s.category === state.globalCategoryFilter).sort((a,b) => a.date.localeCompare(b.date));
                    setPrintData({
                      type: 'category',
                      title: `أجندة تمارين فئة: ${state.globalCategoryFilter}`,
                      period: 'كامل الأجندة المتاحة',
                      sessions: catSessions,
                      stats: { totalSessions: catSessions.length, attendanceRate: 'N/A', totalPresence: 'N/A', totalLates: 'N/A', totalAbsence: 'N/A', totalExcused: 'N/A' }
                    });
                    setShowPrintView(true);
                }} 
                className="bg-white text-slate-900 border-2 border-slate-900 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
              >
                <Printer size={18}/> طباعة البرنامج
              </button>
              {canModifyConfig && (
                <button onClick={() => { setEditingSessionId(null); setIsModalOpen(true); }}
                  className="bg-[#001F3F] text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black text-sm shadow-lg border-b-4 border-black hover:bg-black transition-all">
                  <Plus size={20} /> إضافة حصة تدريبية جديدة
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
            {filteredSessions.map(session => {
              const locked = isSessionLocked(session);
              const isComp = session.isCompleted;
              return (
                <div key={session.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 relative group overflow-hidden border-b-8 transition-all no-print ${locked ? 'border-slate-300 opacity-80' : isComp ? 'border-emerald-600' : 'hover:border-blue-900'}`}>
                  <div className="flex justify-between items-center mb-4">
                     <span className="bg-[#001F3F] text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{session.category}</span>
                     <div className="flex gap-1">
                        {isComp && (
                           <span className="text-[9px] font-black text-white flex items-center gap-1 bg-emerald-600 px-2 py-1 rounded-lg border border-emerald-700"><CheckCircle size={12}/> انتهى</span>
                        )}
                        {canModifyConfig && (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true); }} className="p-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-blue-900 hover:text-white transition-all"><Edit size={14}/></button>
                            <button onClick={async () => { if(confirm('حذف التمرين؟')) { await supabase.from('sessions').delete().eq('id', session.id); setState(p => ({...p, sessions: p.sessions.filter(x => x.id !== session.id)})); addLog?.('حذف تمرين', 'تم إزالة الحصة التدريبية من الأجندة', 'error'); } }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                          </div>
                        )}
                     </div>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-4">{session.objective}</h4>
                  <div className="space-y-2 text-[11px] font-black text-slate-500 uppercase tracking-tighter">
                     <p className="flex items-center gap-2"><CalendarIcon size={14} className="text-orange-600"/> {session.date}</p>
                     <p className="flex items-center gap-2"><Clock size={14} className="text-[#001F3F]"/> {session.time}</p>
                     <p className="flex items-center gap-2"><MapPin size={14} className="text-emerald-600"/> {session.pitch || 'غير محدد'}</p>
                  </div>
                  <button 
                    onClick={() => toggleSessionComplete(session.id, !!isComp)}
                    className={`mt-6 w-full py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border-2 transition-all ${isComp ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-slate-100 border-slate-900 text-slate-900 hover:bg-emerald-50'}`}
                  >
                     <CheckCircle size={14}/> {isComp ? 'إعادة فتح التمرين' : 'تأشير كتم الإنجاز'}
                  </button>
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
               <div className="col-span-full py-20 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">لا توجد تمارين تمارين مجدولة حالياً لهذه الفئة</div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-900 shadow-sm no-print">
           <div className="flex items-center gap-4 mb-10">
              <BarChart3 className="text-blue-900" size={32}/>
              <h3 className="text-2xl font-black text-slate-900">محرك استخراج التقارير الفنية</h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                 <label className={labelClass}>نوع التقرير</label>
                 <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-slate-200">
                    <button onClick={() => setReportType('category')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${reportType === 'category' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>تقرير فئة</button>
                    <button onClick={() => setReportType('player')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${reportType === 'player' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>تقرير لاعب</button>
                 </div>
              </div>

              {reportType === 'category' ? (
                <div className="space-y-2">
                   <label className={labelClass}>الفئة المستهدفة</label>
                   <select value={selectedCatForReport} onChange={e => setSelectedCatForReport(e.target.value)} className={fieldClass}>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              ) : (
                <div className="space-y-2">
                   <label className={labelClass}>البحث عن لاعب</label>
                   <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className={fieldClass}>
                      <option value="">-- اختر لاعب من القائمة --</option>
                      {state.people.filter(p => p.role === 'لاعب').sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                         <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                      ))}
                   </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className={labelClass}>الشهر</label>
                    <select value={reportPeriod.month} onChange={e => setReportPeriod({...reportPeriod, month: e.target.value})} className={fieldClass}>
                       {Array.from({length:12}).map((_,i) => {
                          const val = (i+1).toString().padStart(2, '0');
                          return <option key={val} value={val}>{val}</option>;
                       })}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className={labelClass}>السنة</label>
                    <select value={reportPeriod.year} onChange={e => setReportPeriod({...reportPeriod, year: e.target.value})} className={fieldClass}>
                       {['2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>

              <div className="flex items-end">
                 <button onClick={generateReport} className="w-full bg-[#001F3F] text-white py-4 rounded-2xl font-black text-md shadow-xl hover:bg-black transition-all border-b-4 border-black">استخراج ومعاينة التقرير</button>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[500] p-4 no-print">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-[6px] border-slate-900 overflow-hidden">
              <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 uppercase">{editingSessionId ? 'تحديث موعد تمرين' : 'جدولة تمرين مركزي جديد'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelClass}>الفئة</label>
                       <select required className={fieldClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className={labelClass}>الملعب</label>
                       <input type="text" className={fieldClass} value={formData.pitch || ''} onChange={e => setFormData({...formData, pitch: e.target.value})} placeholder="مثلاً: ملعب الكرامة.." />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>موضوع / هدف التمرين</label>
                    <input required type="text" className={fieldClass} value={formData.objective || ''} onChange={e => setFormData({...formData, objective: e.target.value})} placeholder="مثلاً: تكتيك هجومي.." />
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
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all mt-4 uppercase">حفظ وتثبيت التمرين</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
