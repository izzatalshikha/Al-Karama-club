
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, CheckCircle2, Trash2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Category, Person, TrainingSession, Match, AppNotification } from './types';

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

// Initialize Supabase client safely
const supabaseUrl = 'https://kfwqoigsghlgigjriyxf.supabase.co';
const supabaseAnonKey = 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkaramah_pro_final_v1');
    const defaultCategories: Category[] = ['رجال', 'شباب', 'ناشئين', 'أشبال'];
    const defaultUsers: AppUser[] = [
      { id: 'admin-main', username: 'IZZAT', role: 'مدير', password: 'KSC@2026' },
    ];

    if (saved) return JSON.parse(saved);
    
    return {
      people: [], attendance: [], sessions: [], matches: [],
      categories: defaultCategories, users: defaultUsers,
      currentUser: null, notifications: [],
      globalCategoryFilter: 'الكل'
    };
  });

  const fetchData = useCallback(async () => {
    if (!state.currentUser || !supabase) return;
    setIsSyncing(true);
    try {
      const [
        { data: cats }, { data: ppl }, { data: sess }, { data: mtch }, { data: attn }
      ] = await Promise.all([
        supabase.from('categories').select('name'),
        supabase.from('people').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('attendance').select('*'),
      ]);

      setState(prev => ({
        ...prev,
        categories: cats && cats.length > 0 ? cats.map(c => c.name) : prev.categories,
        people: ppl || prev.people,
        sessions: sess || prev.sessions,
        matches: mtch || prev.matches,
        attendance: attn || prev.attendance
      }));
    } catch (error) {
      console.warn("Supabase fetch failed, working offline mode.");
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser]);

  useEffect(() => {
    if (state.currentUser && supabase) {
      fetchData();
    }
  }, [state.currentUser, fetchData]);

  useEffect(() => {
    const syncCategories = async () => {
      if (!supabase || !state.currentUser || state.currentUser.role !== 'مدير') return;
      try {
        await supabase.from('categories').delete().neq('name', '---'); 
        const insertData = state.categories.map(name => ({ name }));
        if (insertData.length > 0) {
          await supabase.from('categories').insert(insertData);
        }
      } catch (e) {
        console.error("Categories sync failed", e);
      }
    };
    syncCategories();
    localStorage.setItem('alkaramah_pro_final_v1', JSON.stringify(state));
  }, [state.categories, state.currentUser]);

  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('alkaramah_pro_final_v1', JSON.stringify(state));
    }
  }, [state]);

  const addLog = (message: string, details?: string, type: AppNotification['type'] = 'info') => {
    const newLog: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      details,
      type,
      timestamp: Date.now(),
      isRead: false
    };
    setState(prev => ({
      ...prev,
      notifications: [newLog, ...prev.notifications].slice(0, 50)
    }));
  };

  const markAllAsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const clearNotifications = () => {
    setState(prev => ({ ...prev, notifications: [] }));
  };

  const navigateToMatch = (id: string) => {
    setSelectedMatchId(id);
    setActiveTab('matches');
  };

  const navigateToSession = (id: string) => {
    setSelectedSessionId(id);
    setActiveTab('attendance');
  };

  if (!state.currentUser) {
    return <Login onLogin={(u) => setState(p => ({ ...p, currentUser: u }))} state={state} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'إدارة الكوادر', icon: Users },
    { id: 'attendance', label: 'سجل الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التمارين', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
  ];

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex h-screen bg-[#F0F4F8] font-['Tajawal'] text-right overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-56 bg-[#001F3F] text-white transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col no-print shadow-2xl`}>
        <div className="p-5 flex flex-col items-center border-b border-white/10">
          <ClubLogo size={50} />
          <h1 className="mt-3 font-black text-md">نادي الكرامة</h1>
          <p className="text-[8px] text-orange-400 font-black tracking-widest uppercase">Football Office</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => {
            if (item.adminOnly && state.currentUser?.role !== 'مدير') return null;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all font-black text-[11px] ${activeTab === item.id ? 'bg-orange-600 shadow-md' : 'hover:bg-white/5 text-blue-100'}`}>
                <Icon size={16} /> <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={() => setState(p => ({ ...p, currentUser: null }))} className="w-full flex items-center gap-2 p-2.5 rounded-lg text-red-400 hover:bg-red-900/20 font-black text-[11px] transition-colors">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b px-5 py-2.5 flex items-center justify-between no-print z-40 shadow-sm relative">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg"><Menu size={18}/></button>
            <h2 className="text-md font-black text-slate-800 uppercase tracking-tight">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            {isSyncing && <span className="text-[8px] font-black text-blue-500 animate-pulse mr-3">مزامنة سحابية...</span>}
          </div>
          
          <div className="flex items-center gap-2">
             <div className="relative">
               <button 
                 onClick={() => setShowNotifications(!showNotifications)} 
                 className={`relative p-2 rounded-xl transition-all ${showNotifications ? 'bg-orange-600 text-white' : 'bg-slate-50 text-[#001F3F] hover:bg-slate-100 border border-slate-200'}`}
               >
                 <Bell size={18} />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white animate-bounce">
                     {unreadCount}
                   </span>
                 )}
               </button>

               {/* Notifications Panel */}
               {showNotifications && (
                 <div className="absolute left-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50 p-4 border-b-2 border-slate-900 flex justify-between items-center">
                       <h3 className="font-black text-xs text-slate-900">مركز التنبيهات</h3>
                       <div className="flex gap-2">
                          <button onClick={markAllAsRead} className="text-[9px] font-black text-blue-600 hover:underline">قراءة الكل</button>
                          <button onClick={clearNotifications} className="text-[9px] font-black text-red-600 hover:underline">مسح</button>
                       </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                       {state.notifications.length > 0 ? state.notifications.map(notif => (
                         <div key={notif.id} className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-orange-50/50' : ''}`}>
                            <div className="flex gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : notif.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {notif.type === 'success' ? <CheckCircle2 size={16}/> : <Bell size={16}/>}
                               </div>
                               <div>
                                  <p className={`text-[11px] font-black leading-tight ${notif.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notif.message}</p>
                                  {notif.details && <p className="text-[9px] text-slate-400 mt-1 font-bold">{notif.details}</p>}
                                  <p className="text-[8px] text-slate-300 mt-2 font-black uppercase">{new Date(notif.timestamp).toLocaleTimeString('ar-SY')}</p>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="p-10 text-center space-y-3 opacity-30">
                            <Bell size={32} className="mx-auto text-slate-400"/>
                            <p className="text-[10px] font-black text-slate-500">لا يوجد تنبيهات جديدة حالياً</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}
             </div>
             
             <div className="flex items-center gap-2 pr-3 border-r border-slate-100 mr-2">
               <div className="text-left hidden sm:block">
                 <p className="font-black text-[9px] text-slate-800 leading-none">{state.currentUser.username}</p>
                 <p className="text-[7px] text-blue-600 font-black uppercase mt-1">{state.currentUser.role}</p>
               </div>
               <div className="w-8 h-8 bg-[#001F3F] text-white rounded-xl flex items-center justify-center font-black text-[12px] border-b-2 border-black">
                 {state.currentUser.username.charAt(0).toUpperCase()}
               </div>
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar bg-slate-50/30">
          <div className="max-w-5xl mx-auto pb-10">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={setState} onMatchClick={navigateToMatch} onSessionClick={navigateToSession} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={setState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addLog} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={setState} defaultSelectedId={selectedMatchId} addLog={addLog} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>

        <footer className="bg-white/95 backdrop-blur-md border-t py-1.5 px-5 flex justify-between items-center no-print z-40">
          <p className="text-[7px] font-black text-slate-500 tracking-tighter">نظام إدارة مكتب كرة القدم - نادي الكرامة</p>
          <p className="text-[7px] font-black text-[#001F3F] border-r-2 border-orange-500 pr-2">By: Izzat Amer Al-Shikha</p>
        </footer>
      </main>
      
      {/* Backdrop for notifications panel close on click outside */}
      {showNotifications && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
      )}
    </div>
  );
};

export default App;
