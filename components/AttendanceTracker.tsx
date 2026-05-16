
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardCheck, Save, History, Lock, Clock, Calendar as CalendarIcon, 
  Printer, ChevronRight, FileText, Users, Edit3, Shield as ShieldIcon,
  Check, UserX, PieChart, LayoutList, AlertCircle, MessageCircle
} from 'lucide-react';
import { AppState, AttendanceStatus, AttendanceRecord, TrainingSession, Person } from '../types';
import { generateUUID, supabase } from '../App';

export const getWhatsAppUrl = (phone: string | undefined, message: string) => {
  if (!phone) return null;
  const cleanedPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanedPhone.length < 8) return null;
  const formattedPhone = cleanedPhone.startsWith('00') ? cleanedPhone.substring(2) : 
                        cleanedPhone.startsWith('+') ? cleanedPhone.substring(1) : 
                        cleanedPhone.startsWith('0') ? '963' + cleanedPhone.substring(1) : 
                        cleanedPhone;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const statusConfig: Record<AttendanceStatus, { color: string, bgColor: string, icon: any, label: string }> = {
  'حاضر': { color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: Check, label: 'حاضر' },
  'متأخر': { color: 'text-amber-600', bgColor: 'bg-amber-500', icon: Clock, label: 'متأخر' },
  'غائب': { color: 'text-red-600', bgColor: 'bg-red-500', icon: UserX, label: 'غائب' },
  'غياب بعذر': { color: 'text-blue-600', bgColor: 'bg-blue-500', icon: FileText, label: 'بعذر' }
};

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ state, setState, addLog }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus | null; excuse?: string; time?: string; date?: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [adminEditOverride, setAdminEditOverride] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  
  const currentUser = state.currentUser!;
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = currentUser.restrictedCategory;
  const isViewer = currentUser.role === 'مشاهد' || currentUser?.role === 'معالج';
  const isManager = currentUser.role === 'مدير';

  const sessions = state.sessions
    .filter(s => {
      if (restrictedCat) return String(restrictedCat).split(',').includes(s.category);
      return (globalFilter === 'الكل' || s.category === globalFilter);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeSession = state.sessions.find(s => s.id === selectedSessionId);
  const categoryMembers = state.people
    .filter(p => (activeSession ? p.category === activeSession.category : true))
    .sort((a, b) => (a.role !== 'لاعب' ? -1 : 1));

  const savedRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);
  
  const isLocked = activeSession?.isCompleted;
  const canEditNow = isViewer ? false : (isManager ? (adminEditOverride || !isLocked) : !isLocked);

  useEffect(() => {
    if (!activeSession || isManager || !activeSession.time || isViewer) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      const sessionDate = new Date(`${activeSession.date}T${activeSession.time}`);
      const timeDiffMs = sessionDate.getTime() - new Date().getTime();
      
      if (timeDiffMs > 30 * 60 * 1000) {
        const totalSeconds = Math.floor(timeDiffMs / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const formatted = h > 0 ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;
        setCountdown(formatted);
      } else {
        setCountdown(null);
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activeSession, isManager, isViewer]);

  const canEditNowFinal = canEditNow && !countdown;

  const sendIndividualWhatsApp = (p: Person, status: AttendanceStatus, time: string) => {
    if (!activeSession) return;
    const msgs: Record<AttendanceStatus, string> = {
      'حاضر': `السادة أولياء الأمور الكرام،\nنعلمكم بحضور اللاعب (${p.name}) لتدريب اليوم الموافق ${activeSession.date} في تمام الساعة ${time}.\nإدارة النادي تتمنى له تدريباً موفقاً.`,
      'متأخر': `السادة أولياء الأمور الكرام،\nتسجيل حضور: اللاعب (${p.name}) حضر لتدريب اليوم الموافق ${activeSession.date} متأخراً في تمام الساعة ${time}.\nنرجو الحرص على الحضور بالموعد المحدد لضمان الاستفادة القصوى.`,
      'غائب': `السادة أولياء الأمور الكرام،\nنأسف لإبلاغكم بتسجيل غياب اللاعب (${p.name}) عن تدريب اليوم الموافق ${activeSession.date}.\nيرجى مراجعة الجهاز الإداري في حال وجود مبرر.`,
      'غياب بعذر': `السادة أولياء الأمور الكرام،\nتم تسجيل إجازة (غياب بعذر) للاعب (${p.name}) عن تدريب اليوم الموافق ${activeSession.date}.\nتمنياتنا للجميع بدوام التوفيق.`
    };
    const url = getWhatsAppUrl(p.phone, msgs[status]);
    if (url) {
      window.open(url, '_blank');
    } else {
      alert(`رقم هاتف اللاعب ${p.name} غير مسجل أو غير صالح.`);
    }
  };

  const sessionStats = useMemo(() => {
    const stats = { 'حاضر': 0, 'متأخر': 0, 'غائب': 0, 'غياب بعذر': 0, 'لم يرصد': 0 };
    categoryMembers.forEach(p => {
      const status = localRecords[p.id]?.status || savedRecords.find(r => r.personId === p.id)?.status;
      if (status) stats[status]++;
      else stats['لم يرصد']++;
    });
    return stats;
  }, [categoryMembers, localRecords, savedRecords]);

  const handleSetStatus = (pid: string, status: AttendanceStatus) => {
    if ((isLocked && !canEditNow) || isViewer) return;
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    setLocalRecords(prev => ({ ...prev, [pid]: { ...prev[pid], status, time: timeStr } }));
  };

  const saveAttendance = async () => {
    if (!selectedSessionId || isSaving || isViewer) return;
    setIsSaving(true);
    try {
      const newRecords: AttendanceRecord[] = [];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      categoryMembers.forEach(p => {
        const local = localRecords[p.id];
        const saved = savedRecords.find(r => r.personId === p.id);
        const statusToSave = local?.status || saved?.status || null;
        if (statusToSave) {
          newRecords.push({
            id: saved?.id || generateUUID(), 
            personId: p.id, 
            sessionId: selectedSessionId, 
            date: activeSession!.date,
            time: local?.time || saved?.time || timeStr, 
            status: statusToSave as AttendanceStatus, 
            excuse: local?.excuse || saved?.excuse || "", 
            isLocked: true
          });
        }
      });
      
      const { error: attError } = await supabase.from('attendance').upsert(newRecords.map(r => ({ 
        id: r.id, personId: r.personId, sessionId: r.sessionId, date: r.date, time: r.time, status: r.status, excuse: r.excuse 
      })));
      
      if (attError) throw attError;

      await supabase.from('sessions').upsert({ id: selectedSessionId, isCompleted: true });
      
      setState(prev => ({
        ...prev,
        attendance: [...prev.attendance.filter(a => a.sessionId !== selectedSessionId), ...newRecords],
        sessions: prev.sessions.map(s => s.id === selectedSessionId ? { ...s, isCompleted: true } : s)
      }));
      
      setLocalRecords({});
      addLog?.('تثبيت الحضور', `اعتماد كشف حضور: ${activeSession?.category}`, 'success');
      alert('تم الاعتماد النهائي بنجاح.');
    } catch (err: any) { 
      alert('خطأ: ' + err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 px-2 md:px-0 pb-20">
      <div className="modern-card p-6 md:p-10 flex flex-col gap-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[11px] font-black text-slate-700 mr-2 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> رصد حضور الحصة الفوري
            </label>
            <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 md:p-6 font-black text-sm md:text-2xl text-slate-900 outline-none focus:border-orange-500 transition-all shadow-sm">
              <option value="">-- اختر التمرين من القائمة --</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
            </select>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto self-end">
            {!isViewer && (
              <button onClick={saveAttendance} disabled={!selectedSessionId || (isLocked && !canEditNow) || isSaving || !!countdown} className="w-full md:w-auto bg-blue-900 text-white px-8 py-5 rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all disabled:opacity-30">
                {isSaving ? <History className="animate-spin" size={20}/> : <Save size={20} />}
                اعتماد الرصد النهائي
              </button>
            )}
          </div>
        </div>

        {activeSession && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t-2 border-slate-100 pt-6">
            {(Object.entries(statusConfig) as [AttendanceStatus, any][]).map(([status, config]) => (
              <div key={status} className={`${config.bgColor.replace('bg-', 'bg-')}/10 border-2 ${config.color.replace('text-', 'border-')}/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center`}>
                <config.icon className={config.color} size={20} />
                <p className={`text-[9px] font-black uppercase mt-1 ${config.color}`}>{status}</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{sessionStats[status]}</p>
              </div>
            ))}
            <div className="bg-slate-100 border-2 border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <AlertCircle className="text-slate-600" size={20} />
              <p className="text-[9px] font-black text-slate-600 uppercase mt-1">لم يرصد</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{sessionStats['لم يرصد']}</p>
            </div>
          </div>
        )}
      </div>

      {activeSession && (
        <div className={`modern-card overflow-hidden relative ${(isLocked && !canEditNow) || countdown ? 'opacity-70 grayscale-[0.5] pointer-events-none' : ''}`}>
          {countdown && (
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
              <Clock className="text-orange-500 mb-4 animate-pulse" size={48} />
              <h3 className="text-2xl font-black text-blue-900 mb-2">لا يمكن بدء الرصد الآن</h3>
              <p className="text-slate-600 font-bold mb-4">يُسمح ببدء الرصد قبل نصف ساعة من موعد التمرين ({activeSession.time})</p>
              <div className="bg-orange-50 text-orange-600 font-black text-3xl px-8 py-4 rounded-3xl border-2 border-orange-200 tabular-nums shadow-lg text-left" dir="ltr">
                {countdown}
              </div>
            </div>
          )}
          <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-6 w-full md:w-auto">
               <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-900 border-4 border-white rounded-2xl flex items-center justify-center font-black text-2xl md:text-4xl text-white uppercase shadow-lg">
                  {activeSession.category.charAt(0)}
               </div>
               <div>
                 <h3 className="text-xl md:text-3xl font-black text-blue-900 leading-tight">{activeSession.objective}</h3>
                 <p className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-[0.2em] mt-1">{activeSession.category} • {activeSession.date}</p>
               </div>
             </div>
             <div className="flex flex-wrap gap-3 items-center pointer-events-auto">
                {isLocked && <span className="bg-red-50 text-red-600 px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase border border-red-100"><Lock size={14}/> سجل مقفل إدارياً</span>}
                {isManager && selectedSessionId && (
                  <button onClick={() => setAdminEditOverride(!adminEditOverride)} className={`px-6 py-2 rounded-full font-black text-[10px] border transition-all shadow-sm ${adminEditOverride ? 'bg-orange-500 text-white border-orange-400' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'}`}>
                    {adminEditOverride ? 'إيقاف التعديل الاستثنائي' : 'تعديل السجل المقفل'}
                  </button>
                )}
                {activeSession && (
                  <button onClick={() => setShowEndSessionModal(true)} className="bg-emerald-50 text-emerald-700 px-6 py-2 rounded-full font-black text-[10px] border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-2">
                    <MessageCircle size={14} /> إشعارات انتهاء التمرين
                  </button>
                )}
             </div>
          </div>

          <div className="overflow-x-auto lg:overflow-visible">
            {/* Desktop Table View */}
            <table className="hidden lg:table w-full text-right">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">اللاعب والمركز</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-center">حالة الحضور</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-center">وقت التسجيل</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">ملاحظات العذر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryMembers.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  const currentStatus = local?.status || saved?.status || null;
                  const currentTime = local?.time || saved?.time || "--:--";
                  const config = currentStatus ? statusConfig[currentStatus] : null;

                  return (
                    <tr key={p.id} className={`transition-all hover:bg-slate-50/80 ${currentStatus === 'غائب' ? 'bg-red-50/20' : currentStatus === 'حاضر' ? 'bg-emerald-50/5' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border transition-all shadow-sm ${config ? `${config.bgColor} text-white border-white/20` : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {p.number || '0'}
                          </div>
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-slate-900">{p.name}</span>
                                {config && <config.icon className={`${config.color} shrink-0`} size={16} />}
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.role} {p.position ? `| ${p.position}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center gap-2">
                          {(Object.entries(statusConfig) as [AttendanceStatus, any][]).map(([status, cfg]) => (
                            <button 
                              key={status}
                              disabled={isViewer}
                              onClick={() => handleSetStatus(p.id, status)} 
                              className={`px-5 py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 flex items-center gap-2 ${currentStatus === status ? `${cfg.bgColor} text-white border-white/20 shadow-md scale-105` : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                            >
                              <cfg.icon size={14} />
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <span className={`text-[11px] font-black px-4 py-2 rounded-xl border tabular-nums ${currentStatus ? 'bg-blue-900 text-white border-blue-950 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              {currentTime}
                           </span>
                           {currentStatus && (
                             <button onClick={() => sendIndividualWhatsApp(p, currentStatus, currentTime)} className="text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-sm" title="إرسال إشعار للمشترك عبر واتساب">
                               <MessageCircle size={16} />
                             </button>
                           )}
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="relative group/input">
                           <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-orange-500 transition-colors" size={16} />
                           <input type="text" readOnly={isViewer} value={local?.excuse || saved?.excuse || ""} onChange={e => setLocalRecords(prev => ({ ...prev, [p.id]: { ...prev[p.id], excuse: e.target.value } }))}
                            className="bg-white border border-slate-200 rounded-xl pr-12 pl-4 py-3 text-xs font-bold w-full outline-none focus:border-orange-500 transition-all shadow-sm" 
                            placeholder={isViewer ? "" : "سجل عذراً أو ملاحظة..."}
                           />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {categoryMembers.map(p => {
                const saved = savedRecords.find(r => r.personId === p.id);
                const local = localRecords[p.id];
                const currentStatus = local?.status || saved?.status || null;
                const currentTime = local?.time || saved?.time || "--:--";
                const config = currentStatus ? statusConfig[currentStatus] : null;

                return (
                  <div key={p.id} className={`p-4 space-y-4 ${currentStatus === 'غائب' ? 'bg-red-50/20' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs border ${config ? `${config.bgColor} text-white` : 'bg-slate-50 text-slate-400'}`}>
                          {p.number || '0'}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase">{p.role} {p.position ? `| ${p.position}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border tabular-nums ${currentStatus ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {currentTime}
                        </span>
                        {currentStatus && (
                          <button onClick={() => sendIndividualWhatsApp(p, currentStatus, currentTime)} className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="إرسال إشعار للمشترك عبر واتساب">
                            <MessageCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       {(Object.entries(statusConfig) as [AttendanceStatus, any][]).map(([status, cfg]) => (
                        <button 
                          key={status}
                          disabled={isViewer}
                          onClick={() => handleSetStatus(p.id, status)} 
                          className={`py-2.5 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-2 ${currentStatus === status ? `${cfg.bgColor} text-white` : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          <cfg.icon size={14} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input type="text" readOnly={isViewer} value={local?.excuse || saved?.excuse || ""} onChange={e => setLocalRecords(prev => ({ ...prev, [p.id]: { ...prev[p.id], excuse: e.target.value } }))}
                        className="bg-white border border-slate-200 rounded-xl pr-10 pl-3 py-2 text-[10px] font-bold w-full outline-none focus:border-orange-500" 
                        placeholder="سجل عذراً..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showEndSessionModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="text-emerald-500" /> إرسال إشعارات انتهاء التمرين
              </h2>
              <button onClick={() => setShowEndSessionModal(false)} className="bg-slate-200 text-slate-600 p-2 rounded-xl hover:bg-slate-300 transition-all">
                <UserX size={16} /> 
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-xs font-bold text-blue-800 leading-relaxed">
                ستظهر هنا قائمة باللاعبين الذين سجلوا (حاضر) أو (متأخر). سيتم تجهيز رسالة تفيد بانتهاء التمرين وجاهزيتهم للمغادرة.
              </div>
              {categoryMembers.filter(p => {
                const saved = savedRecords.find(r => r.personId === p.id);
                const local = localRecords[p.id];
                const currentStatus = local?.status || saved?.status || null;
                return currentStatus === 'حاضر' || currentStatus === 'متأخر';
              }).map(p => {
                const sendMsg = () => {
                  const url = getWhatsAppUrl(p.phone, `السادة أولياء الأمور الكرام،\nنعلمكم بانتهاء التدريب الخاص باللاعب (${p.name}) بنجاح، وهو الآن جاهز للمغادرة.\nنشكر لكم حسن تعاونكم الدائم مع إدارة النادي.`);
                  if (url) window.open(url, '_blank');
                  else alert(`رقم هاتف اللاعب ${p.name} غير مسجل أو غير صالح.`);
                };
                return (
                  <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                        {p.number || '0'}
                      </div>
                      <span className="font-black text-sm text-slate-900">{p.name}</span>
                    </div>
                    <button onClick={sendMsg} className="w-full sm:w-auto bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-sm">
                      <MessageCircle size={14} /> إرسال واتساب
                    </button>
                  </div>
                );
              })}
              {categoryMembers.filter(p => {
                const saved = savedRecords.find(r => r.personId === p.id);
                const local = localRecords[p.id];
                const currentStatus = local?.status || saved?.status || null;
                return currentStatus === 'حاضر' || currentStatus === 'متأخر';
              }).length === 0 && (
                <div className="text-center p-8 text-slate-400 font-bold text-sm">
                  لا يوجد لاعبين حاضرين في هذا التمرين بعد.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
