
// Add comment above each fix
import React, { useMemo, useState } from 'react';
// Fix: Added missing Zap and ShieldCheck icons to the lucide-react import list
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase, Sparkles, Loader2, X, BrainCircuit,
  HeartPulse, ShieldAlert, Gavel, Smartphone, CalendarDays, Wallet, Zap, ShieldCheck
} from 'lucide-react';
import { AppState, Person, Match, AttendanceRecord } from '../types';
import ClubLogo from './ClubLogo';
import { GoogleGenAI } from "@google/genai";

interface PlayerReportProps {
  state: AppState;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, player, onBack }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!player || !state.currentUser) return null;

  const isStaff = player.role !== 'لاعب';

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const matchStats = useMemo(() => {
    if (isStaff) return { played: 0, goals: 0, assists: 0, yellows: 0, reds: 0, minutes: 0, list: [] };

    let totalMinutes = 0;
    const statsList = state.matches
      .filter(m => m.isCompleted)
      .sort((a, b) => a.date.localeCompare(b.date)) // ترتيب تصاعدي للرسم البياني
      .map(m => {
        const starter = m.lineup.starters.find(s => s.playerId === player.id);
        const sub = m.lineup.subs.find(s => s.playerId === player.id);
        
        let mins = 0;
        if (starter) {
          mins = parseInt(starter.minutesPlayed || '90') || 0;
        } else if (sub) {
          mins = parseInt(sub.minutesPlayed || '0') || 0;
        }

        totalMinutes += mins;

        const goals = m.events.filter(e => e.type === 'goal' && (e.player === player.name || e.player === player.id)).length;
        const assists = m.events.filter(e => e.type === 'assist' && (e.player === player.name || e.player === player.id)).length;
        const yellow = m.events.filter(e => e.type === 'yellow' && (e.player === player.name || e.player === player.id)).length;
        const red = m.events.filter(e => e.type === 'red' && (e.player === player.name || e.player === player.id)).length;

        return { 
          opponent: m.opponent, 
          date: m.date, 
          type: m.matchType,
          mins, 
          goals, 
          assists, 
          yellow, 
          red, 
          played: !!(starter || sub) 
        };
      })
      .filter(s => s.played);

    return {
      played: statsList.length,
      goals: statsList.reduce((a, b) => a + b.goals, 0),
      assists: statsList.reduce((a, b) => a + b.assists, 0),
      yellows: statsList.reduce((a, b) => a + b.yellow, 0),
      reds: statsList.reduce((a, b) => a + b.red, 0),
      minutes: totalMinutes,
      list: statsList
    };
  }, [state.matches, player, isStaff]);

  const attendanceData = useMemo(() => {
    const records = state.attendance.filter(a => a.personId === player.id);
    const sessions = state.sessions.filter(s => s.category === player.category);
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const rate = sessions.length > 0 ? Math.round(((present + late * 0.7) / sessions.length) * 100) : 0;

    return { rate, total: sessions.length, present, late };
  }, [state.attendance, state.sessions, player]);

  const handleGenerateAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      // Fix: Follow @google/genai guidelines for model interaction
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        أنت محلل تقني محترف لكرة القدم. قم بكتابة تقرير فني شامل واحترافي للاعب التالي في نادي الكرامة:
        الاسم: ${player.name}
        الفئة: ${player.category}
        إجمالي الدقائق الملعوبة: ${matchStats.minutes} دقيقة في ${matchStats.played} مباريات.
        الأهداف: ${matchStats.goals} | التمريرات الحاسمة: ${matchStats.assists}
        معدل الالتزام بالتمارين: ${attendanceData.rate}%
        البطاقات: ${matchStats.yellows} صفراء، ${matchStats.reds} حمراء.
        ملاحظات إضافية من السجل: ${player.notes || 'لا يوجد'}

        التقرير يجب أن يكون بأسلوب "Scout Report" ويتضمن:
        1. تقييم الأداء العام.
        2. تحليل الانضباط.
        3. توصية فنية للمدرب لتطوير مستوى اللاعب.
        استخدم اللغة العربية الفصحى وبأسلوب احترافي.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setAiAnalysis(response.text || "فشل توليد التحليل.");
    } catch (error: any) {
      setAiAnalysis("حدث خطأ أثناء الاتصال بـ Gemini: " + error.message);
    } finally {
      setLoadingAi(false);
    }
  };

  // بيانات الرسم البياني (آخر 10 مباريات)
  const chartData = matchStats.list.slice(-10);
  const maxMinutes = 100; // السقف الافتراضي للدقائق مع الوقت المضاف

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* هيدر التحكم */}
      <div className="flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#001F3F] font-black transition-all">
          <ChevronRight size={20} /> العودة لقائمة الفريق
        </button>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleGenerateAiAnalysis} 
             disabled={loadingAi}
             className="bg-gradient-to-r from-blue-900 to-orange-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-3 shadow-lg hover:shadow-blue-900/20 transition-all border-b-4 border-black disabled:opacity-50"
           >
             {loadingAi ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} />}
             تحليل فني مع "التفكير العميق"
           </button>
           <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-black transition-all border-b-4 border-black">
             <Printer size={18} /> طباعة التقرير الفني
           </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-8 rounded-[3rem] border-4 border-blue-900 shadow-xl animate-in zoom-in-95 duration-500 no-print relative">
           <button onClick={() => setAiAnalysis(null)} className="absolute top-6 left-6 text-slate-400 hover:text-red-600"><X size={24}/></button>
           <h3 className="text-xl font-black text-blue-900 flex items-center gap-3 mb-6 uppercase tracking-tighter">
             <Sparkles size={24}/> التقرير الفني المولد بموديل التفكير (Pro Thinking)
           </h3>
           <div className="prose prose-slate max-w-none text-right font-black leading-loose text-slate-700 whitespace-pre-wrap">
              {aiAnalysis}
           </div>
        </div>
      )}

      {/* الهوية البصرية الرئيسية */}
      <div className="bg-white rounded-[3rem] shadow-xl border-4 border-slate-900 overflow-hidden relative">
        <div className="bg-[#001F3F] h-32 relative">
          <div className="absolute top-6 left-10 opacity-10">
             <ClubLogo size={180} />
          </div>
          <div className="absolute -bottom-16 right-12 flex items-end gap-6">
            <div className="w-40 h-40 bg-white rounded-[2.5rem] shadow-2xl border-8 border-white flex items-center justify-center overflow-hidden font-black text-6xl text-blue-900 uppercase">
               {player.name.charAt(0)}
            </div>
            <div className="mb-4">
              <h1 className="text-3xl font-black text-white drop-shadow-lg uppercase">{player.name}</h1>
              <div className="flex gap-2 mt-2">
                 <span className="bg-orange-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase border-2 border-white shadow-md">{player.role}</span>
                 <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase border-2 border-white shadow-md">{player.category}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-20"></div>
        
        {/* إحصائيات سريعة عريضة */}
        <div className="px-12 pb-10 grid grid-cols-2 md:grid-cols-5 gap-6">
           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
             <Hash className="text-orange-600 mb-2" size={20}/>
             <span className="text-[10px] font-black text-slate-400 uppercase">رقم القميص</span>
             <p className="text-2xl font-black text-[#001F3F]">{player.number || '00'}</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
             <Timer className="text-emerald-600 mb-2" size={20}/>
             <span className="text-[10px] font-black text-slate-400 uppercase">دقائق المشاركة</span>
             <p className="text-2xl font-black text-[#001F3F]">{matchStats.minutes}</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
             <Trophy className="text-blue-600 mb-2" size={20}/>
             <span className="text-[10px] font-black text-slate-400 uppercase">الأهداف</span>
             <p className="text-2xl font-black text-[#001F3F]">{matchStats.goals}</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
             <Zap className="text-blue-400 mb-2" size={20}/>
             <span className="text-[10px] font-black text-slate-400 uppercase">تمريرات حاسمة</span>
             <p className="text-2xl font-black text-[#001F3F]">{matchStats.assists}</p>
           </div>
           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
             <TrendingUp className="text-emerald-500 mb-2" size={20}/>
             <span className="text-[10px] font-black text-slate-400 uppercase">نسبة الحضور</span>
             <p className="text-2xl font-black text-emerald-600">%{attendanceData.rate}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* العمود الأيمن: الرسم البياني والسجل الإحصائي */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* الرسم البياني للأداء */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                 <BarChart3 className="text-orange-600" size={24}/> تتبع اتجاه الأداء (آخر 10 مباريات)
               </h3>
               <div className="flex gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-600 rounded-full"></div><span className="text-[9px] font-black">دقائق اللعب</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-full"></div><span className="text-[9px] font-black">أهداف</span></div>
               </div>
            </div>
            
            <div className="h-64 flex items-end justify-between px-4 relative">
              {/* خطوط الخلفية */}
              <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-between opacity-5">
                {[0, 25, 50, 75, 100].map(v => <div key={v} className="w-full border-t border-slate-900"></div>)}
              </div>
              
              {chartData.length > 0 ? chartData.map((d, i) => (
                <div key={i} className="relative flex flex-col items-center group/bar" style={{ width: `${100 / chartData.length}%` }}>
                  {/* شريط الدقائق */}
                  <div 
                    className="w-8 bg-blue-600 rounded-t-lg transition-all duration-500 group-hover/bar:bg-blue-400 group-hover/bar:scale-x-110 shadow-sm relative"
                    style={{ height: `${(d.mins / maxMinutes) * 100}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded font-black whitespace-nowrap">
                      {d.mins} د
                    </div>
                  </div>
                  {/* نقطة الهدف */}
                  {d.goals > 0 && (
                    <div 
                      className="absolute w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[7px] text-white font-black z-10"
                      style={{ bottom: `${(d.mins / maxMinutes) * 100}%` }}
                    >
                      {d.goals}
                    </div>
                  )}
                  <div className="mt-4 text-[7px] font-black text-slate-400 -rotate-45 whitespace-nowrap origin-top-right">
                    {d.opponent}
                  </div>
                </div>
              )) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-30 italic">
                  <Activity size={48} className="mb-2"/>
                  <p className="text-xs">لا توجد بيانات كافية لرسم المسار الفني</p>
                </div>
              )}
            </div>
          </div>

          {/* تفاصيل المباريات */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm">
             <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
               <Trophy className="text-blue-900" size={24}/> سجل المشاركات التفصيلي
             </h3>
             <div className="overflow-x-auto">
               <table className="w-full text-right border-collapse">
                 <thead>
                    <tr className="bg-slate-50 border-y-2 border-slate-900 text-[10px] font-black uppercase tracking-wider">
                       <th className="p-3 border-l">المنافس</th>
                       <th className="p-3 border-l text-center">الدقائق</th>
                       <th className="p-3 border-l text-center">أهداف</th>
                       <th className="p-3 border-l text-center">تمريرات</th>
                       <th className="p-3 border-l text-center">صفراء</th>
                       <th className="p-3 text-center">حمراء</th>
                    </tr>
                 </thead>
                 <tbody>
                    {matchStats.list.length > 0 ? matchStats.list.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100 text-xs font-black hover:bg-slate-50 transition-colors">
                         <td className="p-3 border-l">
                            <div className="flex flex-col">
                               <span>{m.opponent}</span>
                               <span className="text-[8px] text-slate-400">{m.date} - {m.type}</span>
                            </div>
                         </td>
                         <td className="p-3 border-l text-center font-bold">{m.mins} د</td>
                         <td className="p-3 border-l text-center text-emerald-600">{m.goals || '-'}</td>
                         <td className="p-3 border-l text-center text-blue-600">{m.assists || '-'}</td>
                         <td className="p-3 border-l text-center">
                            {m.yellow > 0 && <span className="w-3 h-4 bg-yellow-400 border border-slate-900 rounded inline-block"></span>}
                         </td>
                         <td className="p-3 text-center">
                            {m.red > 0 && <span className="w-3 h-4 bg-red-600 border border-slate-900 rounded inline-block"></span>}
                         </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="p-10 text-center text-slate-300 font-black">لا توجد سجلات مكتملة حالياً</td></tr>
                    )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* العمود الأيسر: كل البيانات الشخصية بلا استثناء */}
        <div className="space-y-8">
          
          {/* قسم البيانات الإدارية الكاملة */}
          <div className="bg-[#001F3F] p-8 rounded-[3rem] border-2 border-slate-900 text-white shadow-xl">
             <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <ShieldCheck className="text-orange-400" size={24}/>
                <h3 className="text-md font-black uppercase tracking-tighter">السجل الإداري والشخصي الكامل</h3>
             </div>
             
             <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                   {/* معلومات الولادة */}
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">اسم الأب والأم</p>
                      <p className="text-sm font-black">{player.fatherName} & {player.motherName}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">مكان وتاريخ الولادة</p>
                      <p className="text-sm font-black">{player.birthPlace} | {player.birthDate}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">رقم القيد (الخانة)</p>
                      <p className="text-sm font-black">{player.khana}</p>
                   </div>
                   
                   {/* الوثائق */}
                   <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-4">
                      <div className="space-y-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">الرقم الوطني</p>
                         <p className="text-xs font-black text-orange-400">{player.nationalId || '--'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">الرقم الاتحادي</p>
                         <p className="text-xs font-black text-orange-400">{player.federalNumber || '--'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">الرقم الدولي</p>
                         <p className="text-xs font-black text-orange-400">{player.internationalId || '--'}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[8px] font-black text-slate-400 uppercase">تاريخ الانتساب</p>
                         <p className="text-xs font-black">{player.joinDate}</p>
                      </div>
                   </div>

                   {/* التواصل */}
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">رقم الهاتف</p>
                      <p className="text-sm font-black flex items-center gap-2"><Smartphone size={14}/> {player.phone || '--'}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">العنوان بالتفصيل</p>
                      <p className="text-[11px] font-black leading-relaxed">{player.address || '--'}</p>
                   </div>

                   {/* التعاقد */}
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                      <p className="text-[10px] font-black text-orange-400 border-b border-white/10 pb-2 uppercase tracking-widest">بيانات التعاقد المالي</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                         <div><p className="text-white/40">بداية العقد:</p><p className="font-black">{player.contractStart || '--'}</p></div>
                         <div><p className="text-white/40">نهاية العقد:</p><p className="font-black">{player.contractEnd || '--'}</p></div>
                      </div>
                      <div className="mt-2"><p className="text-white/40 text-[9px]">قيمة العقد / الراتب:</p><p className="text-lg font-black text-emerald-400 flex items-center gap-1"><Wallet size={16}/> {player.contractValue || '--'}</p></div>
                   </div>

                   {/* التحصيل العلمي */}
                   {(player.academicDegree || player.coachingCertificate) && (
                     <div className="bg-emerald-900/30 p-4 rounded-2xl border border-emerald-500/20 space-y-2">
                        <p className="text-[10px] font-black text-emerald-400 uppercase">المؤهلات والشهادات</p>
                        <p className="text-[11px] font-black">🎓 {player.academicDegree || 'لا يوجد درجة أكاديمية'}</p>
                        <p className="text-[11px] font-black">📜 {player.coachingCertificate || 'لا توجد شهادة تدريب'}</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* التاريخ الصحي والعقوبات */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm space-y-6">
             <div className="space-y-4">
                <h4 className="text-xs font-black text-red-600 flex items-center gap-2 uppercase tracking-tighter">
                  <HeartPulse size={18}/> السجل الطبي والإصابات
                </h4>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                   <p className="text-[10px] font-black text-slate-600 leading-relaxed italic">{player.injuries || player.medicalHistory || 'لا يوجد سجل إصابات مسجل حالياً.'}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-xs font-black text-orange-600 flex items-center gap-2 uppercase tracking-tighter">
                  <Gavel size={18}/> سجل العقوبات والانضباط
                </h4>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                   <p className="text-[10px] font-black text-slate-600 leading-relaxed italic">{player.penalties || 'لا توجد عقوبات إدارية مسجلة.'}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-xs font-black text-blue-900 flex items-center gap-2 uppercase tracking-tighter">
                  <StickyNote size={18}/> ملاحظات إدارية عامة
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <p className="text-[10px] font-black text-slate-600 leading-relaxed">{player.notes || 'لا توجد ملاحظات إضافية.'}</p>
                </div>
             </div>
          </div>

          {/* ملخص الحضور البصري */}
          <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm text-center">
             <PieChart className="mx-auto text-emerald-600 mb-4" size={32}/>
             <h3 className="font-black text-sm text-slate-900 mb-1">الالتزام بالبرنامج التدريبي</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">معدل الانضباط لهذا الشهر</p>
             <div className="relative w-32 h-32 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path className="text-slate-100" strokeDasharray="100, 100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500" strokeDasharray={`${attendanceData.rate}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-slate-900">%{attendanceData.rate}</div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="text-center"><p className="text-[8px] font-black text-slate-400">حضور</p><p className="font-black text-emerald-600">{attendanceData.present}</p></div>
                <div className="text-center"><p className="text-[8px] font-black text-slate-400">تأخير</p><p className="font-black text-orange-600">{attendanceData.late}</p></div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
