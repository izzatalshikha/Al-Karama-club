
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, RefreshCw, CloudCheck, Sparkles, Package, FilePieChart, Printer, Loader2,
  Activity, HeartPulse, QrCode, PenTool, ChevronRight, ClipboardList
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person } from './types';
import html2pdf from 'html2pdf.js';

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
import AIAssistant from './components/AIAssistant';
import ChatBot from './components/ChatBot';
import TechnicalReports from './components/TechnicalReports';
import TacticalBoard from './components/TacticalBoard';
import MedicalCenter from './components/MedicalCenter';
import QRManager from './components/QRManager';
import VisualAnalytics from './components/VisualAnalytics';

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
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkarama_secure_v11');
    if (saved) { try { return JSON.parse(saved); } catch (e) { return {} as AppState; } }
    return {
      currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [], sessions: [], matches: [], warehouse: [], technicalReports: [],
      attendance: [], users: [], notifications: [], globalCategoryFilter: 'الكل',
      injuries: [], tacticalPlans: []
    };
  });

  const fetchAllData = useCallback(async (user: AppUser) => {
    setIsInitialLoading(true);
    setSyncStatus('syncing');
    try {
      const [ppl, mtch, attn, wrhs, tech, usrs, sess, cats, inj, tact] = await Promise.all([
        supabase.from('people').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('warehouse').select('*'),
        supabase.from('technical_reports').select('*'),
        supabase.from('app_users').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('injuries').select('*'),
        supabase.from('tactical_plans').select('*')
      ]);

      setState(prev => ({
        ...prev,
        currentUser: user,
        people: ppl.data || [],
        matches: mtch.data || [],
        attendance: attn.data || [],
        warehouse: wrhs.data || [],
        technicalReports: tech.data || [],
        users: usrs.data || [],
        sessions: sess.data || [],
        categories: cats.data && cats.data.length > 0 ? cats.data.map(c => c.name) : prev.categories,
        injuries: inj.data || [],
        tacticalPlans: tact.data || []
      }));
      setSyncStatus('synced');
    } catch (e) {
      console.error("Fetch Error:", e);
      setSyncStatus('error');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const updateStateAndSync = async (updater: (prev: AppState) => AppState) => {
    const nextState = updater(state);
    setState(nextState);
    localStorage.setItem('alkarama_secure_v11', JSON.stringify(nextState));

    if (!nextState.currentUser) return;
    setSyncStatus('syncing');

    try {
      await Promise.all([
        supabase.from('people').upsert(nextState.people),
        supabase.from('matches').upsert(nextState.matches),
        supabase.from('attendance').upsert(nextState.attendance),
        supabase.from('warehouse').upsert(nextState.warehouse),
        supabase.from('technical_reports').upsert(nextState.technicalReports),
        supabase.from('app_users').upsert(nextState.users),
        supabase.from('sessions').upsert(nextState.sessions),
        supabase.from('injuries').upsert(nextState.injuries),
        supabase.from('tactical_plans').upsert(nextState.tacticalPlans),
        supabase.from('categories').upsert(nextState.categories.map(name => ({ name })), { onConflict: 'name' })
      ]);
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const onLoginAttempt = async (u: string, p: string) => {
    if ((u === 'عزت' || u.toUpperCase() === 'IZZAT') && p === '123') {
      const user: AppUser = { id: 'root', username: 'عزت عامر الشيخة', role: 'مدير' };
      await fetchAllData(user);
      return user;
    }
    const { data, error } = await supabase.from('app_users').select('*').eq('username', u).eq('password', p).maybeSingle();
    if (error) throw new Error("فشل الاتصال بالخادم");
    if (!data) return null;
    await fetchAllData(data);
    return data;
  };

  if (!state.currentUser) return <Login onLoginAttempt={onLoginAttempt} />;
  
  if (isInitialLoading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-[#f8fafc] font-['IBM_Plex_Sans_Arabic']">
       <div className="relative">
          <ClubLogo size={140} className="animate-pulse mb-8" />
          <Loader2 className="absolute inset-0 animate-spin text-orange-500 m-auto" size={160} strokeWidth={1} />
       </div>
       <h2 className="text-xl font-bold tracking-tight">جاري المزامنة...</h2>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'squad', label: 'الفريق', icon: Users },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
    { id: 'tactics', label: 'التكتيك', icon: PenTool },
    { id: 'medical', label: 'الطبابة', icon: HeartPulse },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'warehouse', label: 'المستودع', icon: Package },
    { id: 'qr', label: 'نظام QR', icon: QrCode },
    { id: 'analytics', label: 'التحليلات', icon: Activity },
    { id: 'ai', label: 'الذكاء الفني', icon: Sparkles },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-[#f8fafc] font-['IBM_Plex_Sans_Arabic'] overflow-hidden" dir="rtl">
      {/* Sidebar - Modern Deep Slate */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#0f172a] border-l border-white/5 transition-all duration-300 flex flex-col z-50 shadow-2xl relative`}>
        <div className="p-8 flex items-center justify-center gap-4">
           <ClubLogo size={isSidebarOpen ? 50 : 35} />
           {isSidebarOpen && <span className="text-lg font-bold text-white tracking-tight">الكرامة SC</span>}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-orange-500'} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              {activeTab === item.id && isSidebarOpen && <div className="mr-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={() => setState(prev => ({ ...prev, currentUser: null }))} 
            className="w-full p-3 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-3">
            <LogOut size={18} /> {isSidebarOpen && <span className="text-sm font-semibold">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#0f172a]/60 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-40">
          <div className="flex items-center gap-6">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 rounded-xl hover:bg-orange-500 hover:text-white transition-all">
                <Menu size={20} />
             </button>
             <h1 className="text-xl font-bold tracking-tight">{navItems.find(n => n.id === activeTab)?.label}</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500 animate-spin'}`}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{syncStatus}</span>
             </div>
             <button onClick={() => html2pdf().from(document.getElementById('report-section')).save()} 
                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-black/20 flex items-center gap-2">
                <Printer size={16} /> تصدير PDF
             </button>
          </div>
        </header>

        {/* Scrolling Viewport */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div id="report-section" className="max-w-6xl mx-auto space-y-8 fade-up">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={updateStateAndSync as any} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateStateAndSync as any} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={() => {}} getSuspension={() => ({isSuspended:false,currentYellows:0,hasActiveRed:false})} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateStateAndSync as any} addLog={() => {}} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateStateAndSync as any} addLog={() => {}} />}
            {activeTab === 'tactics' && <TacticalBoard state={state} setState={updateStateAndSync as any} />}
            {activeTab === 'medical' && <MedicalCenter state={state} setState={updateStateAndSync as any} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateStateAndSync as any} defaultSelectedId={selectedMatchId} getSuspension={() => ({isSuspended:false,currentYellows:0,hasActiveRed:false})} />}
            {activeTab === 'warehouse' && <WarehouseManagement state={state} setState={updateStateAndSync as any} addLog={() => {}} />}
            {activeTab === 'qr' && <QRManager state={state} setState={updateStateAndSync as any} />}
            {activeTab === 'analytics' && <VisualAnalytics state={state} />}
            {activeTab === 'ai' && <AIAssistant state={state} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={() => {}} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </div>
      </div>

      <ChatBot state={state} />
    </div>
  );
};

export default App;
