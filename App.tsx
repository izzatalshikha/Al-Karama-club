
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, RefreshCw, User, CloudCheck, CloudOff, Cloud, Map, Sparkles, Archive, BarChart3
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification, Match } from './types';

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

      if (state.currentUser.restrictedCategory) {
        pplQuery.eq('category', state.currentUser.restrictedCategory);
        sessQuery.eq('category', state.currentUser.restrictedCategory);
        mtchQuery.eq('category', state.currentUser.restrictedCategory);
      }
      
      const [cats, ppl, sess, mtch, attn, usrs] = await Promise.all([
        supabase.from('categories').select('name'),
        pplQuery,
        sessQuery,
        mtchQuery,
        supabase.from('attendance').select('*'),
        usrsQuery,
      ]);

      if (ppl.error || mtch.error) throw new Error("فشل الاتصال بقاعدة البيانات");

      setState(prev => {
        const cloudPeople = (ppl.data && ppl.data.length > 0) ? ppl.data : prev.people;
        const cloudSessions = (sess.data && sess.data.length > 0) ? sess.data : prev.sessions;
        const cloudMatches = (mtch.data && mtch.data.length > 0) ? mtch.data : prev.matches;
        const cloudAttendance = (attn.data && attn.data.length > 0) ? attn.data : prev.attendance;
        const cloudUsers = (usrs.data && usrs.data.length > 0) ? usrs.data : prev.users;

        return {
          ...prev,
          categories: (cats.data && cats.data.length > 0) ? cats.data.map(c => c.name) : prev.categories,
          people: cloudPeople,
          sessions: cloudSessions,
          matches: cloudMatches.map((m: any) => ({
            ...m,
            pitch: m.pitch || m.location || '' 
          })),
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

    const tables = ['people', 'sessions', 'matches', 'attendance', 'app_users'];
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

      if (updatedState.people.length > 0) await supabase.from('people').upsert(sanitize(updatedState.people), { onConflict: 'id' });
      if (updatedState.sessions.length > 0) await supabase.from('sessions').upsert(sanitize(updatedState.sessions), { onConflict: 'id' });
      if (mappedMatches.length > 0) await supabase.from('matches').upsert(sanitize(mappedMatches), { onConflict: 'id' });
      if (updatedState.attendance.length > 0) await supabase.from('attendance').upsert(sanitize(updatedState.attendance), { onConflict: 'id' });
      if (updatedState.users.length > 0) await supabase.from('app_users').upsert(sanitize(updatedState.users), { onConflict: 'id' });

      setSyncStatus('synced');
      syncManager.current.lastLocalUpdate = Date.now();
    } catch (error: any) {
      setSyncStatus('error');
      addLog('خطأ في الرفع', error.message, 'error');
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
      
      const isManagerName = trimmedUser.toUpperCase() === 'IZZAT' || 
                           trimmedUser === 'عزت' || 
                           trimmedUser.includes('عزت عامر');
      
      const isManagerPass = trimmedPass === '123';

      if (isManagerName && isManagerPass) {
        const bootstrapUser: AppUser = { 
          id: 'root-izzat', 
          username: 'عزت عامر الشيخة', 
          role: 'مدير' 
        };
        setState(prev => ({ ...prev, currentUser: bootstrapUser }));
        return bootstrapUser;
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .ilike('username', trimmedUser)
        .maybeSingle(); 
        
      if (error) {
        console.error("Supabase Login Error:", error);
        if (error.code === 'PGRST205' || error.status === 503) {
           throw new Error("خطأ في الاتصال بالسحاب (205) - يرجى المحاولة لاحقاً");
        }
        throw new Error("حدث خطأ تقني في قاعدة البيانات.");
      }

      if (!data) {
        throw new Error("لا يوجد مستخدم بهذا الاسم في قاعدة البيانات");
      }

      if (data.password === trimmedPass) {
        const loggedUser: AppUser = { 
          id: data.id, 
          username: data.username, 
          role: data.role as any, 
          restrictedCategory: data.restrictedCategory 
        };
        setState(prev => ({ ...prev, currentUser: loggedUser }));
        return loggedUser;
      } else {
        throw new Error("كلمة المرور المدخلة غير صحيحة.");
      }
    } catch (err: any) {
      console.error("Auth Fail:", err.message);
      throw err; 
    }
  };

  if (!state.currentUser) return <Login onLoginAttempt={handleCloudLogin} />;

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'إدارة الفريق', icon: Users },
    { id: 'attendance', label: 'نظام الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'stats', label: 'إحصائيات اللاعبين', icon: BarChart3 },
    { id: 'archive', label: 'الأرشيف المركزي', icon: Archive },
    { id: 'ai', label: 'المحلل الذكي (AI)', icon: Sparkles },
    { id: 'logistics', label: 'المساعد اللوجستي', icon: Map },
    { id: 'settings', label: 'إعدادات النظام', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-right font-['Tajawal'] overflow-hidden" dir="rtl">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg' : 'text-white/70 hover:bg-white/5'}`}>
                <item.icon size={20} />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 font-bold">
              <LogOut size={20} /> <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/95 backdrop-blur-md border-b sticky top-0 z-40 px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <h1 className="text-xl font-black text-slate-800">{navItems.find(i => i.id === activeTab)?.label}</h1>
          </div>

          <div className="flex items-center gap-3 lg:gap-8">
            {state.currentUser && (
              <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-100 px-4 py-2 rounded-2xl shadow-sm transition-all hover:bg-white group">
                 <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-slate-400 hover:text-orange-600 transition-colors relative bg-white rounded-xl shadow-sm"
                 >
                    <Bell size={22} />
                    {state.notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
                    )}
                 </button>

                 <div className="flex items-center gap-3 border-r pr-4 border-slate-200">
                    <div className="hidden sm:flex flex-col text-left">
                       <span className="text-xs font-black text-slate-900 leading-none">مرحباً، {state.currentUser.username}</span>
                       <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter mt-1">{state.currentUser.role}</span>
                    </div>
                    <div className="w-10 h-10 bg-[#001F3F] text-white border-2 border-[#001F3F] rounded-xl flex items-center justify-center font-black shadow-md group-hover:scale-105 transition-transform">
                       {state.currentUser.username.charAt(0).toUpperCase()}
                    </div>
                 </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse'}`}>
                 {syncStatus === 'synced' ? <CloudCheck size={18} /> : <Cloud size={18} className="animate-bounce" />}
                 <span className="text-[10px] font-black uppercase tracking-tighter">{syncStatus === 'synced' ? 'مؤمن سحابياً' : 'جاري التأمين...'}</span>
              </div>
              <button onClick={() => fetchData(true)} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-[#001F3F] hover:text-white transition-all">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
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
            {activeTab === 'archive' && <ArchiveView state={state} onMatchClick={m => { setActiveTab('matches'); setSelectedMatchId(m); }} onSessionClick={s => { setActiveTab('attendance'); setSelectedSessionId(s); }} />}
            {activeTab === 'stats' && <StatsView state={state} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} />}
            {activeTab === 'ai' && <AIAssistant state={state} />}
            {activeTab === 'logistics' && <LocationAssistant />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>
        <ChatBot />
      </main>
    </div>
  );
};

export default App;
