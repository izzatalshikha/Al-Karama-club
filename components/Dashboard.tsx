
import React from 'react';
import { Users, Calendar, AlertCircle, TrendingUp, Trophy } from 'lucide-react';
import { AppState, Category } from '../types';

interface DashboardProps {
  state: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  // Filter data based on user restriction
  const filteredPeople = restrictedCat 
    ? state.people.filter(p => p.category === restrictedCat)
    : state.people;
    
  const filteredSessions = restrictedCat
    ? state.sessions.filter(s => s.category === restrictedCat)
    : state.sessions;

  const filteredMatches = restrictedCat
    ? state.matches.filter(m => m.category === restrictedCat)
    : state.matches;
    
  const filteredAttendance = restrictedCat
    ? state.attendance.filter(a => {
        const person = state.people.find(p => p.id === a.personId);
        return person?.category === restrictedCat;
      })
    : state.attendance;

  const categories: Category[] = restrictedCat ? [restrictedCat] : state.categories;
  
  // Calculate attendance percentage for the filtered data
  const presentCount = filteredAttendance.filter(a => a.status === 'حاضر').length;
  const attendanceRate = filteredAttendance.length > 0 
    ? Math.round((presentCount / filteredAttendance.length) * 100) 
    : 0;

  const stats = [
    { label: restrictedCat ? `كوادر ${restrictedCat}` : 'إجمالي الكوادر', value: filteredPeople.length, icon: Users, color: 'blue' },
    { label: 'تمارين مجدولة', value: filteredSessions.length, icon: Calendar, color: 'orange' },
    { label: 'مباريات قادمة', value: filteredMatches.length, icon: Trophy, color: 'emerald' },
    { label: 'نسبة الحضور', value: `${attendanceRate}%`, icon: TrendingUp, color: 'green' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info for Restricted Users */}
      {restrictedCat && (
        <div className="bg-gradient-to-l from-blue-900 to-blue-700 p-6 rounded-[2rem] shadow-xl text-white flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black">لوحة تحكم فئة {restrictedCat}</h2>
            <p className="text-blue-200 text-sm mt-1 font-bold">مرحباً بك كابتن {currentUser?.username} في نظام الإدارة الخاص بك</p>
          </div>
          <Trophy size={80} className="text-orange-500/20 absolute -left-4 -bottom-4 rotate-12" />
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const colors: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            orange: 'bg-orange-50 text-orange-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            green: 'bg-emerald-50 text-emerald-600',
          };
          
          return (
            <div key={idx} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center sm:items-start text-center sm:text-right hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-2xl ${colors[stat.color] || 'bg-slate-50'} mb-4`}>
                <Icon size={24} className="md:w-7 md:h-7" />
              </div>
              <h3 className="text-slate-500 text-[10px] md:text-sm font-black uppercase tracking-wider">{stat.label}</h3>
              <p className="text-xl md:text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Category/Staff Distribution */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            {restrictedCat ? `توزيع كوادر ${restrictedCat}` : 'توزيع الفئات'}
          </h3>
          <div className="space-y-6">
            {categories.map(cat => {
              const count = state.people.filter(p => p.category === cat).length;
              const total = restrictedCat ? filteredPeople.length : state.people.length;
              const percentage = total ? (count / total) * 100 : 0;
              
              if (restrictedCat) {
                // For restricted category, show breakdown by role
                const roles = ['لاعب', 'مدرب', 'إداري', 'طبيب'];
                return (
                  <div key="restricted-breakdown" className="space-y-5">
                    {roles.map(role => {
                      const roleCount = filteredPeople.filter(p => p.role === role).length;
                      const rolePercent = filteredPeople.length ? (roleCount / filteredPeople.length) * 100 : 0;
                      return (
                        <div key={role} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-black text-slate-700">{role}</span>
                            <span className="text-blue-600 font-bold">{roleCount}</span>
                          </div>
                          <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                            <div 
                              className="h-full bg-blue-600 rounded-full shadow-sm transition-all duration-1000" 
                              style={{ width: `${rolePercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-black text-slate-700">{cat}</span>
                    <span className="text-blue-600 font-bold">{count} عضو</span>
                  </div>
                  <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-blue-600 rounded-full shadow-sm transition-all duration-1000" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Matches & Training Combined View */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            آخر الفعاليات {restrictedCat && `(فئة ${restrictedCat})`}
          </h3>
          <div className="space-y-4">
            {filteredMatches.slice(0, 2).map(match => (
              <div key={match.id} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-white hover:shadow-md transition-all cursor-default">
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm text-emerald-600 hidden sm:block">
                  <Trophy size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">مباراة ضد {match.opponent}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{match.date} | {match.location}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black whitespace-nowrap">
                  مباراة
                </span>
              </div>
            ))}
            {filteredSessions.slice(0, 2).map(session => (
              <div key={session.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-default">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-blue-600 hidden sm:block">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">{session.objective}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{session.date} | {session.location}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black whitespace-nowrap">
                  تمرين
                </span>
              </div>
            ))}
            {filteredMatches.length === 0 && filteredSessions.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed">
                لا توجد فعاليات مجدولة حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
