
import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Edit, X, Printer, FileText, CheckCircle, ShieldCheck, Lock, AlertCircle, Map, ChevronRight, BarChart3, PieChart, Users, User, TrendingUp, CalendarDays } from 'lucide-react';
import { AppState, TrainingSession, Category, Person, AttendanceRecord } from '../types';
import { generateUUID } from '../App';
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
            <Calendar size={18}/> الأجندة التدريبية
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
                 <Calendar size={24} className="text-blue-900" /> أجندة التدريبات المركزية (الجدولة)
               </h3>
               <p className="text-[10px] font-black text-slate-400 mt-1">تنظيم مواعيد التدريب لجميع الفئات - ميزة التعديل محصورة بمدير المكتب</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                    if (state.globalCategoryFilter === 'الكل') return alert("يرجى اختيار فئة محددة أولاً لطباعة البرنامج.");
                    // Reuse old logic for simple schedule print
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
                        {locked ? (
                          <span className="text-[9px] font-black text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200"><Lock size={12}/> مغلق إدارياً</span>
                        ) : (
                          <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"><ShieldCheck size={12}/> متاح للرصد</span>
                        )}
                     </div>
                  </div>

                  <h4 className="font-black text-lg text-slate-900 leading-tight mb-4">{session.objective}</h4>
                  
                  <div className="space-y-2 mb-6">
                     <div className="flex items-center gap-2 text-[11px] font-black text-slate-600">
                        <Clock size={14} className="text-orange-600"/> {session.time} • {session.date}
                     </div>
                     {session.pitch && (
                       <div className="flex items-center gap-2 text-[11px] font-black text-slate-600">
                          <Map size={14} className="text-emerald-600"/> {session.pitch}
                       </div>
                     )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleSessionComplete(session.id, !!isComp)}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 transition-all border-2 ${isComp ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-[#001F3F] border-slate-900 text-white'}`}
                    >
                      <CheckCircle size={14}/> {isComp ? 'إعادة فتح' : 'إنهاء التمرين'}
                    </button>
                    {canModifyConfig && (
                      <div className="flex gap-1">
                        <button onClick={() => {setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true);}} className="p-2.5 bg-blue-50 text-blue-900 rounded-xl border-2 border-blue-900 hover:bg-blue-900 hover:text-white transition-all"><Edit size={16}/></button>
                        <button onClick={() => { if(confirm('تنبيه: هل أنت متأكد من حذف هذا التمرين نهائياً؟')) setState(p => ({...p, sessions: p.sessions.filter(x => x.id !== session.id)})) }} className="p-2.5 bg-red-50 text-red-600 rounded-xl border-2 border-red-900 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem]">
                <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-black italic">لا يوجد تمارين مجدولة حالياً لهذه الفئة</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
           {/* Reports Configuration Box */}
           <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#001F3F]"></div>
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                 <PieChart size={28} className="text-orange-600"/> تخصيص التقرير الإحصائي
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                       <label className={labelClass}>نوع التقرير</label>
                       <div className="flex p-1.5 bg-slate-100 rounded-xl border-2 border-slate-200">
                          <button onClick={() => setReportType('category')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${reportType === 'category' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>تقرير الفئة</button>
                          <button onClick={() => setReportType('player')} className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${reportType === 'player' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>تقرير اللاعب</button>
                       </div>
                    </div>

                    <div>
                       <label className={labelClass}>الفئة المستهدفة</label>
                       <select 
                         disabled={!!restrictedCat}
                         value={selectedCatForReport} 
                         onChange={e => { setSelectedCatForReport(e.target.value); setSelectedPlayerId(''); }}
                         className={fieldClass}
                       >
                          {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>

                    {reportType === 'player' && (
                       <div>
                          <label className={labelClass}>اختر اللاعب</label>
                          <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className={fieldClass}>
                             <option value="">-- اختر اللاعب من القائمة --</option>
                             {state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport).map(p => (
                                <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                             ))}
                          </select>
                       </div>
                    )}
                 </div>

                 <div className="space-y-6">
                    <label className={labelClass}>الفترة الزمنية (شهري / سنوي)</label>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[9px] font-black text-slate-400 mb-1 block">الشهر</label>
                          <select value={reportPeriod.month} onChange={e => setReportPeriod({...reportPeriod, month: e.target.value})} className={fieldClass}>
                             {Array.from({length: 12}).map((_, i) => (
                                <option key={i} value={(i+1).toString().padStart(2, '0')}>
                                   {new Date(0, i).toLocaleString('ar-SY', {month: 'long'})}
                                </option>
                             ))}
                          </select>
                       </div>
                       <div>
                          <label className="text-[9px] font-black text-slate-400 mb-1 block">السنة</label>
                          <select value={reportPeriod.year} onChange={e => setReportPeriod({...reportPeriod, year: e.target.value})} className={fieldClass}>
                             {[2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 mt-4">
                       <p className="text-[11px] font-black text-blue-900 flex items-center gap-2">
                          <TrendingUp size={16}/> سيقوم النظام بتحليل كافة سجلات الحضور والغياب ودرجات الالتزام للفترة المختارة وتصديرها كملف PDF رسمي.
                       </p>
                    </div>

                    <button onClick={generateReport} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-orange-700 transition-all border-b-4 border-orange-800">
                       <FileText size={24}/> توليد واستخراج التقرير
                    </button>
                 </div>
              </div>
           </div>

           {/* Quick Stats Grid for visual feedback */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-sm flex items-center gap-4">
                 <div className="p-4 bg-blue-100 text-blue-900 rounded-2xl"><Users size={24}/></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">لاعبو الفئة</p>
                    <p className="text-2xl font-black">{state.people.filter(p => p.role === 'لاعب' && p.category === selectedCatForReport).length}</p>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-sm flex items-center gap-4">
                 <div className="p-4 bg-emerald-100 text-emerald-900 rounded-2xl"><CalendarDays size={24}/></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">تمارين الشهر</p>
                    <p className="text-2xl font-black">{state.sessions.filter(s => s.category === selectedCatForReport && s.date.startsWith(`${reportPeriod.year}-${reportPeriod.month}`)).length}</p>
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border-2 border-slate-900 shadow-sm flex items-center gap-4">
                 <div className="p-4 bg-orange-100 text-orange-900 rounded-2xl"><TrendingUp size={24}/></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">مستوى الانضباط</p>
                    <p className="text-2xl font-black text-orange-600">ممتاز</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 no-print">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border-[6px] border-slate-900">
            <div className="p-8 border-b-2 bg-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase">جدولة حصة تدريبية مركزية</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-xl border-2 border-slate-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className={labelClass}>الفئة المستهدفة</label>
                    <select required className={fieldClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
              </div>
              <div>
                 <label className={labelClass}>الملعب المستضيف</label>
                 <input type="text" placeholder="مثلاً: ملعب منشأة الكرامة.." className={fieldClass} value={formData.pitch || ''} onChange={e => setFormData({ ...formData, pitch: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>تاريخ التمرين</label>
                    <input type="date" required className={fieldClass} value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                 </div>
                 <div>
                    <label className={labelClass}>التوقيت المعتمد</label>
                    <input type="time" required className={fieldClass} value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                 </div>
              </div>
              <div>
                 <label className={labelClass}>الهدف التدريبي الرئيسي</label>
                 <textarea required rows={3} placeholder="مثال: تحسين اللياقة البدنية والكرات العرضية.." className={`${fieldClass} py-3 h-24`} value={formData.objective || ''} onChange={e => setFormData({ ...formData, objective: e.target.value })}></textarea>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-200 flex gap-3 items-start">
                 <AlertCircle className="text-orange-600 shrink-0" size={18}/>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-orange-900 leading-relaxed">تنبيه نظام الرقابة: سيتم قفل إمكانية رصد الحضور لهذا التمرين تلقائياً بعد مضي 30 دقيقة من الموعد المحدد.</p>
                 </div>
              </div>

              <button type="submit" className="w-full bg-[#001F3F] text-white font-black py-5 rounded-2xl shadow-xl border-b-4 border-black hover:bg-black transition-all uppercase tracking-widest text-lg">تثبيت الجدولة في النظام</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
