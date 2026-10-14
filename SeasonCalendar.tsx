import React, { useState, useMemo } from 'react';
import { AppState, Match, TrainingSession } from '../types';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';

interface SeasonCalendarProps {
  state: AppState;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  // Adjust to start on Sunday (0) or Monday (1) depending on locale, standard JS getDay: Sun=0, Mon=1...
  return day; 
};

export const SeasonCalendar: React.FC<SeasonCalendarProps> = ({ state, onMatchClick, onSessionClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const restrictedCat = state.currentUser?.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : [];
  const globalFilter = state.globalCategoryFilter;

  const monthMatches = useMemo(() => {
    return state.matches.filter(m => {
      const matchDate = new Date(m.date);
      return (!m.season || m.season === state.activeSeason) &&
             matchDate.getFullYear() === year && matchDate.getMonth() === month &&
             (!restrictedCat || allowedCategories.includes(m.category)) &&
             (globalFilter === 'الكل' || m.category === globalFilter);
    });
  }, [state.matches, year, month, state.activeSeason, restrictedCat, allowedCategories, globalFilter]);

  const monthSessions = useMemo(() => {
    return state.sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return (!s.season || s.season === state.activeSeason) &&
             sessionDate.getFullYear() === year && sessionDate.getMonth() === month &&
             (!restrictedCat || allowedCategories.includes(s.category)) &&
             (globalFilter === 'الكل' || s.category === globalFilter);
    });
  }, [state.sessions, year, month, state.activeSeason, restrictedCat, allowedCategories, globalFilter]);

  const renderCells = () => {
    const cells = [];
    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 border border-slate-100 rounded-xl"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const dayMatches = monthMatches.filter(m => m.date === dateStr);
      const daySessions = monthSessions.filter(s => s.date === dateStr);
      
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      cells.push(
        <div key={day} className={`min-h-[120px] p-2 border border-slate-100 rounded-xl flex flex-col gap-1 transition-all ${isToday ? 'bg-blue-50/50 ring-2 ring-blue-500/20' : 'bg-white'}`}>
          <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'}`}>{day}</span>
          
          <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
            {dayMatches.map(m => (
              <button 
                key={m.id} 
                onClick={() => onMatchClick(m.id)}
                className="text-right w-full bg-orange-50 hover:bg-orange-100 text-orange-700 p-1.5 rounded-lg border border-orange-200/50 transition-colors group flex flex-col gap-0.5"
              >
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[10px] font-black leading-tight">مباراة فريق {m.category} مع {m.opponent}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-orange-600/80 font-bold">
                  <span className="flex items-center gap-0.5"><Clock size={10}/> {m.time}</span>
                </div>
              </button>
            ))}
            {daySessions.map(s => (
              <button 
                key={s.id} 
                onClick={() => onSessionClick(s.id)}
                className="text-right w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200/50 transition-colors group flex flex-col gap-0.5"
              >
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[10px] font-black leading-tight">تمرين فريق {s.category} ({s.objective})</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-emerald-600/80 font-bold">
                  <span className="flex items-center gap-0.5"><Clock size={10}/> {s.time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
          <CalendarIcon className="text-orange-500" size={24} />
          تقويم الموسم
        </h3>
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-600 shadow-sm border border-transparent hover:border-slate-200">
            <ChevronRight size={20} />
          </button>
          <div className="w-32 text-center font-black text-slate-800">
            {monthNames[month]} {year}
          </div>
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-600 shadow-sm border border-transparent hover:border-slate-200">
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto hide-scrollbar">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {daysOfWeek.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 rounded-lg">
                {d}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {renderCells()}
          </div>
        </div>
      </div>
    </div>
  );
};
