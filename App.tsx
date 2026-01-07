
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Trophy,
  Bell,
  CheckCircle,
  Clock
} from 'lucide-react';
import { 
  AppUser, 
  AppState,
  Category,
  Person
} from './types';

// Components
import Dashboard from './components/Dashboard';
import SquadManagement from './components/SquadManagement';
import AttendanceTracker from './components/AttendanceTracker';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import SettingsView from './components/SettingsView';
import PlayerReport from './components/PlayerReport';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkaramah_data');
    const defaultCategories: Category[] = ['رجال', 'شباب', 'ناشئين', 'أشبال'];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.matches) parsed.matches = [];
      if (!parsed.users) parsed.users = [];
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.categories) parsed.categories = defaultCategories;
      
      const hasMainAdmin = parsed.users.some((u: AppUser) => u.username === 'Izzat');
      if (!hasMainAdmin) {
        parsed.users.push({ id: 'admin-main', username: 'Izzat', role: 'مدير' });
      }
      
      return parsed;
    }
    
    const mainAdmin: AppUser = { id: 'admin-main', username: 'Izzat', role: 'مدير' };
    
    const admins = Array.from({ length: 5 }, (_, i) => ({
      id: `admin-${i + 1}`,
      username: `admin${i + 1}`,
      role: 'مدير' as const
    }));

    const categoryUsers: AppUser[] = [
      { id: 'u-men', username: 'MEN', role: 'مدرب', restrictedCategory: 'رجال' },
      { id: 'u-u18', username: 'U18', role: 'مدرب', restrictedCategory: 'شباب' },
      { id: 'u-u16', username: 'U16', role: 'مدرب', restrictedCategory: 'ناشئين' },
      { id: 'u-u14', username: 'U14', role: 'مدرب', restrictedCategory: 'أشبال' }
    ];

    return {
      people: [],
      attendance: [],
      sessions: [],
      matches: [],
      categories: defaultCategories,
      users: [mainAdmin, ...admins, ...categoryUsers],
      currentUser: null,
      notifications: []
    };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPlayerForReport, setSelectedPlayerForReport] = useState<Person | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('alkaramah_data', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = (user: AppUser) => {
    setState(prev => ({ ...prev, currentUser: user }));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const openPlayerReport = (player: Person) => {
    setSelectedPlayerForReport(player);
    setActiveTab('player-report');
  };

  const markAllAsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const clearNotifications = () => {
    setState(prev => ({
      ...prev,
      notifications: []
    }));
  };

  if (!state.currentUser) {
    return <Login onLogin={handleLogin} state={state} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard state={state} />;
      case 'squad': return <SquadManagement state={state} setState={setState} onOpenReport={openPlayerReport} />;
      case 'attendance': return <AttendanceTracker state={state} setState={setState} />;
      case 'training': return <TrainingPlanner state={state} setState={setState} />;
      case 'matches': return <MatchPlanner state={state} setState={setState} />;
      case 'settings': return <SettingsView state={state} setState={setState} />;
      case 'player-report': return <PlayerReport state={state} player={selectedPlayerForReport} onBack={() => setActiveTab('squad')} />;
      default: return <Dashboard state={state} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'الفئات واللاعبين', icon: Users },
    { id: 'attendance', label: 'سجل الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'جدول التمارين', icon: Calendar },
    { id: 'matches', label: 'جدول المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات والمستخدمين', icon: Settings, adminOnly: true },
  ];

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Tajawal'] text-right" dir="rtl">
      {/* Toast Notifications */}
      <div className="fixed top-6 left-6 z-[300] space-y-3 pointer-events-none">
        {state.notifications.filter(n => !n.persistent && !n.isRead).slice(0, 3).map((notif) => (
          <div key={notif.id} className="pointer-events-auto animate-in slide-in-from-left-8 duration-300">
            <div className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] shadow-2xl border-2 backdrop-blur-md 
              ${notif.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' : 'bg-blue-50/90 border-blue-100 text-blue-800'}`}>
              {notif.type === 'success' ? <CheckCircle size={24} className="text-emerald-500" /> : <Bell size={24} className="text-blue-500" />}
              <span className="font-black text-sm">{notif.message}</span>
              <button onClick={() => setState(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === notif.id ? {...n, isRead: true} : n) }))}
                className="hover:bg-black/5 p-1 rounded-lg transition-colors mr-2">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-blue-900 text-white transition-transform duration-300 transform md:relative md:translate-x-0 md:w-64 flex flex-col no-print ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-blue-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-lg">
              <ClubLogo size={42} />
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-black text-lg leading-tight">نادي الكرامة</h1>
              <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">مكتب كرة القدم</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-blue-200"><X size={24} /></button>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.adminOnly && state.currentUser?.role !== 'مدير') return null;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); setSelectedPlayerForReport(null); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40' : 'hover:bg-blue-800 text-blue-100'}`}>
                <Icon size={22} /><span className="font-bold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-300 hover:bg-red-900/30 transition-all font-bold">
            <LogOut size={22} /><span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between no-print z-[150]">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-slate-600 md:hidden"><Menu size={24} /></button>
            <h2 className="text-lg md:text-xl font-black text-slate-800 truncate">
              {activeTab === 'player-report' ? `تقرير اللاعب: ${selectedPlayerForReport?.name}` : menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            
            {state.currentUser?.role === 'مدير' && (
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-3 rounded-2xl transition-all relative ${showNotifications ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white translate-x-1/4 -translate-y-1/4">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute top-full left-0 mt-3 w-[320px] md:w-[400px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                      <h3 className="font-black text-slate-800">تنبيهات النظام</h3>
                      <div className="flex gap-2">
                        <button onClick={markAllAsRead} className="text-[10px] font-bold text-blue-600 hover:underline">تحديد الكل كمقروء</button>
                        <button onClick={clearNotifications} className="text-[10px] font-bold text-red-500 hover:underline">مسح الكل</button>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {state.notifications.filter(n => n.persistent).length > 0 ? (
                        state.notifications.filter(n => n.persistent).slice().reverse().map(notif => (
                          <div key={notif.id} className={`p-4 border-b border-slate-50 transition-colors ${notif.isRead ? 'opacity-60' : 'bg-blue-50/30'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 p-2 rounded-xl ${notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                {notif.type === 'success' ? <Trophy size={16}/> : <Calendar size={16}/>}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 leading-tight">{notif.message}</p>
                                <div className="flex items-center gap-1 mt-1 text-slate-400">
                                  <Clock size={10} />
                                  <span className="text-[10px] font-bold">
                                    {new Date(notif.timestamp).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <Bell size={40} className="mx-auto text-slate-100 mb-2" />
                          <p className="text-slate-400 font-bold text-sm">لا توجد تنبيهات جديدة</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-left items-end">
                <span className="font-black text-sm text-slate-700">{state.currentUser?.username}</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">{state.currentUser?.role} {state.currentUser?.restrictedCategory ? `(${state.currentUser.restrictedCategory})` : ''}</span>
              </div>
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black shadow-sm border border-orange-200 uppercase">{state.currentUser?.username?.charAt(0)}</div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          <div className="max-w-7xl mx-auto flex-1 w-full">
            {renderContent()}
          </div>
          
          <footer className="mt-12 py-8 border-t border-slate-200 text-center no-print">
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">
              نظام إدارة مكتب كرة القدم - نادي الكرامة الرياضي
            </p>
            <p className="text-slate-400 text-xs mt-2 font-bold">
              Izzat Amer Alshikha 2026
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default App;
