
import React, { useMemo } from 'react';
import { AppState } from '../types';
import { BarChart3, TrendingUp, Trophy, Calendar, Users, Activity, PieChart } from 'lucide-react';

// Added missing VisualAnalyticsProps interface
interface VisualAnalyticsProps {
  state: AppState;
}

const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({ state }) => {
  const analytics = useMemo(() => {
    const matches = state.matches.filter(m => m.isCompleted);
    const wins = matches.filter(m => parseInt(m.ourScore) > parseInt(m.opponentScore)).length;
    const losses = matches.filter(m => parseInt(m.ourScore) < parseInt(m.opponentScore)).length;
    const draws = matches.filter(m => parseInt(m.ourScore) === parseInt(m.opponentScore)).length;
    
    // حساب معدل الحضور الأسبوعي بدقة إحصائية
    const categoryAttendance = state.categories.map(cat => {
      const catPlayers = state.people.filter(p => p.category === cat && p.role === 'لاعب');
      const catSessions = state.sessions.filter(s => s.category === cat && s.isCompleted);
      
      // المقام هو إجمالي الفرص المتاحة للحضور لجميع اللاعبين في الفئة
      const totalPotentialAttendance = catPlayers.length * catSessions.length;
      
      if (totalPotentialAttendance === 0) return { cat, rate: 0 };

      // حساب مجموع النقاط: حضور كامل = 1، تأخر = 0.5
      let totalPoints = 0;
      catPlayers.forEach(player => {
        const records = state.attendance.filter(a => a.personId === player.id && state.sessions.find(s => s.id === a.sessionId)?.category === cat);
        const present = records.filter(r => r.status === 'حاضر').length;
        const late = records.filter(r => r.status === 'متأخر').length;
        totalPoints += (present + (late * 0.5));
      });

      const rate = Math.round((totalPoints / totalPotentialAttendance) * 100);
      return { cat, rate };
    });

    return {
      wins,
      losses,
      draws,
      totalMatches: matches.length,
      categoryAttendance
    };
  }, [state.matches, state.attendance, state.sessions, state.categories, state.people]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0" dir="rtl">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
         {[
           { label: 'إجمالي المباريات', value: analytics.totalMatches, color: 'text-blue-600', bg: 'bg-blue-50/50' },
           { label: 'الانتصارات', value: analytics.wins, color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
           { label: 'التعادلات', value: analytics.draws, color: 'text-orange-600', bg: 'bg-orange-50/50' },
           { label: 'الخسائر', value: analytics.losses, color: 'text-red-700', bg: 'bg-red-50/50' }
         ].map((stat, i) => (stat.value > 0 || i === 0) && (
           <div key={stat.label} className={`${stat.bg} p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col items-center shadow-sm transition-transform hover:scale-105 duration-300`}>
              <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">{stat.label}</p>
              <h3 className={`text-4xl md:text-6xl font-black ${stat.color}`}>{stat.value}</h3>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Season Results Analysis (SVG Custom) */}
         <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-sm border border-slate-200">
            <h3 className="text-lg md:text-xl font-black mb-10 flex items-center gap-3 border-r-4 border-orange-500 pr-4 text-blue-900 leading-tight">
              <Trophy className="text-orange-500 shrink-0" /> تحليل نتائج الموسم
            </h3>
            <div className="flex items-end justify-around h-48 md:h-64 px-2 md:px-10 relative">
               <div className="absolute left-0 right-0 h-px bg-slate-100 bottom-0"></div>
               {[
                 { label: 'فوز', val: analytics.wins, color: 'bg-emerald-500' },
                 { label: 'تعادل', val: analytics.draws, color: 'bg-orange-500' },
                 { label: 'خسارة', val: analytics.losses, color: 'bg-red-500' }
               ].map(bar => {
                 const height = analytics.totalMatches > 0 ? (bar.val / analytics.totalMatches) * 100 : 0;
                 return (
                   <div key={bar.label} className="flex flex-col items-center gap-4 w-16 group">
                      <div className="w-full relative h-full flex items-end">
                         <div 
                          className={`${bar.color} rounded-t-xl transition-all duration-1000 shadow-sm w-full`} 
                          style={{ height: `${height}%`, minHeight: bar.val > 0 ? '10px' : '0' }}
                         >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 font-black text-xs text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {bar.val} مباراة
                            </div>
                         </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{bar.label}</span>
                   </div>
                 );
               })}
            </div>
         </div>

         {/* Commitment Analysis */}
         <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-sm border border-slate-200">
            <h3 className="text-lg md:text-xl font-black mb-10 flex items-center gap-3 border-r-4 border-blue-900 pr-4 text-blue-900 leading-tight">
              <Activity className="text-blue-900 shrink-0" /> معدلات الالتزام بالفئات
            </h3>
            <div className="space-y-6">
               {analytics.categoryAttendance.map(cat => (
                 <div key={cat.cat} className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                       <span className="text-xs font-black text-blue-900">{cat.cat}</span>
                       <span className="text-xs font-black text-orange-600 tabular-nums">%{cat.rate}</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full p-0.5 border border-slate-200 overflow-hidden shadow-inner">
                       <div 
                        className="h-full bg-blue-900 rounded-full transition-all duration-1000 shadow-sm" 
                        style={{ width: `${cat.rate}%` }}
                       />
                    </div>
                 </div>
               ))}
               {analytics.categoryAttendance.length === 0 && (
                 <p className="text-center py-10 text-slate-400 font-bold italic">لا توجد سجلات مطابقة لعرضها</p>
               )}
            </div>
         </div>
      </div>

      {/* Strategic Insight */}
      <div className="bg-slate-50 p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-slate-200 flex flex-col md:flex-row items-center gap-6 md:gap-10 shadow-sm">
         <div className="p-8 md:p-10 bg-orange-600 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-orange-600/20 shrink-0">
            <TrendingUp size={48} md:size={60} className="text-white" />
         </div>
         <div className="flex-1 space-y-4 text-center md:text-right">
            <h4 className="text-xl md:text-2xl font-black text-blue-900">الرؤية التحليلية الفنية</h4>
            <div className="text-base md:text-lg font-bold leading-loose text-slate-600 bg-white/70 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm italic">
              بناءً على التقرير الـمركزي، يظهر الـنادي استقراراً في {analytics.wins > analytics.losses ? 'ترجمة المجهود البدني إلى نتائج إيجابية' : 'مرحلة تطوير الـمستوى الفني'}. 
              معدل الالتزام العام هو <span className="text-blue-900 font-black">%{analytics.categoryAttendance.length > 0 ? Math.round(analytics.categoryAttendance.reduce((a,b)=>a+b.rate, 0)/analytics.categoryAttendance.length) : 0}</span>.
              يُنصح برفع وتيرة التدريب في الفئات الأقل من <span className="text-orange-600 font-black">70%</span> لضمان الجاهزية القصوى للمباريات الـقادمة.
            </div>
         </div>
      </div>
    </div>
  );
};

export default VisualAnalytics;
