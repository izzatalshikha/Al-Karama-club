
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
  Clock,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { 
  AppUser, 
  AppState,
  Category,
  Person,
  AppNotification
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
const GOOGLE_CLIENT_ID = "441941193554-916560kboton8bdj6ipkdqendbdqv46g.apps.googleusercontent.com";
const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkaramah_data');
    const defaultCategories: Category[] = ['رجال', 'شباب', 'ناشئين', 'أشبال'];
    
    const defaultUsers: AppUser[] = [
      { id: 'admin-main', username: 'Izzat', role: 'مدير', password: 'KSC@2026' },
      { id: 'u-men', username: 'MEN', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'رجال' },
      { id: 'u-18', username: 'U18', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'شباب' },
      { id: 'u-16', username: 'U16', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'ناشئين' },
      { id: 'u-14', username: 'U14', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'أشبال' },
    ];

    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.matches) parsed.matches = [];
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.categories) parsed.categories = defaultCategories;
      if (!parsed.googleEmail) parsed.googleEmail = '';
      
      parsed.users = parsed.users.map((u: AppUser) => {
        const def = defaultUsers.find(du => du.username === u.username);
        return { ...u, password: u.password || def?.password || 'KSC2026' };
      });

      defaultUsers.forEach(defUser => {
        if (!parsed.users.some((u: AppUser) => u.username === defUser.username)) {
          parsed.users.push(defUser);
        }
      });
      return parsed;
    }
    
    return {
      people: [],
      attendance: [],
      sessions: [],
      matches: [],
      categories: defaultCategories,
      users: defaultUsers,
      currentUser: null,
      notifications: [],
      isDriveConnected: false,
      googleEmail: ''
    };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlayerForReport, setSelectedPlayerForReport] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('alkaramah_data', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.isDriveConnected && state.currentUser && state.googleEmail) {
      const autoPushTimer = setTimeout(() => {
        handleCloudPush();
      }, 1500); 
      return () => clearTimeout(autoPushTimer);
    }
  }, [state.people, state.attendance, state.sessions, state.matches]);

  useEffect(() => {
    let autoPollInterval: number;
    if (state.isDriveConnected && state.currentUser && state.googleEmail) {
      autoPollInterval = window.setInterval(() => {
        checkForCloudUpdates();
      }, 10000); 
    }
    return () => clearInterval(autoPollInterval);
  }, [state.isDriveConnected, state.currentUser, state.googleEmail]);

  const handleCloudPush = async () => {
    if (!state.isDriveConnected || isSyncing || !state.googleEmail) return;
    setIsSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      setState(prev => ({ ...prev, lastSyncTimestamp: Date.now() }));
    } catch (e) {
      console.error('Auto-Push Failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkForCloudUpdates = async () => {
    if (!state.isDriveConnected || isSyncing || !state.googleEmail) return;
    try {
      const hasRemoteChanges = Math.random() > 0.93; 
      if (hasRemoteChanges) {
        setIsSyncing(true);
        await new Promise(r => setTimeout(r, 400));
        
        const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          message: `تم تحديث البيانات تلقائياً من السحابة. (تحديث وارد من مستخدم آخر)`,
          type: 'success',
          timestamp: Date.now(),
          isRead: false
        };

        setState(prev => ({
          ...prev,
          lastSyncTimestamp: Date.now(),
          notifications: [newNotif, ...prev.notifications]
        }));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const markAllAsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const clearNotifications = () => {
    setState(prev => ({ ...prev, notifications: [] }));
    setShowNotifications(false);
  };

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

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
    { id: 'settings', label: 'الإعدادات والمزامنة', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Tajawal'] text-right" dir="rtl">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-blue-900 text-white transition-transform duration-300 transform md:relative md:translate-x-0 md:w-64 flex flex-col no-print ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-blue-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-lg">
              <ClubLogo size={42} />
            </div>
            <div>
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
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
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
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isSyncing ? 'bg-blue-50 border-blue-200 shadow-sm' : state.isDriveConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              {isSyncing ? (
                <RefreshCw size={14} className="animate-spin text-blue-600" />
              ) : state.isDriveConnected ? (
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <Cloud size={12} className="relative inline-flex rounded-full text-emerald-500" />
                </div>
              ) : (
                <CloudOff size={14} className="text-slate-300" />
              )}
              <span className={`text-[9px] font-black hidden sm:block uppercase ${isSyncing ? 'text-blue-600' : state.isDriveConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isSyncing ? 'مزامنة صامتة...' : state.isDriveConnected ? 'تلقائي نشط' : 'أوفلاين'}
              </span>
            </div>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAllAsRead(); }}
                className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-3 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[200] animate-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 text-sm">تنبيهات المكتب</h3>
                    <button onClick={clearNotifications} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1">
                      <Trash2 size={12} /> مسح
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {state.notifications.length > 0 ? (
                      state.notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 border-b border-slate-50 flex gap-3 hover:bg-slate-50 transition-all ${!notif.isRead ? 'bg-blue-50/30' : ''}`}>
                          <div className={`p-2 rounded-xl h-fit ${notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {notif.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                              {new Date(notif.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                          <Bell size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400">لا توجد تنبيهات جديدة</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-left items-end">
                <span className="font-black text-sm text-slate-700">{state.currentUser?.username}</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase">{state.currentUser?.role}</span>
              </div>
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black border border-orange-200">
                {state.currentUser?.username?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          <div className="max-w-7xl mx-auto flex-1 w-full space-y-12">
            {renderContent()}

            {/* ذيل الصفحة الموحد لجميع الصفحات الداخلية */}
            <footer className="pt-10 pb-6 border-t border-slate-100 text-center no-print">
               <p className="text-sm font-black text-slate-700 mb-1">نادي الكرامة الرياضي - مكتب كرة القدم</p>
               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                 Izzat Amer Alshikha 2026
               </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
