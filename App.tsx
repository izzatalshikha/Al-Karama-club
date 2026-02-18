
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, Trophy, 
  Activity, HeartPulse, PenTool, Package, Printer, Loader2, CheckCircle2, AlertCircle, RefreshCw, Compass
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
import WarehouseManagement from './components/WarehouseManagement';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';
import ChatBot from './components/ChatBot';
import TacticalBoard from './components/TacticalBoard';
import MedicalCenter from './components/MedicalCenter';
import VisualAnalytics from './components/VisualAnalytics';
import LocationAssistant from './components/LocationAssistant';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const supabase = createClient(
  'https://kfwqoigsghlgigjriyxf.supabase.co',
  'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic'
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('eagle_os_v3');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {
      currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [], sessions: [], matches: [], warehouse: [], technicalReports: [],
      attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], 
      globalCategoryFilter: 'الكل'
    };
  });

  const addNotify = useCallback((message: string, type: AppNotification['type'] = 'info') => {
    const id = generateUUID();
    setNotifications(prev => [{ id, message, type, timestamp: Date.now() }, ...prev].slice(0, 3));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  const fetchAllData = useCallback(async (user: AppUser) => {
    setSyncStatus('syncing');
    try {
      const isManager = user.role === 'مدير';
      const cat = user.restrictedCategory;

      let peopleQ = supabase.from('people').select('*');
      let matchesQ = supabase.from('matches').select('*');
      let sessionsQ = supabase.from('sessions').select('*');
      let attendanceQ = supabase.from('attendance').select('*');
      let warehouseQ = supabase.from('warehouse').select('*');
      let usersQ = supabase.from('app_users').select('*');
      let injuriesQ = supabase.from('injuries').select('*');
      let tacticalQ = supabase.from('tactical_plans').select('*');

      if (!isManager && cat) {
        peopleQ = peopleQ.eq('category', cat);
        matchesQ = matchesQ.eq('category', cat);
        sessionsQ = sessionsQ.eq('category', cat);
        warehouseQ = warehouseQ.or(`category.eq.${cat},category.eq.المخزن العام`);
      }

      const [p, m, s, a, w, u, inj, tac] = await Promise.all([
        peopleQ, matchesQ, sessionsQ, attendanceQ, warehouseQ, usersQ, injuriesQ, tacticalQ
      ]);

      setState(prev => ({
        ...prev,
        currentUser: user,
        people: p.data || [],
        matches: m.data || [],
        sessions: s.data || [],
        attendance: a.data || [],
        warehouse: w.data || [],
        users: u.data || [],
        injuries: inj.data || [],
        tacticalPlans: tac.data || [],
        globalCategoryFilter: (!isManager && cat) ? cat : 'الكل'
      }));
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser) return;

    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        fetchAllData(state.currentUser!);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.currentUser, fetchAllData]);

  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('eagle_os_v3', JSON.stringify(state));
    }
  }, [state]);

  const onLoginAttempt = async (u: string, p: string) => {
    setSyncStatus('syncing');
    const inputU = u.trim();
    
    // 1. التحقق من حساب المدير الرئيسي (Backdoor Protection)
    if ((inputU === 'عزت' || inputU.toUpperCase() === 'IZZAT') && p === '123') {
      const rootUser: AppUser = { id: 'root', username: 'عزت عامر الشيخة', role: 'مدير' };
      await fetchAllData(rootUser);
      return rootUser;
    }

    // 2. التحقق من السحابة مباشرة (Cloud Auth) - وهذا هو الحل لمشكلتك
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', inputU)
        .eq('password', p)
        .maybeSingle();

      if (data) {
        await fetchAllData(data);
        return data;
      }
    } catch (err) {
      console.error("Cloud Login Error:", err);
    }

    // 3. التحقق من الذاكرة المحلية كخيار أخير (Offline Fallback)
    const localUser = state.users.find(usr => usr.username === inputU && usr.password === p);
    if (localUser) {
      await fetchAllData(localUser);
      return localUser;
    }

    setSyncStatus('error');
    return null;
  };

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const getPlayerSuspension = useCallback((playerId: string, category: string) => {
    const playerMatches = state.matches
      .filter(m => m.category === category && m.isCompleted)
      .sort((a, b) => a.date.localeCompare(b.date));

    let accumulatedYellows = 0;
    let hasActiveRed = false;
    let suspendedForNext = false;

    playerMatches.forEach(m => {
      const matchYellows = m.events.filter(e => e.type === 'yellow' && (e.player === playerId)).length;
      const matchRed = m.events.some(e => e.type === 'red' && (e.player === playerId));

      if (hasActiveRed) {
        suspendedForNext = true;
        hasActiveRed = false;
      } else if (accumulatedYellows >= 3) {
        suspendedForNext = true;
        accumulatedYellows = 0;
      } else {
        suspendedForNext = false;
      }

      accumulatedYellows += matchYellows;
      if (matchRed) hasActiveRed = true;
    });

    return { 
      isSuspended: suspendedForNext || hasActiveRed, 
      currentYellows: accumulatedYellows,
      hasActiveRed
    };
  }, [state.matches]);

  if (!state.currentUser) return <Login onLoginAttempt={onLoginAttempt} />;

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'squad', label: 'الفريق', icon: Users },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
    { id: 'tactics', label: 'التكتيك', icon: PenTool },
    { id: 'medical', label: 'الطبابة', icon: HeartPulse },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'logistics', label: 'المساعد اللوجستي', icon: Compass },
    { id: 'warehouse', label: 'المستودع', icon: Package },
    { id: 'analytics', label: 'التحليلات', icon: Activity },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ].filter(item => {
    if (state.currentUser?.role !== 'مدير' && item.id === 'settings') return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#020617] text-[#f8fafc] font-['IBM_Plex_Sans_Arabic'] overflow-hidden" dir="rtl">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#0f172a] border-l border-white/5 transition-all duration-300 flex flex-col z-50 shadow-2xl`}>
        <div className="p-8 flex items-center justify-center gap-4">
           <ClubLogo size={isSidebarOpen ? 50 : 35} />
           {isSidebarOpen && <span className="text-xl font-black text-white tracking-tight bg-gradient-to-r from-orange-500 to-white bg-clip-text text-transparent">EAGLE OS</span>}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-white/5 rounded-xl p-3 mb-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold">
                {state.currentUser.username.charAt(0)}
             </div>
             {isSidebarOpen && (
               <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate">{state.currentUser.username}</p>
                  <p className="text-[8px] text-slate-500 uppercase">{state.currentUser.role}</p>
               </div>
             )}
          </div>
          <button onClick={() => setState(prev => ({ ...prev, currentUser: null }))} 
            className="w-full p-3 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-3">
            <LogOut size={18} /> {isSidebarOpen && <span className="text-sm font-semibold">خروج</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-40">
          <div className="flex items-center gap-6">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 rounded-xl hover:bg-orange-500 transition-all">
                <Menu size={20} />
             </button>
             <h1 className="text-xl font-bold tracking-tight">{navItems.find(n => n.id === activeTab)?.label}</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 text-[10px] font-bold ${syncStatus === 'synced' ? 'text-emerald-500' : 'text-orange-500'}`}>
                {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin"/> : <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>}
                {syncStatus === 'synced' ? 'EAGLE OS: Online' : 'EAGLE OS: Syncing...'}
             </div>
             <button onClick={() => window.print()} 
                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center gap-2">
                <Printer size={16} /> طباعة
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div id="report-section" className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={updateState as any} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'tactics' && <TacticalBoard state={state} setState={updateState} />}
            {activeTab === 'medical' && <MedicalCenter state={state} setState={updateState} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} />}
            {activeTab === 'logistics' && <LocationAssistant />}
            {activeTab === 'warehouse' && <WarehouseManagement state={state} setState={updateState} addLog={addNotify} />}
            {activeTab === 'analytics' && <VisualAnalytics state={state} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} setState={updateState} onBack={() => setActiveTab('squad')} addLog={addNotify} />}
          </div>
        </div>

        <div className="fixed bottom-8 left-8 z-[999] space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-xl shadow-2xl border-r-4 min-w-[200px] flex items-center gap-3 bg-[#1e293b] text-white animate-in slide-in-from-left-full ${n.type === 'success' ? 'border-emerald-500' : n.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}>
              {n.type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-red-500" />}
              <span className="text-xs font-bold">{n.message}</span>
            </div>
          ))}
        </div>
      </div>
      <ChatBot state={state} />
    </div>
  );
};

export default App;
