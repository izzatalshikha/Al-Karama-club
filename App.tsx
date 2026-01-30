
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, RefreshCw, User, CloudCheck, CloudOff, Cloud, Map, Sparkles, Archive, BarChart3, Package
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification, Match, WarehouseItem } from './types';

// Components
import Dashboard from './components/Dashboard';
import SquadManagement from './components/SquadManagement';
import AttendanceTracker from './components/AttendanceTracker';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import ArchiveView from './components/ArchiveView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import PlayerReport from './components/PlayerReport';
import WarehouseManagement from './components/WarehouseManagement';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';
import LocationAssistant from './components/LocationAssistant';
import AIAssistant from './components/AIAssistant';
import ChatBot from './components/ChatBot';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const supabaseUrl = 'https://kfwqoigsghlgigjriyxf.supabase.co';
const supabaseAnonKey = 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  
  const syncManager = useRef({
    lastLocalUpdate: 0,
    isPushing: false,
    pendingFetch: false
  });

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkarama_cloud_v5');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      currentUser: null,
      categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [],
      sessions: [],
      matches: [],
      warehouse: [],
      attendance: [],
      users: [],
      notifications: [],
      globalCategoryFilter: 'الكل'
    };
  });

  useEffect(() => {
    localStorage.setItem('alkarama_cloud_v5', JSON.stringify(state));
  }, [state]);

  const addLog = useCallback((message: string, details?: string, type: AppNotification['type'] = 'info') => {
    const newNotif: AppNotification = {
      id: generateUUID(),
      message, details, type, timestamp: Date.now(), isRead: false
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
  }, []);

  const sanitize = (data: any[]) => {
    return data.map(item => {
      const cleanItem = JSON.parse(JSON.stringify(item));
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined) cleanItem[key] = null;
      });
      return cleanItem;
    });
  };

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!state.currentUser) return;
    if (!force && (syncManager.current.isPushing || (now - syncManager.current.lastLocalUpdate < 5000))) {
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const pplQuery = supabase.from('people').select('*');
      const sessQuery = supabase.from('sessions').select('*');
      const mtchQuery = supabase.from('matches').select('*');
      const usrsQuery = supabase.from('app_users').select('*');
      const wrhsQuery = supabase.from('warehouse').select('*');

      if (state.currentUser.restrictedCategory) {
        pplQuery.eq('category', state.currentUser.restrictedCategory);
        sessQuery.eq('category', state.currentUser.restrictedCategory);
        mtchQuery.eq('category', state.currentUser.restrictedCategory);
        wrhsQuery.or(`category.eq.${state.currentUser.restrictedCategory},category.eq.المخزن العام`);
      }
      
      const [cats, ppl, sess, mtch, attn, usrs, wrhs] = await Promise.all([
        supabase.from('categories').select('name'),
        pplQuery,
        sessQuery,
        mtchQuery,
        supabase.from('attendance').select('*'),
        usrsQuery,
        wrhsQuery
      ]);

      if (ppl.error || mtch.error) throw new Error("فشل الاتصال بقاعدة البيانات");

      setState(prev => {
        const cloudPeople = (ppl.data && ppl.data.length > 0) ? ppl.data : prev.people;
        const cloudSessions = (sess.data && sess.data.length > 0) ? sess.data : prev.sessions;
        const cloudMatches = (mtch.data && mtch.data.length > 0) ? mtch.data : prev.matches;
        const cloudWarehouse = (wrhs.data && wrhs.data.length > 0) ? wrhs.data : prev.warehouse;
        const cloudAttendance = (attn.data && attn.data.length > 0) ? attn.data : prev.attendance;
        const cloudUsers = (usrs.data && usrs.data.length > 0) ? usrs.data : prev.users;

        return {
          ...prev,
          categories: (cats.data && cats.data.length > 0) ? cats.data.map(c => c.name) : prev.categories,
          people: cloudPeople,
          sessions: cloudSessions.map((s: any) => ({
             ...s,
             isLocked: !!s.isCompleted
          })),
          matches: cloudMatches.map((m: any) => ({
            ...m,
            pitch: m.pitch || m.location || '' 
          })),
          warehouse: cloudWarehouse,
          attendance: cloudAttendance,
          users: cloudUsers
        };
      });
      setSyncStatus('synced');
    } catch (error: any) {
      setSyncStatus('error');
      console.error("Sync Error:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser]);

  useEffect(() => {
    if (!state.currentUser) return;
    fetchData(true);

    const tables = ['people', 'sessions', 'matches', 'attendance', 'app_users', 'warehouse'];
    const channels = tables.map(table => 
      supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchData())
        .subscribe()
    );

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [state.currentUser, fetchData]);

  const pushData = useCallback(async (updatedState: AppState) => {
    if (!updatedState.currentUser) return;

    syncManager.current.isPushing = true;
    setSyncStatus('syncing');
    try {
      const mappedMatches = updatedState.matches.map(m => {
        const base: any = {
          id: m.id,
          category: m.category,
          matchType: m.matchType,
          opponent: m.opponent,
          date: m.date,
          time: m.time,
          advancePayment: m.advancePayment || '0',
          isCompleted: !!m.isCompleted,
          ourScore: m.ourScore || '0',
          opponentScore: m.opponentScore || '0',
          events: m.events || [],
          lineup: m.lineup || {},
          notes: m.notes || '',
          stoppageTime1: m.stoppageTime1 || '0',
          stoppageTime2: m.stoppageTime2 || '0'
        };
        if (m.pitch !== undefined) base.pitch = m.pitch;
        return base;
      });

      const mappedSessions = updatedState.sessions.map(s => ({
        id: s.id,
        category: s.category,
        date: s.date,
        time: s.time,
        pitch: s.pitch || '',
        objective: s.objective || '',
        isCompleted: !!s.isCompleted
      }));

      if (updatedState.people.length > 0) await supabase.from('people').upsert(sanitize(updatedState.people), { onConflict: 'id' });
      if (mappedSessions.length > 0) await supabase.from('sessions').upsert(sanitize(mappedSessions), { onConflict: 'id' });
      if (mappedMatches.length > 0) await supabase.from('matches').upsert(sanitize(mappedMatches), { onConflict: 'id' });
      if (updatedState.attendance.length > 0) await supabase.from('attendance').upsert(sanitize(updatedState.attendance), { onConflict: 'id' });
      if (updatedState.users.length > 0) await supabase.from('app_users').upsert(sanitize(updatedState.users), { onConflict: 'id' });
      if (updatedState.warehouse.length > 0) await supabase.from('warehouse').upsert(sanitize(updatedState.warehouse), { onConflict: 'id' });

      setSyncStatus('synced');
      syncManager.current.lastLocalUpdate = Date.now();
    } catch (error: any) {
      setSyncStatus('error');
      addLog('خطأ في الرفع السحابي', error.message, 'error');
      console.error("Critical Push Error:", error);
    } finally {
      syncManager.current.isPushing = false;
    }
  }, [addLog]);

  const updateStateAndSync = async (updater: (prev: AppState) => AppState) => {
    syncManager.current.lastLocalUpdate = Date.now();
    let nextState: AppState | null = null;
    setState(prev => {
      nextState = updater(prev);
      return nextState;
    });
    if (nextState) {
      await pushData(nextState);
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    localStorage.removeItem('alkarama_cloud_v5');
  };

  const handleCloudLogin = async (usernameInput: string, passwordInput: string): Promise<AppUser | null> => {
    try {
      const trimmedUser = usernameInput.trim();
      const trimmedPass = passwordInput.trim();
      const isManagerName = trimmedUser.toUpperCase() === 'IZZAT' || trimmedUser === 'عزت' || trimmedUser.includes('عزت عامر');
      const isManagerPass = trimmedPass === '123';
      if (isManagerName && isManagerPass) {
        const bootstrapUser: AppUser = { id: 'root-izzat', username: 'عزت عامر الشيخة', role: 'مدير' };
        setState(prev => ({ ...prev, currentUser: bootstrapUser }));
        return bootstrapUser;
      }
      const { data, error } = await supabase.from('app_users').select('*').ilike('username', trimmedUser).maybeSingle(); 
      if (error) throw new Error("حدث خطأ تقني في قاعدة البيانات.");
      if (!data) throw new Error("لا يوجد مستخدم بهذا الاسم في قاعدة البيانات");
      if (data.password === trimmedPass) {
        const loggedUser: AppUser = { id: data.id, username: data.username, role: data.role as any, restrictedCategory: data.restrictedCategory };
        setState(prev => ({ ...prev, currentUser: loggedUser }));
        return loggedUser;
      } else { throw new Error("كلمة المرور المدخلة غير صحيحة."); }
    } catch (err: any) { throw err; }
  };

  if (!state.currentUser) return <Login onLoginAttempt={handleCloudLogin} />;

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'squad', label: 'الفريق', icon: Users },
    { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'warehouse', label: 'المستودع', icon: Package },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'archive', label: 'الأرشيف', icon: Archive },
    { id: 'ai', label: 'الذكاء الفني', icon: Sparkles },
    { id: 'logistics', label: 'اللوجستيك', icon: Map },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#000F21] flex text-right font-['Tajawal'] overflow-hidden" dir="rtl">
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 transition-all duration-500 lg:translate-x-0 lg:static lg:p-4 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} no-print`}>
        <div className="h-full bg-[#001F3F] rounded-[2rem] flex flex-col border-2 border-[#FF6B00]">
          <div className="p-8 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-2xl">
                 <ClubLogo size={45} />
              </div>
              <div className="flex flex-col text-white">
                <span className="font-black text-lg leading-tight">نادي الكرامة</span>
                <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-tighter">مكتب كرة القدم</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-white hover:text-[#FF6B00]"><X size={24} /></button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#FF6B00] text-white shadow-lg scale-[1.02]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={22} className={`${activeTab === item.id ? 'text-white' : 'group-hover:text-[#FF6B00]'} transition-colors`} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 font-bold transition-all">
              <LogOut size={22} /> <span className="text-sm">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-[#001F3F] z-40 px-6 lg:px-12 py-5 flex items-center justify-between no-print border-b border-[#FF6B00]">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 bg-white/5 rounded-2xl text-white shadow-lg"><Menu size={24} /></button>
            <div>
               <h1 className="text-2xl font-black text-white tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h1>
               <p className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-widest mt-0.5">Football Intelligence OS</p>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-4 bg-black/20 border border-white/10 px-5 py-2 rounded-2xl">
                 <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-white/60 hover:text-[#FF6B00] relative">
                    <Bell size={24} />
                    {state.notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF6B00] rounded-full border-2 border-[#001F3F]"></span>
                    )}
                 </button>
                 <div className="flex items-center gap-4 border-r pr-5 border-white/10">
                    <div className="hidden sm:flex flex-col text-left">
                       <span className="text-xs font-black text-white leading-none">{state.currentUser.username}</span>
                       <span className="text-[10px] font-black text-[#FF6B00] uppercase mt-1">{state.currentUser.role}</span>
                    </div>
                    <div className="w-10 h-10 bg-[#FF6B00] text-white border border-white/20 rounded-2xl flex items-center justify-center font-black text-lg">
                       {state.currentUser.username.charAt(0).toUpperCase()}
                    </div>
                 </div>
              </div>
            <div className="flex items-center gap-3">
              <div className={`hidden md:flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${syncStatus === 'synced' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-orange-500/10 border-[#FF6B00]/30 text-[#FF6B00]'}`}>
                 {syncStatus === 'synced' ? <CloudCheck size={18} /> : <Cloud size={18} />}
                 <span className="text-[10px] font-black uppercase tracking-tighter">{syncStatus === 'synced' ? 'مؤمن سحابياً' : 'جاري المزامنة...'}</span>
              </div>
              <button onClick={() => fetchData(true)} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-[#FF6B00] transition-all">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-[#000F21]">
          <div className="max-w-[1400px] mx-auto pb-24">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={setState} onMatchClick={m => { setActiveTab('matches'); setSelectedMatchId(m); }} onSessionClick={s => { setActiveTab('attendance'); setSelectedSessionId(s); }} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateStateAndSync as any} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addLog} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateStateAndSync as any} defaultSelectedId={selectedMatchId} addLog={addLog} />}
            {activeTab === 'warehouse' && <WarehouseManagement state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'archive' && <ArchiveView state={state} onMatchClick={m => { setActiveTab('matches'); setSelectedMatchId(m); }} onSessionClick={s => { setActiveTab('attendance'); setSelectedSessionId(s); }} />}
            {activeTab === 'stats' && <StatsView state={state} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} />}
            {activeTab === 'ai' && <AIAssistant state={state} />}
            {activeTab === 'logistics' && <LocationAssistant />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#001F3F] border-t border-[#FF6B00]/30 p-3 flex justify-around items-center z-[100] rounded-t-[2rem]">
           {navItems.slice(0, 5).map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-white/40'}`}>
                <item.icon size={24} />
             </button>
           ))}
        </nav>
        <ChatBot />
      </main>
    </div>
  );
};

export default App;
