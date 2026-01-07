
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, FileText, BarChart3, Lock, ShieldCheck, AlertCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { AppState, Category, AttendanceRecord, AttendanceStatus, TrainingSession } from '../types';

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ state, setState }) => {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const isManager = currentUser?.role === 'مدير';
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<Category>(restrictedCat || 'رجال');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus, time: string }>>({});

  useEffect(() => {
    if (restrictedCat) setSelectedCategory(restrictedCat);
  }, [restrictedCat]);

  const categorySessions = state.sessions
    .filter(s => s.category === selectedCategory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    if (categorySessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(categorySessions[0].id);
    }
  }, [selectedCategory, categorySessions]);

  const selectedSession = state.sessions.find(s => s.id === selectedSessionId);
  const players = state.people.filter(p => p.category === selectedCategory && p.role === 'لاعب');
  const sessionRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);

  // إحصائيات التمرين
  const presentCount = sessionRecords.filter(r => r.status === 'حاضر').length;
  const lateCount = sessionRecords.filter(r => r.status === 'متأخر').length;
  const absentCount = sessionRecords.filter(r => r.status === 'غائب').length;

  const handleSetStatus = (personId: string, status: AttendanceStatus) => {
    // التحقق من الصلاحية: إذا كان السجل محفوظاً والمسخدم ليس مديراً، يمنع التعديل
    const isAlreadySaved = sessionRecords.some(r => r.personId === personId);
    if (!isManager && isAlreadySaved) {
      alert('لا تملك صلاحية تعديل سجل محفوظ. يرجى مراجعة إدارة المكتب.');
      return;
    }
    
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
    setLocalRecords(prev => ({ ...prev, [personId]: { status, time: now } }));
  };

  const saveAttendance = () => {
    const entries = Object.entries(localRecords);
    if (entries.length === 0) return alert('الرجاء تحديد حالة اللاعبين أولاً');

    // Fix: Cast data to specific type to avoid 'unknown' type error when accessing status and time
    const newRecords: AttendanceRecord[] = entries.map(([pid, data]) => {
      const typedData = data as { status: AttendanceStatus; time: string };
      return {
        id: Math.random().toString(36).substr(2, 9),
        personId: pid,
        sessionId: selectedSessionId,
        date: selectedSession?.date || '',
        time: typedData.time,
        status: typedData.status,
      };
    });

    setState(prev => ({
      ...prev,
      attendance: [
        ...prev.attendance.filter(a => !(a.sessionId === selectedSessionId && localRecords[a.personId])),
        ...newRecords
      ],
      notifications: [{
        id: Math.random().toString(36).substr(2, 9),
        message: 'تم حفظ سجل الحضور بنجاح وقفل البيانات.',
        type: 'success',
        timestamp: Date.now()
      }]
    }));
    setLocalRecords({});
  };

  const getMonthlySummary = () => {
    return players.map(player => {
      const monthlyAtt = state.attendance.filter(a => {
        const date = new Date(a.date);
        return a.personId === player.id && 
               (date.getMonth() + 1) === selectedMonth && 
               date.getFullYear() === selectedYear;
      });

      return {
        ...player,
        absent: monthlyAtt.filter(a => a.status === 'غائب').length,
        late: monthlyAtt.filter(a => a.status === 'متأخر').length,
        present: monthlyAtt.filter(a => a.status === 'حاضر').length,
        total: monthlyAtt.length
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-2 no-print">
        <button onClick={() => setViewMode('daily')} className={`flex-1 py-3 rounded-2xl font-black transition-all ${viewMode === 'daily' ? 'bg-blue-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>سجل التمارين اليومي</button>
        <button onClick={() => setViewMode('monthly')} className={`flex-1 py-3 rounded-2xl font-black transition-all ${viewMode === 'monthly' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>ملخص الشهر التحليلي</button>
      </div>

      {viewMode === 'daily' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end no-print">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-xs font-black text-slate-400 mr-2">اختيار التمرين المراد تسجيله</label>
              <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-950 outline-none">
                <option value="">-- اختر التمرين من القائمة --</option>
                {categorySessions.map(s => <option key={s.id} value={s.id}>{s.date} - {s.objective}</option>)}
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={saveAttendance} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                <Save size={20} /> حفظ وقفل السجل
              </button>
              <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                <FileText size={20} /> طباعة التقرير
              </button>
            </div>
          </div>

          {selectedSession && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">قائمة اللاعبين</span>
                  {!isManager && <span className="text-[10px] font-black text-orange-600 flex items-center gap-1"><Lock size={12}/> السجلات المحفوظة مقفولة إدارياً</span>}
                </div>
                <table className="w-full text-right">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500">اللاعب</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 text-center">تحديد الحالة</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 text-center">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {players.map(p => {
                      const saved = sessionRecords.find(r => r.personId === p.id);
                      const local = localRecords[p.id];
                      const status = local?.status || saved?.status;
                      const isLocked = !isManager && !!saved;
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-950 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-black">رقم: {p.number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1">
                              {['حاضر', 'متأخر', 'غائب'].map(st => (
                                <button key={st} onClick={() => handleSetStatus(p.id, st as AttendanceStatus)}
                                  disabled={isLocked}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${status === st ? 
                                    (st === 'حاضر' ? 'bg-emerald-600 text-white border-emerald-600' : st === 'متأخر' ? 'bg-orange-500 text-white border-orange-500' : 'bg-red-600 text-white border-red-600') 
                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'} ${isLocked && status !== st ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                              {local?.time || saved?.time || '--:--'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                  <BarChart3 className="absolute -left-4 -bottom-4 text-white/10 w-32 h-32" />
                  <h4 className="text-lg font-black mb-6">ملخص هذا التمرين</h4>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl">
                      <span className="text-blue-200 font-bold">نسبة الانضباط</span>
                      <span className="text-2xl font-black">{players.length ? Math.round(((presentCount + lateCount) / players.length) * 100) : 0}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <p className="text-[10px] text-blue-300 font-black">حضور</p>
                        <p className="text-xl font-black text-emerald-400">{presentCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-blue-300 font-black">تأخير</p>
                        <p className="text-xl font-black text-orange-400">{lateCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-blue-300 font-black">غياب</p>
                        <p className="text-xl font-black text-red-400">{absentCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                   <div className="flex items-center gap-3 text-slate-800 font-black text-sm mb-4">
                     <ShieldCheck size={20} className="text-emerald-500" />
                     نظام القفل النشط
                   </div>
                   <p className="text-xs text-slate-500 font-bold leading-relaxed">
                     بموجب قوانين المكتب، لا يمكن للمدرب تعديل أي حالة حضور بعد حفظها. التعديل متاح فقط للمدير الفني العام للمكتب.
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end no-print">
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">الشهر المطلوب</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-950 outline-none">
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('ar-EG', {month: 'long'})}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 mr-2">السنة</label>
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-950 outline-none">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => window.print()} className="w-full md:w-auto bg-orange-600 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2">
              <FileText size={20} /> تصدير تقرير الشهر
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h4 className="font-black text-slate-800">إحصائيات شهر {new Date(0, selectedMonth-1).toLocaleString('ar-EG', {month: 'long'})}</h4>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">فئة {selectedCategory}</span>
            </div>
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-6 py-4 text-xs font-black">اللاعب</th>
                  <th className="px-6 py-4 text-xs font-black text-center">حضور</th>
                  <th className="px-6 py-4 text-xs font-black text-center">تأخير</th>
                  <th className="px-6 py-4 text-xs font-black text-center">غياب</th>
                  <th className="px-6 py-4 text-xs font-black text-center">جودة الالتزام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getMonthlySummary().map(row => {
                  const rate = row.total ? Math.round(((row.present + row.late * 0.5) / row.total) * 100) : 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-950">{row.name}</td>
                      <td className="px-6 py-4 text-center text-emerald-600 font-black">{row.present}</td>
                      <td className="px-6 py-4 text-center text-orange-500 font-black">{row.late}</td>
                      <td className="px-6 py-4 text-center text-red-600 font-black">{row.absent}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-black text-slate-900">{rate}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${rate > 80 ? 'bg-emerald-500' : rate > 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{width: `${rate}%`}} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
