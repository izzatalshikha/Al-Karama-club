
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, Trophy, Medal, Briefcase,
  Activity, HeartPulse, PenTool, Package, Printer, Loader2, CheckCircle2, AlertCircle, RefreshCw, Compass, MapPin, ChevronDown, ChevronLeft, Baby
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification } from './types';

// Components
import Dashboard from './components/Dashboard';
import SquadManagement from './components/SquadManagement';
import StaffManagement from './components/StaffManagement';
import AttendanceTracker from './components/AttendanceTracker';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import SettingsView from './components/SettingsView';
import PlayerReport from './components/PlayerReport';
import WarehouseManagement from './components/WarehouseManagement';
import TournamentsView from './components/TournamentsView';
import ServicesView from './components/ServicesView';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';
import ChatBot from './components/ChatBot';
import MedicalCenter from './components/MedicalCenter';

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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('eagle_os_v3_tab') || 'dashboard');
  
  // Custom ref for main scrolling container
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('eagle_os_v3_tab', activeTab);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('eagle_os_v3');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return {
      currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'],
      people: [], sessions: [], matches: [], warehouse: [], technicalReports: [], tournaments: [], tournamentStages: [], tournamentTeams: [], tournamentStageTeams: [], tournamentMatches: [],
      attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], servicesDirectory: [],
      globalCategoryFilter: 'الكل'
    };
  });

  const addNotify = useCallback((message: string, type: AppNotification['type'] = 'info') => {
    const id = generateUUID();
    setNotifications(prev => [{ id, message, type, timestamp: Date.now() }, ...prev].slice(0, 3));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  const fetchAllData = useCallback(async (user: AppUser, silent: boolean = false) => {
    if (!user) return;
    if (!silent) setSyncStatus('syncing');
    try {
      const isManager = user.role === 'مدير';
      const isWarehouse = user.role === 'أمين مستودع';
      const cat = user.restrictedCategory;

      let peopleQ = supabase.from('people').select('*');
      let matchesQ = supabase.from('matches').select('*');
      let sessionsQ = supabase.from('sessions').select('*');
      let attendanceQ = supabase.from('attendance').select('*');
      let warehouseQ = supabase.from('warehouse').select('*');
      let usersQ = supabase.from('app_users').select('*');
      let injuriesQ = supabase.from('injuries').select('*');
      let tacticalQ = supabase.from('tactical_plans').select('*');
      let categoriesQ = supabase.from('categories').select('*');
      let tournamentsQ = supabase.from('tournaments').select('*');
      let tourStagesQ = supabase.from('tournament_stages').select('*');
      let tourTeamsQ = supabase.from('tournament_teams').select('*');
      let tourSTeamsQ = supabase.from('tournament_stage_teams').select('*');
      let tourMatchesQ = supabase.from('tournament_matches').select('*');
      let servicesQ = supabase.from('services_directory').select('*');

      if (isManager) {
      } else if (isWarehouse) {
        peopleQ = peopleQ.limit(0);
        matchesQ = matchesQ.limit(0);
        sessionsQ = sessionsQ.limit(0);
        attendanceQ = attendanceQ.limit(0);
        injuriesQ = injuriesQ.limit(0);
        tacticalQ = tacticalQ.limit(0);
        tournamentsQ = tournamentsQ.limit(0);
        tourStagesQ = tourStagesQ.limit(0);
        tourTeamsQ = tourTeamsQ.limit(0);
        tourSTeamsQ = tourSTeamsQ.limit(0);
        tourMatchesQ = tourMatchesQ.limit(0);
        servicesQ = servicesQ.limit(0);
      } else if (cat) {
        peopleQ = peopleQ.eq('category', cat);
        matchesQ = matchesQ.eq('category', cat);
        sessionsQ = sessionsQ.eq('category', cat);
        warehouseQ = warehouseQ.or(`category.eq.${cat},category.eq.المخزن العام`);
        injuriesQ = injuriesQ.eq('category', cat);
        tacticalQ = tacticalQ.eq('category', cat);
        tournamentsQ = tournamentsQ.eq('category', cat);
      }

      const [p, m, s, a, w, u, inj, tac, catsReq, toursReq, tStagesReq, tTeamsReq, tSTeamsReq, tMatchesReq, servicesReq] = await Promise.all([
        peopleQ, matchesQ, sessionsQ, attendanceQ, warehouseQ, usersQ, injuriesQ, tacticalQ, categoriesQ,
        tournamentsQ, tourStagesQ, tourTeamsQ, tourSTeamsQ, tourMatchesQ, servicesQ
      ]);

      if (u.error) console.error("Error fetching users:", u.error);
      if (catsReq.error) console.error("Error fetching categories:", catsReq.error);

      console.log("FETCH RESULT:", { people: p.data?.length, users: u.data?.length, warehouse: w.data?.length });

      const peopleCount = p.data?.length || 0;
      const playersCount = p.data?.filter(person => person.role === 'لاعب').length || 0;
      const staffCount = peopleCount - playersCount;
      const accountsCount = u.data?.length || 0;
      
      const fetchedCats = catsReq.data?.map(c => c.name) || [];

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
        categories: fetchedCats.length > 0 ? fetchedCats : prev.categories,
        globalCategoryFilter: (!isManager && !isWarehouse && cat) ? cat : 'الكل',
        tournaments: toursReq.data || [],
        tournamentStages: tStagesReq.data || [],
        tournamentTeams: tTeamsReq.data || [],
        tournamentStageTeams: tSTeamsReq.data || [],
        tournamentMatches: tMatchesReq.data || [],
        servicesDirectory: servicesReq.data || []
      }));
      setSyncStatus('synced');
      if (!silent) {
        addNotify(`تم استدعاء البيانات: ${playersCount} لاعب، ${staffCount} كادر، ${accountsCount} حساب`, 'success');
      }
    } catch (e) {
      setSyncStatus('error');
      if (!silent) addNotify('فشل في استدعاء البيانات من السحابة', 'error');
    }
  }, [addNotify]);

  const syncToCloud = useCallback(async (table: string, data: any | any[]) => {
    setSyncStatus('syncing');
    try {
      const { error } = await supabase.from(table).upsert(data);
      if (error) throw error;
      setSyncStatus('synced');
      return true;
    } catch (e: any) {
      setSyncStatus('error');
      addNotify(`خطأ في مزامنة ${table}: ${e.message}`, 'error');
      return false;
    }
  }, [addNotify]);

  useEffect(() => {
    if (!state.currentUser) return;

    let debounceTimer: any;
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchAllData(state.currentUser!, true), 2000);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [state.currentUser, fetchAllData]);

  useEffect(() => {
    if (state.currentUser) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('eagle_os_v3', JSON.stringify(state));
      }, 500);
      return () => clearTimeout(timeoutId);
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

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  }, []);

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

  const [isActivitiesOpen, setActivitiesOpen] = useState(false);

  if (!state.currentUser) return <Login onLoginAttempt={onLoginAttempt} />;

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'squad', label: 'اللاعبين', icon: Users },
    { id: 'staff', label: 'المدربين والكوادر', icon: Briefcase },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
    { id: 'medical', label: 'الطبابة', icon: HeartPulse },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'baraaem-matches', label: 'مباريات البراعم', icon: Baby },
    { id: 'tournaments', label: 'البطولات', icon: Medal },
    { id: 'services', label: 'خدمات', icon: MapPin },
    { id: 'warehouse', label: 'المستودع', icon: Package },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ].filter(item => {
    if (state.currentUser?.role !== 'مدير' && item.id === 'settings') return false;
    return true;
  });

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-['IBM_Plex_Sans_Arabic'] overflow-hidden print:h-auto print:block print:overflow-visible" dir="rtl">
      {/* Sidebar - Hidden on mobile, Drawer on mobile toggle */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0 w-72' : 'translate-x-full lg:translate-x-0 w-72 lg:w-24'} 
        bg-blue-900 border-l border-blue-800 transition-all duration-300 flex flex-col z-[100] shadow-2xl fixed inset-y-0 right-0 lg:static h-full overflow-hidden print:hidden
      `}>
        <div className="p-8 flex items-center justify-center gap-4 shrink-0">
           <ClubLogo size={(isSidebarOpen || !isSidebarOpen) ? 45 : 35} />
           {isSidebarOpen && <span className="text-xl font-black text-white tracking-tight whitespace-nowrap">EAGLE OS</span>}
           {!isSidebarOpen && <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white"><Menu/></button>}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/10 text-blue-100 hover:text-white'}`}>
              <item.icon size={20} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-0'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto shrink-0">
          <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {state.currentUser.username.charAt(0)}
             </div>
             <div className={`min-w-0 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <p className="text-[10px] font-bold truncate text-white">{state.currentUser.username}</p>
                <p className="text-[8px] text-blue-100 uppercase font-black">{state.currentUser.role}</p>
             </div>
          </div>
          <button onClick={() => {
              setState({
                currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'],
                people: [], sessions: [], matches: [], warehouse: [], technicalReports: [], tournaments: [], tournamentStages: [], tournamentTeams: [], tournamentStageTeams: [], tournamentMatches: [],
                attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], servicesDirectory: [],
              });
              localStorage.removeItem('eagle_os_v3');
              localStorage.removeItem('eagle_os_v3_tab');
            }} 
            className="w-full p-3 rounded-xl text-white bg-red-600/30 hover:bg-red-600 transition-all flex items-center justify-center gap-3 border border-red-500/30">
            <LogOut size={18} className="shrink-0" /> <span className={`text-sm font-semibold text-white whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>خروج</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-blue-900/60 backdrop-blur-sm z-[90] lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative print:block print:overflow-visible print:h-auto">
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between z-40 print:hidden">
          <div className="flex items-center gap-3 md:gap-6">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-slate-100 text-blue-900 rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                <Menu size={20} />
             </button>
             <h1 className="text-sm md:text-xl font-bold tracking-tight text-blue-900 whitespace-nowrap">{navItems.find(n => n.id === activeTab)?.label}</h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
             <button onClick={() => state.currentUser && fetchAllData(state.currentUser)} 
                className="hidden sm:flex p-2.5 bg-slate-100 text-blue-900 rounded-xl hover:bg-orange-500 hover:text-white transition-all group"
                title="تحديث البيانات من السحابة">
                <RefreshCw size={20} className={syncStatus === 'syncing' ? 'animate-spin text-orange-500' : 'group-hover:rotate-180 transition-transform duration-500'} />
             </button>
             <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600">
                {syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin"/> : <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>}
                <span className={syncStatus === 'synced' ? 'text-emerald-700' : 'text-orange-600'}>
                  {syncStatus === 'synced' ? 'EAGLE OS: Online' : 'EAGLE OS: Syncing...'}
                </span>
             </div>
             <button onClick={() => window.print()} 
                className="bg-blue-900 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs hover:bg-orange-500 transition-all shadow-lg flex items-center gap-2">
                <Printer size={16} /> <span className="hidden xs:inline">طباعة</span>
             </button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:px-8 md:pt-8 pb-32 md:pb-32 lg:pb-8 custom-scrollbar print:p-0 print:overflow-visible print:bg-white print:m-0">
          <div id="report-section" className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={updateState as any} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'staff' && <StaffManagement state={state} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'medical' && <MedicalCenter state={state} setState={updateState} syncToCloud={syncToCloud} />}
            {activeTab === 'tournaments' && <TournamentsView state={state} setState={updateState as any} syncToCloud={syncToCloud} addLog={addNotify} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} />}
            {activeTab === 'services' && <ServicesView state={state} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="regular" />}
            {activeTab === 'baraaem-matches' && <MatchPlanner state={state} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="baraaem" />}
            {activeTab === 'warehouse' && <WarehouseManagement state={state} setState={updateState} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} setState={updateState} onBack={() => setActiveTab('squad')} addLog={addNotify} />}
          </div>
        </main>

        {/* Bottom Nav for Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-[80] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] print:hidden">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
             { id: 'squad', icon: Users, label: 'الفريق' },
             { id: 'training', icon: Calendar, label: 'التدريبات' },
             { id: 'matches', icon: Trophy, label: 'المباريات' },
             { id: 'tournaments', icon: Medal, label: 'البطولات' },
           ].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-orange-500 scale-110' : 'text-slate-400'}`}>
                <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
             </button>
           ))}
           <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
              <Menu size={24} />
              <span className="text-[10px] font-bold">المزيد</span>
           </button>
        </nav>

        <div className="fixed bottom-8 left-8 z-[999] space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-xl shadow-2xl border-r-4 min-w-[200px] flex items-center gap-3 bg-white text-slate-900 animate-in slide-in-from-left-full ${n.type === 'success' ? 'border-emerald-500' : n.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}>
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
