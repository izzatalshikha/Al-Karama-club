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

// Initialize Supabase client
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
    const saved = localStorage.getItem('alkarama_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved state:", e);
      }
    }
    return {
      currentUser: null,
      categories: ['الرجال', 'الشباب', 'الناشئين'],
      people: [],
      sessions: [],
      matches: [],
      attendance: [],
      notifications: []
    };
  });

  const fetchData = useCallback(async () => {
    if (!state.currentUser || !supabase) return;
    setIsSyncing(true);
    try {
      const [
        { data: cats, error: e1 }, 
        { data: ppl, error: e2 }, 
        { data: sess, error: e3 }, 
        { data: mtch, error: e4 }, 
        { data: attn, error: e5 }
      ] = await Promise.all([
        supabase.from('categories').select('name'),
        supabase.from('people').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('attendance').select('*'),
      ]);

      if (e1 || e2 || e3 || e4 || e5) {
        console.error("Sync Error:", { e1, e2, e3, e4, e5 });
      }

      setState(prev => ({
        ...prev,
        categories: (cats && cats.length > 0) ? cats.map(c => c.name) : prev.categories,
        people: ppl || [],
        sessions: sess || [],
        matches: mtch || [],
        attendance: attn || []
      }));
    } catch (error) {
      console.error("Failed to fetch from Supabase:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser]);

  useEffect(() => {
    if (state.currentUser) {
      fetchData();
    }
  }, [state.currentUser, fetchData]);

  useEffect(() => {
    localStorage.setItem('alkarama_state', JSON.stringify(state));
  }, [state]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    localStorage.removeItem('alkarama_state');
    setActiveTab('dashboard');
  };

  if (!state.currentUser) {
    return <Login onLogin={(user) => setState(prev => ({ ...prev, currentUser: user }))} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'إدارة الفريق', icon: Users },
    { id: 'attendance', label: 'نظام الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className=\"min-h-screen bg-[#F8FAFC] flex text-right\" dir=\"rtl\">
      {/* Sidebar and Main Layout follows... */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-[#001F3F] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className=\"h-full flex flex-col\">
          <div className=\"p-6 flex items-center justify-between border-b border-white/10\">
            <div className=\"flex items-center gap-3\">
              <ClubLogo className=\"w-10 h-10\" />
              <span className=\"font-black text-lg tracking-tight\">نادي الكرامة</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className=\"lg:hidden text-white/70 hover:text-white\">
              <X size={24} />
            </button>
          </div>

          <nav className=\"flex-1 overflow-y-auto py-4 px-3 space-y-1\">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${activeTab === item.id 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon size={20} className={activeTab === item.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                <span className=\"font-bold\">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className=\"p-4 border-t border-white/10\">
            <button 
              onClick={handleLogout}
              className=\"w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors font-bold\"
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className=\"flex-1 flex flex-col h-screen overflow-hidden relative\">
        <header className=\"bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 px-4 lg:px-8 py-4 flex items-center justify-between no-print\">
          <div className=\"flex items-center gap-4\">
            <button onClick={() => setSidebarOpen(true)} className=\"lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg\">
              <Menu size={24} />
            </button>
            <h1 className=\"text-xl font-black text-slate-800\">{navItems.find(i => i.id === activeTab)?.label}</h1>
          </div>

          <div className=\"flex items-center gap-3\">
            <button 
              onClick={fetchData}
              disabled={isSyncing}
              className={`p-2.5 rounded-xl transition-all ${isSyncing ? 'bg-orange-50 text-orange-500 animate-spin' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title=\"مزامنة البيانات\"
            >
              <CheckCircle2 size={20} />
            </button>
            <div className=\"relative\">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className=\"p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl relative transition-all\"
              >
                <Bell size={20} />
                {state.notifications.some(n => !n.read) && (
                  <span className=\"absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 border-2 border-white rounded-full\"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        <section className=\"flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative\">
          <div className=\"max-w-7xl mx-auto space-y-6 pb-20\">
            {activeTab === 'dashboard' && <Dashboard state={state} onAction={(tab, id) => { 
              setActiveTab(tab); 
              if (tab === 'matches') setSelectedMatchId(id);
              if (tab === 'training') setSelectedSessionId(id);
            }} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={setState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addLog} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={setState} defaultSelectedId={selectedMatchId} addLog={addLog} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={setState} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>

        <footer className=\"bg-white/95 backdrop-blur-md border-t py-1.5 px-5 flex justify-between items-center no-print z-40\">
          <p className=\"text-[7px] font-black text-slate-500 tracking-tighter\">نظام إدارة مكتب كرة القدم - نادي الكرامة</p>
          <p className=\"text-[7px] font-black text-[#001F3F] border-r-2 border-orange-500 pr-2\">By: Izzat Amer Al-Shikha</p>
        </footer>
      </main>
      
      {showNotifications && (
        <div className=\"fixed inset-0 z-50\" onClick={() => setShowNotifications(false)}>
          <div className=\"absolute top-20 left-4 lg:left-8 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden\" onClick={e => e.stopPropagation()}>
            <div className=\"p-4 border-b bg-slate-50 flex justify-between items-center\">
              <h3 className=\"font-black text-slate-800\">التنبيهات</h3>
              <button onClick={() => setState(prev => ({ ...prev, notifications: [] }))} className=\"text-[10px] text-red-500 font-bold hover:underline\">مسح الكل</button>
            </div>
            <div className=\"max-h-[400px] overflow-y-auto\">
              {state.notifications.length === 0 ? (
                <div className=\"p-8 text-center text-slate-400 font-bold\">لا توجد تنبيهات</div>
              ) : (
                state.notifications.map(n => (
                  <div key={n.id} className=\"p-4 border-b hover:bg-slate-50 transition-colors\">
                    <p className=\"text-xs font-bold text-slate-700\">{n.message}</p>
                    <span className=\"text-[9px] text-slate-400\">{new Date(n.timestamp).toLocaleTimeString('ar-SY')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;