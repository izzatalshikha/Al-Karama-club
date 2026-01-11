
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, RefreshCw, User
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification } from './types';

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

// Supabase Configuration (Strict Hardcoded)
const supabaseUrl = 'https://kfwqoigsghlgigjriyxf.supabase.co';
const supabaseAnonKey = 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [state, setState] = useState<AppState>(() => {
    const defaultAdmin: AppUser = { id: 'admin-main', username: 'IZZAT', role: 'مدير', password: 'KSC@2026' };
    const saved = localStorage.getItem('alkarama_local_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, currentUser: null }; // Force login
      } catch (e) { console.error(e); }
    }
    return {
      currentUser: null,
      categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [],
      sessions: [],
      matches: [],
      attendance: [],
      users: [defaultAdmin],
      notifications: [],
      globalCategoryFilter: 'الكل'
    };
  });

  // Save to local as safety net
  useEffect(() => {
    localStorage.setItem('alkarama_local_v2', JSON.stringify(state));
  }, [state]);

  const addLog = useCallback((message: string, details?: string, type: AppNotification['type'] = 'info') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      message, details, type, timestamp: Date.now(), isRead: false
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
  }, []);

  // Smart Merge Helper: Preserves local data not yet in cloud
  const smartMerge = (local: any[], remote: any[]) => {
    if (!remote || remote.length === 0) return local; // Preservation rule
    const remoteIds = new Set(remote.map(r => r.id));
    const localOnly = local.filter(l => !remoteIds.has(l.id));
    return [...remote, ...localOnly];
  };

  // Data Fetching Function (Optimized Smart Pull)
  const fetchData = useCallback(async () => {
    if (!state.currentUser) return;
    
    setIsSyncing(true);
    try {
      const [
        { data: cats, error: e1 },
        { data: ppl, error: e2 },
        { data: sess, error: e3 },
        { data: mtch, error: e4 },
        { data: attn, error: e5 },
        { data: usrs, error: e6 }
      ] = await Promise.all([
        supabase.from('categories').select('name'),
        supabase.from('people').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('users').select('*'),
      ]);

      if (e1 || e2 || e3 || e4 || e5 || e6) throw new Error("Cloud Error");

      setState(prev => ({
        ...prev,
        categories: (cats && cats.length > 0) ? cats.map(c => c.name) : prev.categories,
        people: smartMerge(prev.people, ppl || []),
        sessions: smartMerge(prev.sessions, sess || []),
        matches: smartMerge(prev.matches, mtch || []),
        attendance: smartMerge(prev.attendance, attn || []),
        users: smartMerge(prev.users, usrs || [])
      }));
      console.log("✅ Smart merge completed from Supabase");
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      addLog('خطأ في جلب البيانات', 'فشل الاتصال بالسحاب، سيتم استخدام البيانات المحلية حالياً.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser, addLog]);

  // Data Pushing Function (Secure Upsert)
  const pushData = useCallback(async (updatedState: AppState) => {
    if (!updatedState.currentUser) return;

    try {
      setIsSyncing(true);
      const results = await Promise.allSettled([
        updatedState.people.length > 0 ? supabase.from('people').upsert(updatedState.people, { onConflict: 'id' }) : Promise.resolve(),
        updatedState.sessions.length > 0 ? supabase.from('sessions').upsert(updatedState.sessions, { onConflict: 'id' }) : Promise.resolve(),
        updatedState.matches.length > 0 ? supabase.from('matches').upsert(updatedState.matches, { onConflict: 'id' }) : Promise.resolve(),
        updatedState.attendance.length > 0 ? supabase.from('attendance').upsert(updatedState.attendance, { onConflict: 'id' }) : Promise.resolve(),
        updatedState.users.length > 0 ? supabase.from('users').upsert(updatedState.users, { onConflict: 'id' }) : Promise.resolve()
      ]);

      const failed = results.some(r => r.status === 'rejected');
      if (failed) {
        addLog('فشلت المزامنة', 'البيانات محفوظة في جهازك فقط، يرجى التحقق من الإنترنت.', 'warning');
      } else {
        console.log("✅ Cloud Sync Successful");
      }
    } catch (error) {
      console.error("❌ Global Push Error:", error);
      addLog('خطأ تقني في المزامنة', 'لم نتمكن من الوصول لقاعدة البيانات السحابية.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [addLog]);

  // Initial fetch and periodical sync
  useEffect(() => {
    if (state.currentUser) {
      fetchData();
      const interval = setInterval(fetchData, 60000); // 1 minute interval for passive sync
      return () => clearInterval(interval);
    }
  }, [state.currentUser, fetchData]);

  // State update wrapper
  const updateStateAndSync = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const newState = updater(prev);
      pushData(newState); // Push immediately on change
      return newState;
    });
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('dashboard');
  };

  if (!state.currentUser) {
    return <Login onLogin={(user) => setState(prev => ({ ...prev, currentUser: user }))} state={state} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'إدارة الفريق', icon: Users },
    { id: 'attendance', label: 'نظام الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-right font-['Tajawal'] overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-[#001F3F] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} no-print shadow-2xl`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <ClubLogo size={40} />
              <span className="font-black text-lg tracking-tight">نادي الكرامة</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2"><X size={24} /></button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={20} />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors font-bold">
              <LogOut size={20} /> <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <h1 className="text-xl font-black text-slate-800">
              {navItems.find(i => i.id === activeTab)?.label || (activeTab === 'report' ? 'التقرير الفني' : 'تفاصيل')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end px-4 border-r-2 border-orange-500">
              <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">المسؤول عن النظام</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#001F3F]">{state.currentUser.username}</span>
                <User size={14} className="text-orange-600" />
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isSyncing ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-100'}`}>
               <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`}></div>
               <span className="text-[10px] font-black text-slate-700 uppercase">{isSyncing ? 'مزامنة نشطة' : 'سحابة مربوطة'}</span>
            </div>

            <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl relative border ${showNotifications ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute left-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden z-[100] text-right">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-xs uppercase text-slate-800">مركز التنبيهات</h3>
                    <button onClick={() => setState(p => ({ ...p, notifications: p.notifications.map(n => ({...n, isRead: true})) }))} className="text-[10px] text-blue-600 font-bold">قراءة الكل</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {state.notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic opacity-50">لا توجد تنبيهات</div>
                    ) : (
                      state.notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-orange-50/50' : ''}`}>
                          <p className="text-[11px] font-black text-slate-700 leading-tight">{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{new Date(n.timestamp).toLocaleTimeString('ar-SY')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={setState} onMatchClick={m => { setActiveTab('matches'); setSelectedMatchId(m); }} onSessionClick={s => { setActiveTab('attendance'); setSelectedSessionId(s); }} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateStateAndSync as any} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addLog} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateStateAndSync as any} defaultSelectedId={selectedMatchId} addLog={addLog} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>

        <footer className="bg-white/95 backdrop-blur-md border-t py-1.5 px-5 flex justify-between items-center no-print z-40">
           <p className="text-[7px] font-black text-slate-500 tracking-tighter">نادي الكرامة الرياضي - مكتب كرة القدم المركزي</p>
           <p className="text-[7px] font-black text-[#001F3F] border-r-2 border-orange-500 pr-2">By: Izzat Amer Al-Shikha | النسخة المحمية (Smart Merge Activated)</p>
        </footer>
      </main>
      
      {showNotifications && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
      )}
    </div>
  );
};

export default App;
