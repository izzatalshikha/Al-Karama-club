
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
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  Trash2,
  Share2,
  Database
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { 
  AppUser, 
  AppState,
  Category,
  Person,
  AppNotification,
  AttendanceRecord,
  TrainingSession,
  Match
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

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kfwqoigsghlgigjriyxf.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE";

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkaramah_data');
    const defaultCategories: Category[] = ['رجال', 'شباب', 'ناشئين', 'أشبال'];
    
    // مصفوفة المستخدمين الافتراضية (عدم الحذف أو التغيير)
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
      isDriveConnected: true, // مفعل افتراضياً للـ Supabase
      googleEmail: 'Supabase Database'
    };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlayerForReport, setSelectedPlayerForReport] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // جلب البيانات من Supabase عند التحميل الأول
  useEffect(() => {
    fetchFromSupabase();
  }, []);

  const fetchFromSupabase = async () => {
    setIsSyncing(true);
    try {
      // جلب البيانات من الجداول المختلفة
      const [
        { data: people, error: pErr },
        { data: attendance, error: aErr },
        { data: sessions, error: sErr },
        { data: matches, error: mErr },
        { data: users, error: uErr },
        { data: categories, error: cErr }
      ] = await Promise.all([
        supabase.from('people').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('users').select('*'),
        supabase.from('categories').select('*')
      ]);

      if (pErr || aErr || sErr || mErr || uErr || cErr) {
        console.warn("بعض الجداول قد لا تكون موجودة بعد، سيتم استخدام البيانات المحلية حالياً.");
      }

      const defaultUsers: AppUser[] = [
        { id: 'admin-main', username: 'Izzat', role: 'مدير', password: 'KSC@2026' },
        { id: 'u-men', username: 'MEN', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'رجال' },
        { id: 'u-18', username: 'U18', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'شباب' },
        { id: 'u-16', username: 'U16', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'ناشئين' },
        { id: 'u-14', username: 'U14', role: 'مدرب', password: 'KSC2026KSC', restrictedCategory: 'أشبال' },
      ];

      setState(prev => {
        // دمج المستخدمين مع الحفاظ على الافتراضيين
        const mergedUsers = [...defaultUsers];
        if (users) {
          users.forEach((u: any) => {
            if (!mergedUsers.some(mu => mu.username === u.username)) {
              mergedUsers.push(u);
            }
          });
        }

        return {
          ...prev,
          people: people || prev.people,
          attendance: attendance || prev.attendance,
          sessions: sessions || prev.sessions,
          matches: matches || prev.matches,
          categories: categories?.map((c: any) => c.name) || prev.categories,
          users: mergedUsers,
          lastSyncTimestamp: Date.now()
        };
      });
    } catch (error) {
      console.error('Error fetching from Supabase:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // المزامنة التلقائية عند حدوث تغييرات في الحالة
  useEffect(() => {
    const syncData = async () => {
      if (!state.currentUser) return;
      setIsSyncing(true);
      try {
        // تصفية المستخدمين الافتراضيين لعدم تكرارهم في القاعدة بشكل غير ضروري
        const customUsers = state.users.filter(u => 
          !['Izzat', 'MEN', 'U18', 'U16', 'U14'].includes(u.username)
        );

        // تنفيذ عملية المزامنة لكل جدول (استخدام upsert لضمان التحديث)
        await Promise.all([
          state.people.length > 0 && supabase.from('people').upsert(state.people),
          state.attendance.length > 0 && supabase.from('attendance').upsert(state.attendance),
          state.sessions.length > 0 && supabase.from('sessions').upsert(state.sessions),
          state.matches.length > 0 && supabase.from('matches').upsert(state.matches),
          customUsers.length > 0 && supabase.from('users').upsert(customUsers)
        ]);

        setState(prev => ({ ...prev, lastSyncTimestamp: Date.now() }));
      } catch (error) {
        console.error('Sync Error to Supabase:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // مزامنة مع تأخير بسيط (Debounce) لتجنب كثرة الطلبات
    const timer = setTimeout(() => {
      syncData();
    }, 3000);

    localStorage.setItem('alkaramah_data', JSON.stringify(state));
    return () => clearTimeout(timer);
  }, [state.people, state.attendance, state.sessions, state.matches, state.users]);

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
      notifications: prev.notifications.map(n => n.isRead ? n : { ...n, isRead: true })
    }));
  };

  if (!state.currentUser) {
    return <Login onLogin={handleLogin} state={state} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'الفئات واللاعبين', icon: Users },
    { id: 'attendance', label: 'سجل الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'جدول التمارين', icon: Calendar },
    { id: 'matches', label: 'جدول المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات وقاعدة البيانات', icon: Settings, adminOnly: true },
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
          <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-300 hover:bg-red-900/30 transition-all font-bold text-sm">
            <LogOut size={20} /><span>خروج من النظام</span>
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
            <div 
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                isSyncing ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
              title="حالة الاتصال بقاعدة البيانات السحابية (Supabase)"
            >
              <Database size={18} className={isSyncing ? 'animate-spin' : ''} />
              <span className="text-[10px] font-black hidden lg:block uppercase tracking-tighter">
                {isSyncing ? 'جاري المزامنة...' : 'متصل بـ Supabase'}
              </span>
            </div>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAllAsRead(); }}
                className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <Bell size={22} />
                {state.notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {state.notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
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
            {activeTab === 'dashboard' && <Dashboard state={state} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={setState} onOpenReport={openPlayerReport} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={setState} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={setState} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={setState} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={setState} />}
            {activeTab === 'player-report' && <PlayerReport state={state} player={selectedPlayerForReport} onBack={() => setActiveTab('squad')} />}

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