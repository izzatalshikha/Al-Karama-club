import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Medal, Briefcase,
  Activity, HeartPulse, PenTool, Package, Printer, Loader2, CheckCircle2, AlertCircle, RefreshCw, Compass, MapPin, ChevronDown, ChevronLeft, Baby, Bell, Edit2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification, Role } from './types';

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
import TransfersManagement from './components/TransfersManagement';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';
import MedicalCenter from './components/MedicalCenter';
import PublicPlayerView from './components/PublicPlayerView';
import ParentPortal from './components/ParentPortal';
import AdminNotifications from './components/AdminNotifications';
import PlayerPortal from './components/PlayerPortal';
import EditPersonModal from './components/EditPersonModal';
import { safeSavePerson } from './utils/supabaseSanitizer';
import { decodeMatchPitch, encodeMatchPitch } from './utils/tournamentHelpers';

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
  const [previousTab, setPreviousTab] = useState('squad');
  const [appMode, setAppMode] = useState<'club'|'academy'>(() => (localStorage.getItem('eagle_os_v3_mode') as 'club'|'academy') || 'club');
  
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    localStorage.setItem('eagle_os_v3_mode', appMode);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab, appMode]);

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [expandedNav, setExpandedNav] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('eagle_os_v3');
    if (saved) { 
        try { 
           const parsed = JSON.parse(saved); 
           parsed.seasons = ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'];
           if (!parsed.activeSeason || !parsed.seasons.includes(parsed.activeSeason)) parsed.activeSeason = '2025/2026';
           
           const dedupe = (arr: any[]) => arr ? Array.from(new Map(arr.map(item => [item.id, item])).values()) : [];
           parsed.people = dedupe(parsed.people).map((person: any) => {
             let seasonsList: string[] = [];
             if (Array.isArray(person.seasons) && person.seasons.length > 0) {
               seasonsList = person.seasons;
             } else if (typeof person.season === 'string' && person.season.trim()) {
               seasonsList = person.season.split(',').map((s: string) => s.trim()).filter(Boolean);
             } else {
               seasonsList = ['2025/2026'];
             }
             if (seasonsList.length === 0) seasonsList = ['2025/2026'];

             return {
               ...person,
               isAcademyPlayer: false, // وضع جميع اللاعبين والكوادر كأعضاء نادي رسمي
               seasons: seasonsList,
               season: person.season || seasonsList[seasonsList.length - 1] || '2025/2026',
               receivedKit: Boolean(person.receivedKit === true || String(person.receivedKit) === 'true')
             };
           });
           parsed.matches = dedupe(parsed.matches).map((match: any) => ({
             ...match,
             isCompleted: Boolean(match.isCompleted === true || String(match.isCompleted) === 'true'),
             isFinal: Boolean(match.isFinal === true || String(match.isFinal) === 'true')
           }));
           parsed.sessions = dedupe(parsed.sessions);
           parsed.attendance = dedupe(parsed.attendance);
           parsed.warehouse = dedupe(parsed.warehouse);
           parsed.tournaments = dedupe(parsed.tournaments);
           parsed.tournamentStages = dedupe(parsed.tournamentStages);
           parsed.tournamentTeams = dedupe(parsed.tournamentTeams);
           parsed.tournamentStageTeams = dedupe(parsed.tournamentStageTeams);
           parsed.tournamentMatches = dedupe(parsed.tournamentMatches);
           parsed.tacticalPlans = dedupe(parsed.tacticalPlans);
           parsed.injuries = dedupe(parsed.injuries);
           parsed.users = dedupe(parsed.users);
           parsed.transfers = dedupe(parsed.transfers || []);

           return parsed; 
        } catch (e) {} 
    }
    return {
      currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'],
      activeSeason: '2025/2026', seasons: ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'],
      people: [], sessions: [], matches: [], warehouse: [], technicalReports: [], tournaments: [], tournamentStages: [], tournamentTeams: [], tournamentStageTeams: [], tournamentMatches: [],
      attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], servicesDirectory: [], transfers: [],
      globalCategoryFilter: 'الكل'
    };
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('playerId');
    if (pId && state.people.length > 0) {
      const p = state.people.find(x => x.id === pId);
      if (p && !selectedPlayer) { // avoid re-setting and breaking navigation
        setSelectedPlayer(p);
        setActiveTab('report');
      }
    }
  }, [state.people.length, selectedPlayer]);

  const derivedState = React.useMemo(() => {
    const isAcademyCat = (c: string) => c.includes('أكاديمية') || c.includes('الأكاديمية');
    const filterFn = appMode === 'academy' ? isAcademyCat : (c: string) => !isAcademyCat(c);

    const filteredCategories = state.categories.filter(filterFn);
    
    // فلترة الأفراد حسب الموسم النشط
    // الأشخاص الذين ليس لديهم حقل موسم صريح يُعتبر موسمهم الافتراضي 2025/2026
    const personBelongsToActiveSeason = (p: Person) => {
      const targetSeason = state.activeSeason || '2025/2026';
      const personSeasons = Array.isArray(p.seasons) && p.seasons.length > 0 
        ? p.seasons 
        : (p.season ? (p.season.includes(',') ? p.season.split(',').map((x: string) => x.trim()) : [p.season]) : ['2025/2026']);
      return personSeasons.includes(targetSeason);
    };

    return {
      ...state,
      appMode,
      categories: filteredCategories,
      people: state.people
        .filter(p => !p.category || p.category.split(',').some(c => filterFn(c.trim())))
        .filter(personBelongsToActiveSeason),
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
      let technicalReportsQ = supabase.from('technical_reports').select('*');
      let transfersQ = supabase.from('transfers').select('*');

      const isPlayer = user.role === 'لاعب';

      if (isManager) {
        // المدير يرى كل شيء
      } else if (isPlayer) {
        // اللاعب يرى فقط نفسه، وتمارين فئته، ومباريات فئته، وسجل حضوره وتقاريره
        if (user.relatedPersonId) {
          peopleQ = peopleQ.eq('id', user.relatedPersonId);
          attendanceQ = attendanceQ.eq('personId', user.relatedPersonId);
          injuriesQ = injuriesQ.eq('personId', user.relatedPersonId);
        } else {
          peopleQ = peopleQ.limit(0);
          attendanceQ = attendanceQ.limit(0);
          injuriesQ = injuriesQ.limit(0);
        }
        warehouseQ = warehouseQ.limit(0);
        usersQ = usersQ.limit(0);
        tacticalQ = tacticalQ.limit(0);
        servicesQ = servicesQ.limit(0);
        transfersQ = transfersQ.limit(0);
        tourStagesQ = tourStagesQ.limit(0);
        tourTeamsQ = tourTeamsQ.limit(0);
        tourSTeamsQ = tourSTeamsQ.limit(0);
        tourMatchesQ = tourMatchesQ.limit(0);
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
        technicalReportsQ = technicalReportsQ.limit(0);
        transfersQ = transfersQ.limit(0);
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
        technicalReportsQ = technicalReportsQ.limit(0);
      }
      
      if (cat && !isManager) {
        // --- التعديل الجوهري هنا لدعم تعدد الفئات ---
        const categoriesArray = cat.split(',').filter(Boolean);
        
        if (!isWarehouse && !isMedic && !isPlayer) {
          peopleQ = peopleQ.in('category', categoriesArray);
          matchesQ = matchesQ.in('category', categoriesArray);
          sessionsQ = sessionsQ.in('category', categoriesArray);
          tacticalQ = tacticalQ.in('category', categoriesArray);
          tournamentsQ = tournamentsQ.in('category', categoriesArray);
          technicalReportsQ = technicalReportsQ.in('category', categoriesArray);
        } else if (isPlayer) {
          matchesQ = matchesQ.in('category', categoriesArray);
          sessionsQ = sessionsQ.in('category', categoriesArray);
          if (user.relatedPersonId) {
            technicalReportsQ = technicalReportsQ.eq('targetId', user.relatedPersonId);
          }
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

      const [p, m, s, a, w, u, inj, tac, catsReq, toursReq, tStagesReq, tTeamsReq, tSTeamsReq, tMatchesReq, servicesReq, tReportsReq] = await Promise.all([
        peopleQ, matchesQ, sessionsQ, attendanceQ, warehouseQ, usersQ, injuriesQ, tacticalQ, categoriesQ,
        tournamentsQ, tourStagesQ, tourTeamsQ, tourSTeamsQ, tourMatchesQ, servicesQ, technicalReportsQ
      ]);

      const playersCount = p.data?.filter(person => person.role === 'لاعب').length || 0;
      const staffCount = (p.data?.length || 0) - playersCount;
      const fetchedCats = catsReq.data?.map(c => c.name) || [];

      const dedupe = (arr: any[]) => arr ? Array.from(new Map(arr.map(item => [item.id, item])).values()) : [];

      setState(prev => ({
        ...prev,
        currentUser: user,
        people: dedupe(p.data).map((person: any) => {
          let seasonsList: string[] = [];
          if (Array.isArray(person.seasons) && person.seasons.length > 0) {
            seasonsList = person.seasons;
          } else if (typeof person.season === 'string' && person.season.trim()) {
            seasonsList = person.season.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else {
            seasonsList = ['2025/2026'];
          }
          if (seasonsList.length === 0) seasonsList = ['2025/2026'];

          return {
            ...person,
            isAcademyPlayer: false, // جميع اللاعبين والكوادر هم لاعبو/كوادر نادي
            seasons: seasonsList,
            season: person.season || seasonsList[seasonsList.length - 1] || '2025/2026',
            receivedKit: Boolean(person.receivedKit === true || String(person.receivedKit) === 'true')
          };
        }),
        matches: dedupe(m.data).map((match: any) => ({
          ...match,
          isCompleted: Boolean(match.isCompleted === true || String(match.isCompleted) === 'true'),
          isFinal: Boolean(match.isFinal === true || String(match.isFinal) === 'true')
        })),
        sessions: dedupe(s.data),
        attendance: dedupe(a.data),
        warehouse: dedupe(w.data),
        users: dedupe(u.data),
        injuries: dedupe(inj.data),
        tacticalPlans: dedupe(tac.data),
        categories: fetchedCats.length > 0 ? fetchedCats : prev.categories,
        // اختيار أول فئة فقط للفلتر الافتراضي في الواجهة
        globalCategoryFilter: (!isManager && !isWarehouse && cat) ? cat.split(',')[0] : 'الكل',
        tournaments: dedupe(toursReq.data),
        tournamentStages: dedupe(tStagesReq.data),
        tournamentTeams: dedupe(tTeamsReq.data),
        tournamentStageTeams: dedupe(tSTeamsReq.data),
        tournamentMatches: dedupe(tMatchesReq.data).map((tm: any) => {
          const meta = decodeMatchPitch(tm.pitch);
          return {
            ...tm,
            round: tm.round || meta.round,
            leg: tm.leg || meta.leg,
            pitch: meta.displayPitch || tm.pitch
          };
        }),
        servicesDirectory: dedupe(servicesReq.data),
        technicalReports: dedupe(tReportsReq.data)
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
      if (table === 'people') {
        if (!Array.isArray(data)) {
          const res = await safeSavePerson(data, 'upsert');
          if (!res.success) throw res.error;
          setSyncStatus('synced');
          return true;
        } else {
          for (const item of data) {
            await safeSavePerson(item, 'upsert');
          }
          setSyncStatus('synced');
          return true;
        }
      }
      if (table === 'tournament_matches') {
        const items = Array.isArray(data) ? data : [data];
        const prepared = items.map(it => {
          const c = { ...it };
          c.pitch = encodeMatchPitch(c.displayPitch || c.pitch, c.round, c.leg);
          return c;
        });
        const payload = Array.isArray(data) ? prepared : prepared[0];
        try {
          const { error } = await supabase.from(table).upsert(payload);
          if (!error) {
            setSyncStatus('synced');
            return true;
          }
          if (error.message?.includes('column') || error.code === 'PGRST204') {
            const stripped = prepared.map(it => {
              const c = { ...it };
              delete c.round;
              delete c.leg;
              return c;
            });
            const strippedPayload = Array.isArray(data) ? stripped : stripped[0];
            const { error: retryErr } = await supabase.from(table).upsert(strippedPayload);
            if (retryErr) throw retryErr;
            setSyncStatus('synced');
            return true;
          }
          throw error;
        } catch (err: any) {
          setSyncStatus('error');
          addNotify(`خطأ مزامنة المباريات: ${err.message}`, 'error');
          return false;
        }
      }
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
          'services_directory': 'servicesDirectory',
          'transfers': 'transfers',
          'technical_reports': 'technicalReports'
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
  }, [state.currentUser?.id, fetchAllData]);

  // إضافة الجلب التلقائي عند بدء التشغيل إذا كان هناك مستخدم مسجل الدخول
  useEffect(() => {
    if (state.currentUser) {
      fetchAllData(state.currentUser, true);
    }
  }, [state.currentUser?.id, fetchAllData]);

  useEffect(() => {
    if (state.currentUser) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('eagle_os_v3', JSON.stringify(state));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [state]);

  useEffect(() => {
    if (state.currentUser?.role === 'ولي أمر' && activeTab !== 'parent-portal') {
      setActiveTab('parent-portal');
    }
  }, [state.currentUser?.role, activeTab]);

  const onLoginAttempt = async (u: string, p: string, isPlayerLogin?: boolean) => {
    setSyncStatus('syncing');
    const inputU = u.trim();
    const inputP = p.trim();

    // 1. If player login mode selected OR explicit check
    if (isPlayerLogin) {
      try {
        // Query people with role = 'لاعب' and matching name
        const { data: matchedPlayers, error: playerErr } = await supabase
          .from('people')
          .select('*')
          .eq('role', 'لاعب')
          .ilike('name', `%${inputU}%`);

        if (!playerErr && matchedPlayers && matchedPlayers.length > 0) {
          // Normalize Arabic text for comparison
          const normalize = (t: string) => (t || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
          const targetNorm = normalize(inputU);

          const found = matchedPlayers.find(pl => {
            const nameNorm = normalize(pl.name);
            const rawNat = String(pl.nationalId || '').trim();
            const last6Nat = rawNat.length >= 6 ? rawNat.slice(-6) : rawNat;
            
            // Check name similarity and exact last 6 digits of nationalId
            const isNameMatch = nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
            const isPassMatch = last6Nat && last6Nat === inputP;
            return isNameMatch && isPassMatch;
          });

          if (found) {
            const playerUser: AppUser = {
              id: found.id,
              username: found.name,
              role: 'لاعب',
              relatedPersonId: found.id,
              restrictedCategory: found.category
            };
            await fetchAllData(playerUser);
            return playerUser;
          }
        }
      } catch (err) {}
      setSyncStatus('error');
      return null;
    }

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

      // Check if user is a coach / staff member in people table (by name and last 6 digits of nationalId or phone)
      const { data: matchedStaff } = await supabase
        .from('people')
        .select('*')
        .neq('role', 'لاعب')
        .ilike('name', `%${inputU}%`);

      if (matchedStaff && matchedStaff.length > 0) {
        const normalize = (t: string) => (t || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
        const targetNorm = normalize(inputU);

        const foundStaff = matchedStaff.find(st => {
          const nameNorm = normalize(st.name);
          const rawNat = String(st.nationalId || '').trim();
          const last6Nat = rawNat.length >= 6 ? rawNat.slice(-6) : rawNat;
          const phone = String(st.phone || '').trim();

          const isNameMatch = nameNorm === targetNorm || nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm);
          const isPassMatch = (last6Nat && last6Nat === inputP) || (phone && phone === inputP);
          return isNameMatch && isPassMatch;
        });

        if (foundStaff) {
          const staffUser: AppUser = {
            id: foundStaff.id,
            username: foundStaff.name,
            role: (foundStaff.role as any) || 'مدرب',
            relatedPersonId: foundStaff.id,
            restrictedCategory: foundStaff.category
          };
          await fetchAllData(staffUser);
          return staffUser;
        }
      }

      // Check if user is a parent in people table
      const { data: parentData } = await supabase.from('people').select('*').eq('phone', inputU).limit(1);
      if (parentData && parentData.length > 0) {
        const parentRecord = parentData[0];
        if (parentRecord.birthDate && parentRecord.birthDate.substring(0, 4) === p.trim()) {
          const parentUser: AppUser = {
            id: parentRecord.id,
            username: parentRecord.phone,
            role: 'ولي أمر',
            relatedPersonId: parentRecord.id,
            restrictedCategory: parentRecord.category
          };
          await fetchAllData(parentUser);
          return parentUser;
        }
      }
    } catch (err) {}
    setSyncStatus('error');
    return null;
  };

  const [editingSelfPerson, setEditingSelfPerson] = useState<Person | null>(null);

  const handleOpenSelfProfile = () => {
    if (!state.currentUser) return;
    let matched = state.people.find(p => 
      (state.currentUser?.relatedPersonId && p.id === state.currentUser.relatedPersonId) ||
      p.name === state.currentUser?.username ||
      p.id === state.currentUser?.id
    );
    if (!matched) {
      matched = {
        id: state.currentUser.relatedPersonId || generateUUID(),
        name: state.currentUser.username,
        role: (state.currentUser.role as Role) || 'مدير',
        category: state.currentUser.restrictedCategory || state.categories[0] || 'الرجال',
        certificates: [],
        experiences: []
      };
    }
    setEditingSelfPerson(matched);
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

  if (!state.currentUser) {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('playerId');
    if (pId) {
      return <PublicPlayerView playerId={pId} />;
    }
    return <Login onLoginAttempt={onLoginAttempt} />;
  }

  // إذا كان المستخدم لاعباً، يتم عزله بالكامل في بوابة اللاعب المخصصة
  if (state.currentUser.role === 'لاعب') {
    const playerObj = state.people.find(p => p.id === state.currentUser?.relatedPersonId) || state.people[0];
    const handlePlayerLogout = () => {
      setState({
        currentUser: null,
        categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'],
        people: [],
        sessions: [],
        matches: [],
        warehouse: [],
        technicalReports: [],
        tournaments: [],
        tournamentStages: [],
        tournamentTeams: [],
        tournamentStageTeams: [],
        tournamentMatches: [],
        attendance: [],
        injuries: [],
        tacticalPlans: [],
        users: [],
        notifications: [],
        servicesDirectory: [],
        transfers: [],
      });
      localStorage.clear();
    };

    if (playerObj) {
      return <PlayerPortal player={playerObj} state={state} onLogout={handlePlayerLogout} setState={setState} />;
    }
  }

  
  const toggleNavGroup = (id: string) => {
    setExpandedNav(prev => ({ ...prev, [id]: !prev[id] }));
    if (!isSidebarOpen) setSidebarOpen(true);
  };

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'notifications', label: 'إشعارات الأهالي', icon: Bell },
    { id: 'parent-portal', label: 'بوابة الأهل', icon: LayoutDashboard },
    { 
      id: 'personnel', label: 'شؤون الأفراد', icon: Users, isGroup: true,
      items: [
        { id: 'squad', label: 'اللاعبين', icon: Users },
        { id: 'staff', label: 'المدربين والكوادر', icon: Briefcase },
      ]
    },
    {
      id: 'sports_activity', label: 'النشاط الرياضي', icon: Trophy, isGroup: true,
      items: [
        { id: 'training', label: 'التدريبات', icon: Calendar },
        { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
        { id: 'matches', label: 'المباريات', icon: Trophy },
        { id: 'baraaem-matches', label: 'مباريات البراعم', icon: Baby },
        { id: 'tournaments', label: 'البطولات', icon: Medal },
      ]
    },
    {
      id: 'logistics', label: 'اللوجستيات والطبابة', icon: Package, isGroup: true,
      items: [
        { id: 'medical', label: 'الطبابة', icon: HeartPulse },
        { id: 'transfers', label: 'الانتقالات والإعارة', icon: RefreshCw },
        { id: 'services', label: 'خدمات', icon: MapPin },
        { id: 'warehouse', label: 'المستودع', icon: Package },
      ]
    },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ].filter(item => {
    const role = state.currentUser?.role;
    if (role === 'مدير') return item.id !== 'parent-portal';
    if (role === 'ولي أمر') return ['parent-portal'].includes(item.id);
    if (role === 'مسؤول تجهيزات') return ['warehouse', 'dashboard'].includes(item.id);
    if (item.isGroup) return true;
    return item.id !== 'parent-portal' && item.id !== 'settings';
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
          {navItems.map(item => {
             const isNotifications = item.id === 'notifications';
             const pendingCount = isNotifications ? state.technicalReports.filter(r => ['parent_message', 'pickup_permission', 'absence_request'].includes(r.type) && r.rating === 0).length : 0;
             
             if (item.isGroup) {
                const isExpanded = expandedNav[item.id];
                const hasActiveChild = item.items?.some(sub => sub.id === activeTab);
                
                return (
                  <div key={item.id} className="mb-1">
                    <button onClick={() => toggleNavGroup(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${hasActiveChild ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-blue-100 hover:text-white'}`}>
                      <div className="flex items-center gap-4">
                         <item.icon size={20} className="shrink-0" />
                         <span className={`text-sm font-medium whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>{item.label}</span>
                      </div>
                      {isSidebarOpen && (
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      )}
                    </button>
                    {isExpanded && isSidebarOpen && (
                      <div className="mt-1 space-y-1 px-2 border-r-2 border-white/10 mr-4 pr-2">
                        {item.items?.map(subItem => (
                          <button key={subItem.id} onClick={() => { setActiveTab(subItem.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === subItem.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/10 text-blue-100/70 hover:text-white'}`}>
                            <subItem.icon size={16} className="shrink-0" />
                            <span className="text-xs font-bold whitespace-nowrap">{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
             }

             return (
            <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/10 text-blue-100 hover:text-white'}`}>
              <div className="flex items-center gap-4">
                 <item.icon size={20} className="shrink-0" />
                 <span className={`text-sm font-medium whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:hidden'}`}>{item.label}</span>
              </div>
              {isNotifications && pendingCount > 0 && isSidebarOpen && (
                 <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">{pendingCount}</span>
              )}
            </button>
             );
          })}
        </nav>
        <div className="p-4 mt-auto shrink-0">
          <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3 min-w-0">
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
             {isSidebarOpen && (
               <button
                 type="button"
                 onClick={handleOpenSelfProfile}
                 title="تعديل بياناتي الشخصية"
                 className="p-1.5 bg-white/10 hover:bg-orange-500 text-white rounded-lg transition-all shrink-0 flex items-center gap-1 text-[10px] font-bold"
               >
                 <Edit2 size={12} />
                 <span>بياناتي</span>
               </button>
             )}
          </div>
          <button onClick={() => { 
              setState({ currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'], people: [], sessions: [], matches: [], warehouse: [], technicalReports: [], tournaments: [], tournamentStages: [], tournamentTeams: [], tournamentStageTeams: [], tournamentMatches: [], attendance: [], injuries: [], tacticalPlans: [], users: [], notifications: [], servicesDirectory: [], transfers: [], });
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
             <button
               type="button"
               onClick={handleOpenSelfProfile}
               title="تعديل ملفي الشخصي وبياناتي"
               className="p-2 md:px-3 md:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] md:text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
             >
               <Edit2 size={14} />
               <span className="hidden sm:inline">تعديل بياناتي</span>
             </button>
             <select
               className="bg-slate-100 text-blue-900 px-2 md:px-3 py-2 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs outline-none border border-slate-200"
               value={state.activeSeason || '2025/2026'}
               onChange={(e) => setState({ ...state, activeSeason: e.target.value })}
             >
               {state.seasons?.map(s => (
                 <option key={s} value={s}>موسم {s}</option>
               ))}
             </select>
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
            {activeTab === 'parent-portal' && state.currentUser && <ParentPortal state={derivedState} setState={updateState as any} user={state.currentUser} syncToCloud={syncToCloud} />}
            {activeTab === 'dashboard' && <Dashboard state={derivedState} setState={updateState as any} onMatchClick={(id) => { setSelectedMatchId(id); setPreviousTab(activeTab); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'notifications' && <AdminNotifications state={derivedState} setState={updateState as any} syncToCloud={syncToCloud} />}
            {activeTab === 'squad' && <SquadManagement state={derivedState} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setPreviousTab(activeTab); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'staff' && <StaffManagement state={derivedState} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setPreviousTab(activeTab); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'training' && <TrainingPlanner state={derivedState} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'attendance' && <AttendanceTracker state={derivedState} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'medical' && <MedicalCenter state={derivedState} setState={updateState} syncToCloud={syncToCloud} />}
            {activeTab === 'transfers' && <TransfersManagement state={derivedState} setState={updateState as any} addLog={addNotify} />}
            {activeTab === 'tournaments' && <TournamentsView state={derivedState} setState={updateState as any} syncToCloud={syncToCloud} addLog={addNotify} onMatchClick={(id) => { setSelectedMatchId(id); setPreviousTab(activeTab); setActiveTab('matches'); }} />}
            {activeTab === 'services' && <ServicesView state={derivedState} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'matches' && <MatchPlanner state={derivedState} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="regular" />}
            {activeTab === 'baraaem-matches' && <MatchPlanner state={derivedState} setState={updateState as any} defaultSelectedId={selectedMatchId} getSuspension={getPlayerSuspension} addLog={addNotify} viewMode="baraaem" />}
            {activeTab === 'warehouse' && <WarehouseManagement state={derivedState} setState={updateState} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'settings' && <SettingsView state={derivedState} setState={updateState as any} addLog={addNotify} syncToCloud={syncToCloud} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={derivedState} setState={updateState} onBack={() => setActiveTab(previousTab)} addLog={addNotify} />}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-slate-200 flex items-center justify-around px-2 z-[80] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: 'الرئيسية' },
             { id: 'notifications', icon: Bell, label: 'إشعارات' },
             { id: 'menu', icon: isSidebarOpen ? X : Menu, label: 'القائمة', onClick: () => setSidebarOpen(!isSidebarOpen) },
           ].map(item => {
               const isNotifications = item.id === 'notifications';
               const pendingCount = isNotifications ? state.technicalReports.filter(r => ['parent_message', 'pickup_permission', 'absence_request'].includes(r.type) && r.rating === 0).length : 0;
               const isActive = item.id === 'menu' ? isSidebarOpen : activeTab === item.id;
               return (
             <button key={item.id} onClick={item.onClick || (() => { setActiveTab(item.id); setSidebarOpen(false); })} className={`flex shrink-0 w-16 flex-col items-center gap-1.5 relative ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>
                <item.icon size={24} />
                <span className="text-[10px] font-black">{item.label}</span>
                {isNotifications && pendingCount > 0 && <span className="absolute -top-1 right-3 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-red-500/50">{pendingCount}</span>}
             </button>
             );
           })}
        </nav>
      </div>

      {editingSelfPerson && (
        <EditPersonModal
          person={editingSelfPerson}
          isOpen={Boolean(editingSelfPerson)}
          onClose={() => setEditingSelfPerson(null)}
          onSaved={(updated) => {
            setState(prev => ({
              ...prev,
              people: prev.people.some(p => p.id === updated.id)
                ? prev.people.map(p => p.id === updated.id ? updated : p)
                : [updated, ...prev.people]
            }));
            addNotify('تم حفظ وتحديث بياناتك الشخصية بنجاح!', 'success');
          }}
          isSelf={true}
        />
      )}
    </div>
  );
};

export default App;