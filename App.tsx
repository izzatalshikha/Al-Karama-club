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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appMode, setAppMode] = useState<'club'|'academy'>(() => (localStorage.getItem('eagle_os_v3_mode') as 'club'|'academy') || 'club');
  
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('eagle_os_v3_mode', appMode);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab, appMode]);

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

  const derivedState = React.useMemo(() => {
    const isAcademyCat = (c: string) => c.startsWith('أكاديمية');
    const filterFn = appMode === 'academy' ? isAcademyCat : (c: string) => !isAcademyCat(c);

    const filteredCategories = state.categories.filter(filterFn);
    
    return {
      ...state,
      appMode,
      categories: filteredCategories,
      people: state.people.filter(p => !p.category || filterFn(p.category)),
      sessions: state.sessions.filter(s => filterFn(s.category)),
      matches: state.matches.filter(m => filterFn(m.category)),
      warehouse: state.warehouse.filter(w => !w.category || w.category === 'المخزن العام' || filterFn(w.category)),
      tacticalPlans: state.tacticalPlans.filter(t => filterFn(t.category)),
      tournaments: state.tournaments.filter(t => filterFn(t.category)),
    };
  }, [state, appMode]);

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
      const isWarehouse = user.role === 'أمين مستودع' || user.role === 'مسؤول تجهيزات';
      const isMedic = user.role === 'معالج';
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
        // المدير يرى كل شيء
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
      } else if (isMedic) {
        matchesQ = matchesQ.limit(0);
        sessionsQ = sessionsQ.limit(0);
        attendanceQ = attendanceQ.limit(0);
        warehouseQ = warehouseQ.limit(0);
        tacticalQ = tacticalQ.limit(0);
        tournamentsQ = tournamentsQ.limit(0);
        tourStagesQ = tourStagesQ.limit(0);
        tourTeamsQ = tourTeamsQ.limit(0);
        tourSTeamsQ = tourSTeamsQ.limit(0);
        tourMatchesQ = tourMatchesQ.limit(0);
      }
      
      if (cat && !isManager) {
        // --- التعديل الجوهري هنا لدعم تعدد الفئات ---
        const categoriesArray = cat.split(',').filter(Boolean);
        
        if (!isWarehouse && !isMedic) {
          peopleQ = peopleQ.in('category', categoriesArray);
          matchesQ = matchesQ.in('category', categoriesArray);
          sessionsQ = sessionsQ.in('category', categoriesArray);
          tacticalQ = tacticalQ.in('category', categoriesArray);
          tournamentsQ = tournamentsQ.in('category', categoriesArray);
        }

        if (isMedic || (!isWarehouse && !isMedic)) {
           peopleQ = peopleQ.in('category', categoriesArray);
           injuriesQ = injuriesQ.in('category', categoriesArray);
        }
        
        if (isWarehouse || (!isWarehouse && !isMedic)) {
          // المستودع يرى فئاته + المخزن العام
          const warehouseAllowed = [...categoriesArray, 'المخزن العام'];
          warehouseQ = warehouseQ.in('category', warehouseAllowed);
        }
      }

      const [p, m, s, a, w, u, inj, tac, catsReq, toursReq, tStagesReq, tTeamsReq, tSTeamsReq, tMatchesReq, servicesReq] = await Promise.all([
        peopleQ, matchesQ, sessionsQ, attendanceQ, warehouseQ, usersQ, injuriesQ, tacticalQ, categoriesQ,
        tournamentsQ, tourStagesQ, tourTeamsQ, tourSTeamsQ, tourMatchesQ, servicesQ
      ]);

      const playersCount = p.data?.filter(person => person.role === 'لاعب').length || 0;
      const staffCount = (p.data?.length || 0) - playersCount;
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
        // اختيار أول فئة فقط للفلتر الافتراضي في الواجهة
        globalCategoryFilter: (!isManager && !isWarehouse && cat) ? cat.split(',')[0] : 'الكل',
        tournaments: toursReq.data || [],
        tournamentStages: tStagesReq.data || [],
        tournamentTeams: tTeamsReq.data || [],
        tournamentStageTeams: tSTeamsReq.data || [],
        tournamentMatches: tMatchesReq.data || [],
        servicesDirectory: servicesReq.data || []
      }));
      setSyncStatus('synced');
      if (!silent) {
        addNotify(`تم التحديث: ${playersCount} لاعب، ${staffCount} كادر`, 'success');
      }
    } catch (e) {
      setSyncStatus('error');
      if (!silent) addNotify('خطأ في استدعاء البيانات', 'error');
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
      addNotify(`خطأ مزامنة: ${e.message}`, 'error');
      return false;
    }
  }, [addNotify]);

  useEffect(() => {
    if (!state.currentUser) return;
    let debounceTimer: any;
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table;

        // الجداول المعقدة نحدثها بالكامل
        if (table === 'app_users' || table === 'categories') {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => fetchAllData(state.currentUser!, true), 2000);
          return;
        }

        const tableMap: Record<string, keyof AppState> = {
          'people': 'people',
          'matches': 'matches',
          'training_sessions': 'sessions',
          'attendance_records': 'attendance',
          'warehouse_items': 'warehouse',
          'injury_records': 'injuries',
          'tactical_plans': 'tacticalPlans',
          'tournaments': 'tournaments',
          'tournament_stages': 'tournamentStages',
          'tournament_teams': 'tournamentTeams',
          'tournament_stage_teams': 'tournamentStageTeams',
          'tournament_matches': 'tournamentMatches',
          'services_directory': 'servicesDirectory'
        };

        const stateKey = tableMap[table];
        if (!stateKey) return;

        setState(prev => {
          const user = prev.currentUser;
          if (!user) return prev;
          
          const isManager = user.role === 'مدير';
          const isWarehouse = user.role === 'أمين مستودع' || user.role === 'مسؤول تجهيزات';
          const isMedic = user.role === 'معالج';
          const cat = user.restrictedCategory;
          const allowedCategories = cat ? String(cat).split(',').filter(Boolean) : null;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newItem = payload.new as any;
            
            // فلترة الصلاحيات
            if (!isManager) {
              if (isWarehouse) {
                if (table !== 'warehouse_items' && table !== 'app_users' && table !== 'categories') return prev;
                if (allowedCategories && table === 'warehouse_items') {
                  const warehouseAllowed = [...allowedCategories, 'المخزن العام'];
                  if (!warehouseAllowed.includes(newItem.category)) return prev;
                }
              } else if (isMedic) {
                if (table !== 'injury_records' && table !== 'people') return prev;
                if (allowedCategories && newItem.category && !allowedCategories.includes(newItem.category)) return prev;
              } else {
                if (table === 'warehouse_items' || table === 'app_users') return prev;
                if (allowedCategories && newItem.category && !allowedCategories.includes(newItem.category)) return prev;
              }
            }
            
            const currentList = prev[stateKey] as any[];
            if (payload.eventType === 'INSERT') {
              if (currentList.some(item => item.id === newItem.id)) return prev;
              return { ...prev, [stateKey]: [...currentList, newItem] };
            } else {
              return { ...prev, [stateKey]: currentList.map(item => item.id === newItem.id ? newItem : item) };
            }
          }

          if (payload.eventType === 'DELETE') {
            const currentList = prev[stateKey] as any[];
            return { ...prev, [stateKey]: currentList.filter(item => item.id !== payload.old.id) };
          }

          return prev;
        });
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
    if ((inputU === 'عزت' || inputU.toUpperCase() === 'IZZAT') && p === '123') {
      const rootUser: AppUser = { id: 'root', username: 'عزت عامر الشيخة', role: 'مدير' };
      await fetchAllData(rootUser);
      return rootUser;
    }
    try {
      const { data } = await supabase.from('app_users').select('*').eq('username', inputU).eq('password', p).maybeSingle();
      if (data) {
        await fetchAllData(data);
        return data;
      }
    } catch (err) {}
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
      if (hasActiveRed) { suspendedForNext = true; hasActiveRed = false; } 
      else if (accumulatedYellows >= 3) { suspendedForNext = true; accumulatedYellows = 0; } 
      else { suspendedForNext = false; }
      accumulatedYellows += matchYellows;
      if (matchRed) hasActiveRed = true;
    });
    return { isSuspended: suspendedForNext || hasActiveRed, currentYellows: accumulatedYellows, hasActiveRed };
  }, [state.matches]);

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
    const role = state.currentUser?.role;
    if (role === 'مدير') return true;
    if (role === 'مسؤول تجهيزات') return ['warehouse', 'dashboard'].includes(item.id);
    if (role === 'معالج') return ['squad', 'medical', 'dashboard'].includes(item.id);
    return item.id !== 'settings';
  });

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-['IBM_Plex_Sans_Arabic'] overflow-hidden print:h-auto print:block print:overflow-visible" dir="rtl">
      <aside className={`${isSidebarOpen ? 'translate-x-0 w-72' : 'translate-x-full lg:translate-x-0 w-72 lg:w-24'} bg-blue-900 border-l border-blue-800 transition-all duration-300 flex flex-col z-[100] shadow-2xl fixed inset-y-0 right-0 lg:static h-full overflow-hidden print:hidden`}>
        <div className="p-8 flex items-center justify-center gap-4 shrink-0">
           <ClubLogo size={45} />
           {isSidebarOpen && <span className="text-xl font-black text-white tracking-tight whitespace-nowrap">EAGLE OS</span>}
        </div>
        
        {isSidebarOpen && (
          <div className="px-4 mb-4 shrink-0 animate-in fade-in">
            <div className="flex bg-blue-950/50 rounded-xl p-1 text-[11px] font-bold">
              <button onClick={() => { setAppMode('club'); setActiveTab('dashboard'); }} className={`flex-1 rounded-lg py-2 transition-all ${appMode === 'club' ? 'bg-orange-500 text-white shadow-lg' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}>النادي</button>
              <button onClick={() => { setAppMode('academy'); setActiveTab('dashboard'); }} className={`flex-1 rounded-lg py-2 transition-all ${appMode === 'academy' ? 'bg-orange-500 text-white shadow-lg' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}>الأكاديمية الصيفية</button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/10 text-blue-100 hover:text-white'}`}>
              <item.icon size={20} className="shrink-0" />
              <span className={`text-sm font-medium whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto shrink-0">
          <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {state.currentUser.username.charAt(0)}
             </div>
             {isSidebarOpen && (
               <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate text-white">{state.currentUser.username}</p>
                  <p className="text-[8px] text-blue-100 uppercase font-black">{state.currentUser.role}</p>
               </div>
             )}
          </div>
          <button onClick={() => { 
              setState({ currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'], people: [], sessions: [], matches: [], warehouse: [], technicalReports: [], tournaments: [], tournamentStages: [], tournamentTeams: [], tournamentStageTeams: [], tournamentMatches: [], attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], servicesDirectory: [], });
              localStorage.clear();
            }} 
            className="w-full p-3 rounded-xl text-white bg-red-600/30 hover:bg-red-600 transition-all flex items-center justify-center gap-3">
            <LogOut size={18} /> {isSidebarOpen && <span className="text-sm font-semibold">خروج</span>}
          </button>
        </div>
      </aside>

      {isSidebarOpen && <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 relative print:block">
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between z-40 print:hidden">
          <div className="flex items-center gap-3 md:gap-6">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-slate-100 text-blue-900 rounded-xl hover:bg-orange-500 hover:text-white transition-all">
                <Menu size={20} />
             </button>
             <div className="flex items-center gap-3">
               <ClubLogo size={40} className="" />
               <h1 className="text-sm md:text-xl font-bold text-blue-900 border-r-2 border-slate-200 pr-3 md:pr-4 mx-2 md:mx-0">{navItems.find(n => n.id === activeTab)?.label}</h1>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => state.currentUser && fetchAllData(state.currentUser)} className="p-2.5 bg-slate-100 text-blue-900 rounded-xl hover:bg-orange-500 hover:text-white">
                <RefreshCw size={20} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
             </button>
             <button onClick={() => window.print()} className="bg-blue-900 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                <Printer size={16} /> <span className="hidden sm:inline">طباعة</span>
             </button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 custom-scrollbar print:p-0">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'dashboard' && <Dashboard state={derivedState} setState={updateState as any} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'squad' && <SquadManagement state={derivedState} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'staff' && <StaffManagement state={derivedState} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'training' && <TrainingPlanner state={derivedState} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'attendance' && <AttendanceTracker state={derivedState} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'medical' && <MedicalCenter state={derivedState} setState={updateState} syncToCloud={syncToCloud} />}
            {activeTab === 'tournaments' && <TournamentsView state={derivedState} setState={updateState as any} syncToCloud={syncToCloud} addLog={addNotify} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} />}
            {activeTab === 'services' && <ServicesView state={derivedState} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'matches' && <MatchPlanner state={derivedState} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="regular" />}
            {activeTab === 'baraaem-matches' && <MatchPlanner state={derivedState} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="baraaem" />}
            {activeTab === 'warehouse' && <WarehouseManagement state={derivedState} setState={updateState} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'settings' && <SettingsView state={derivedState} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={derivedState} setState={updateState} onBack={() => setActiveTab('squad')} addLog={addNotify} />}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-[80] shadow-lg">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
             { id: 'squad', icon: Users, label: 'الفريق' },
             { id: 'training', icon: Calendar, label: 'التدريبات' },
             { id: 'matches', icon: Trophy, label: 'المباريات' },
             { id: 'tournaments', icon: Medal, label: 'البطولات' },
           ].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-orange-500' : 'text-slate-400'}`}>
                <item.icon size={24} />
                <span className="text-[10px] font-bold">{item.label}</span>
             </button>
           ))}
        </nav>
      </div>
    </div>
  );
};

export default App;