import React, { useState, useMemo } from 'react';
import { 
  Trophy, Plus, Save, X, Edit2, Calendar, MapPin, Search, ChevronDown, ChevronUp, 
  Check, Trash2, Filter, Layers, Clock, ArrowUpDown, ChevronRight, Eye 
} from 'lucide-react';
import { AppState, Tournament, TournamentStage, TournamentTeam, TournamentMatch, TournamentStageTeam } from '../types';
import { supabase } from '../App';
import { encodeMatchPitch, decodeMatchPitch } from '../utils/tournamentHelpers';

interface TournamentsViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud: (table: string, data: any) => Promise<boolean>;
  addLog: (msg: string, type: 'success' | 'error') => void;
  onMatchClick?: (id: string) => void;
}

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const TournamentsView: React.FC<TournamentsViewProps> = ({ state, setState, syncToCloud, addLog, onMatchClick }) => {
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourCategory, setNewTourCategory] = useState('');
  const [newTourType, setNewTourType] = useState('دوري');

  const currentUser = state.currentUser;
  const isViewer = currentUser?.role === 'مشاهد' || currentUser?.role === 'معالج';
  const safeTournaments = state.tournaments || [];
  const filteredTournaments = safeTournaments.filter(t => 
    state.globalCategoryFilter === 'الكل' || t.category === state.globalCategoryFilter
  );

  const activeTour = safeTournaments.find(t => t.id === activeTournamentId);

  const handleCreateTournament = async () => {
    if (!newTourName.trim()) return;
    const newId = generateId();
    
    // Determine category
    let finalCategory = newTourCategory || state.globalCategoryFilter;
    if (currentUser?.restrictedCategory) {
       const allowedArr = String(currentUser.restrictedCategory).split(',').filter(Boolean);
       if (!allowedArr.includes(finalCategory)) {
          finalCategory = allowedArr[0] || state.categories[0];
       }
    } else {
      if (finalCategory === 'الكل' || !finalCategory) {
        finalCategory = state.categories[0];
      }
    }
    
    const newT: Tournament = {
      id: newId,
      name: newTourName,
      category: finalCategory,
      status: 'نشطة',
      season: state.activeSeason,
      type: newTourType as any
    };

    const newTeam: TournamentTeam = {
      id: generateId(),
      tournamentId: newId,
      name: `${finalCategory} (الكرامة)`,
      isOurTeam: true
    };

    const success = await syncToCloud('tournaments', newT);
    if(success) {
      await syncToCloud('tournament_teams', newTeam);
      setState(prev => ({ 
        ...prev, 
        tournaments: [...prev.tournaments, newT],
        tournamentTeams: [...(prev.tournamentTeams || []), newTeam]
      }));
      setNewTourName('');
      setNewTourCategory('');
      setIsCreating(false);
      addLog('تم إنشاء البطولة والفريق الافتراضي بنجاح', 'success');
      setActiveTournamentId(newId);
    }
  };

  if (activeTour) {
    return (
      <TournamentDetails 
        tour={activeTour} 
        state={state} 
        setState={setState} 
        syncToCloud={syncToCloud} 
        addLog={addLog}
        onBack={() => setActiveTournamentId(null)} 
        onMatchClick={onMatchClick}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
            <Trophy className="text-orange-500" /> إدارة البطولات
          </h2>
          <p className="text-slate-500 text-sm mt-1">تتبع المنافسات، المجموعات، والنتائج</p>
        </div>
        {!isViewer && (
          <button onClick={() => setIsCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Plus size={20} /> إضافة بطولة
          </button>
        )}
      </div>

      {!isViewer && isCreating && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-2">اسم البطولة الجديدة</label>
            <input type="text" value={newTourName} onChange={e => setNewTourName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="مثال: دوري النخبة لفئة الشباب" />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-slate-500 mb-2">نوع البطولة</label>
            <select value={newTourType} onChange={e=>setNewTourType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
              <option value="دوري">دوري</option>
              <option value="دوري منتظم (ذهاب وإياب)">دوري منتظم (ذهاب وإياب)</option>
              <option value="كأس">كأس</option>
              <option value="بطولة ودية">بطولة ودية</option>
            </select>
          </div>
          {(!currentUser?.restrictedCategory || String(currentUser.restrictedCategory).split(',').filter(Boolean).length > 1) && (
            <div className="w-full md:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-2">فئة النادي المشاركة</label>
              <select value={newTourCategory || (state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter)} onChange={e => setNewTourCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                {(currentUser?.restrictedCategory ? String(currentUser.restrictedCategory).split(',').filter(Boolean) : state.categories).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleCreateTournament} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">
              حفظ
            </button>
            <button onClick={() => setIsCreating(false)} className="flex-1 md:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group" onClick={() => setActiveTournamentId(t.id)}>
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-900 group-hover:bg-orange-500 transition-colors"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{t.category}</span>
                <h3 className="text-xl font-black text-slate-800 mt-3">{t.name}</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === 'نشطة' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
            </div>
            <div className="mt-6 flex gap-4 text-sm text-slate-500">
               <span>المراحل: {(state.tournamentStages || []).filter(s => s.tournamentId === t.id).length}</span>
               <span>الفرق: {(state.tournamentTeams || []).filter(team => team.tournamentId === t.id).length}</span>
            </div>
          </div>
        ))}
        {filteredTournaments.length === 0 && !isCreating && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Trophy size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-bold">لا يوجد بطولات مسجلة لهذه الفئة</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TournamentDetails = ({ tour, state, setState, syncToCloud, addLog, onBack, onMatchClick }: { 
  tour: Tournament, state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, 
  syncToCloud: any, addLog: any, onBack: () => void, onMatchClick?: (id: string) => void 
}) => {
  const stages = (state.tournamentStages || []).filter(s => s.tournamentId === tour.id);
  const teams = (state.tournamentTeams || []).filter(t => t.tournamentId === tour.id);
  const matches = (state.tournamentMatches || []).filter(m => m.tournamentId === tour.id);

  const isViewer = state.currentUser?.role === 'مشاهد' || state.currentUser?.role === 'معالج';
  const canDelete = state.currentUser?.role === 'مدير' || state.currentUser?.role === 'إداري';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteTournament = async () => {
    const { error } = await supabase.from('tournaments').delete().eq('id', tour.id);
    if (error) {
      addLog('خطأ في حذف البطولة: ' + error.message, 'error');
      return;
    }
    // Remove from local state
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments?.filter(t => t.id !== tour.id) || []
    }));
    addLog('تم حذف البطولة بنجاح', 'success');
    onBack();
  };

  const [activeTab, setActiveTab] = useState<'teams' | 'stages'>('stages');

  const hasOurTeam = teams.some(t => t.isOurTeam);
  const [newTeamName, setNewTeamName] = useState(!hasOurTeam ? `${tour.category} (الكرامة)` : '');
  const [newTeamIsOur, setNewTeamIsOur] = useState(!hasOurTeam);

  const [newStageName, setNewStageName] = useState('');
  const [newStageIsGroup, setNewStageIsGroup] = useState(true);

  const handleAddTeam = async () => {
    if(!newTeamName.trim()) return;
    const nt: TournamentTeam = { id: generateId(), tournamentId: tour.id, name: newTeamName, isOurTeam: newTeamIsOur };
    const success = await syncToCloud('tournament_teams', nt);
    if(success) {
      setState(prev => ({ ...prev, tournamentTeams: [...prev.tournamentTeams, nt] }));
      setNewTeamName('');
      setNewTeamIsOur(false);
    }
  };

  const handleAddStage = async () => {
    if(!newStageName.trim()) return;
    const ns: TournamentStage = { id: generateId(), tournamentId: tour.id, name: newStageName, isGroupStage: newStageIsGroup };
    const success = await syncToCloud('tournament_stages', ns);
    if(success) {
      setState(prev => ({ ...prev, tournamentStages: [...prev.tournamentStages, ns] }));
      setNewStageName('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-800">تأكيد الحذف</h3>
            <p className="text-slate-600 text-sm font-medium">
              هل أنت متأكد من حذف هذه البطولة نهائياً؟ ستفقد كافة الفرق والمراحل المرتبطة بها ولن يمكن التراجع.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowDeleteConfirm(false); handleDeleteTournament(); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all">
                نعم، احذف البطولة
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-orange-500 mb-2 block">← العودة للبطولات</button>
           <h2 className="text-2xl font-black text-blue-900">{tour.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
           {canDelete && (
             <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all shadow-sm border border-red-100 flex items-center gap-2">
               <Trash2 size={16} /> <span className="hidden md:inline">حذف البطولة</span>
             </button>
           )}
           <button onClick={() => setActiveTab('stages')} className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'stages' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>المراحل والمباريات</button>
           <button onClick={() => setActiveTab('teams')} className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'teams' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>الفرق المشاركة</button>
        </div>
      </div>

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {!isViewer && (
           <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <h3 className="font-bold text-slate-800">إضافة فريق جديد</h3>
              <input type="text" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="اسم الفريق" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 select-none cursor-pointer">
                 <input type="checkbox" checked={newTeamIsOur} onChange={e=>setNewTeamIsOur(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                 هذا فريقي (لربط المباريات)
              </label>
              <button onClick={handleAddTeam} className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-xl font-bold">إضافة للفريق</button>
           </div>
           )}
           <div className={`${isViewer ? 'md:col-span-3' : 'md:col-span-2'} space-y-4`}>
              {teams.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
                  لا يوجد فرق مضافة. أضف الفرق المشاركة بالبطولة أولاً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map(t => (
                    <div key={t.id} className={`p-4 rounded-xl border flex justify-between items-center ${t.isOurTeam ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                      <span className="font-bold text-slate-800">{t.name}</span>
                      {t.isOurTeam && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-bold">فريقنا</span>}
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className="space-y-8">
           {!isViewer && (
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-end">
              <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 mb-2">اسم المرحلة / المجموعة</label>
                 <input type="text" value={newStageName} onChange={e=>setNewStageName(e.target.value)} placeholder="مثال: المجموعة A، المجموعة B، نصف النهائي" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
              </div>
              <div className="w-48">
                 <label className="block text-xs font-bold text-slate-500 mb-2">نوع المرحلة</label>
                 <select value={newStageIsGroup ? 'true' : 'false'} onChange={e=>setNewStageIsGroup(e.target.value === 'true')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <option value="true">مجموعات (نظام نقاط)</option>
                    <option value="false">إقصائيات (بدون ترتيب)</option>
                 </select>
              </div>
              <button onClick={handleAddStage} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold">إضافة مرحلة</button>
           </div>
           )}

           {stages.map(stage => (
              <StageView 
                key={stage.id} 
                stage={stage} 
                tour={tour} 
                teams={teams} 
                matches={matches.filter(m => m.stageId === stage.id)}
                state={state}
                setState={setState}
                syncToCloud={syncToCloud}
                addLog={addLog}
                onMatchClick={onMatchClick}
              />
           ))}
        </div>
      )}
    </div>
  );
};

const StageView = ({ stage, tour, teams, matches, state, setState, syncToCloud, addLog, onMatchClick }: any) => {
  const isViewer = state.currentUser?.role === 'مشاهد' || state.currentUser?.role === 'معالج';
  const canEdit = !isViewer;

  // فلاتر التصفية
  const [activeLegFilter, setActiveLegFilter] = useState<'الكل' | 'ذهاب' | 'إياب'>('الكل');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'الكل'>('الكل');
  const [standingsFilter, setStandingsFilter] = useState<string>('all');
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  // نموذج إضافة مباراة جديدة
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('16:00');
  const [pitch, setPitch] = useState('');
  const [matchLeg, setMatchLeg] = useState<'ذهاب' | 'إياب'>('ذهاب');
  const [matchRound, setMatchRound] = useState<number>(1);
  const [isHomeAway, setIsHomeAway] = useState(false);
  const [returnMatchRound, setReturnMatchRound] = useState<number>(2);
  const [returnMatchDate, setReturnMatchDate] = useState('');

  // استخراج قائمة الأسابيع المتوفرة في هذه المرحلة
  const allRounds = useMemo(() => {
    const roundSet = new Set<number>();
    matches.forEach((m: any) => {
      const r = Number(m.round) || 1;
      roundSet.add(r);
    });
    if (roundSet.size === 0) roundSet.add(1);
    return Array.from(roundSet).sort((a: any, b: any) => a - b);
  }, [matches]);

  // التحكم بفتح وطي الأسابيع
  const isWeekExpanded = (w: number) => {
    return expandedWeeks[w] !== undefined ? expandedWeeks[w] : true;
  };

  const toggleWeekExpand = (w: number) => {
    setExpandedWeeks(prev => ({ ...prev, [w]: !isWeekExpanded(w) }));
  };

  const setAllWeeksExpanded = (expand: boolean) => {
    const nextMap: Record<number, boolean> = {};
    allRounds.forEach(r => { nextMap[r] = expand; });
    setExpandedWeeks(nextMap);
  };

  // احتساب جدول الترتيب بدقة مع مراعاة فلترة الجولة ومرحلة الذهاب/الإياب
  const standings = useMemo(() => {
    if (!stage.isGroupStage) return [];
    
    // الفرق المشاركة في هذه المرحلة
    const stageTeamIds = new Set<string>();
    teams.forEach((t: any) => stageTeamIds.add(t.id));
    
    const table: any = {};
    stageTeamIds.forEach((id: string) => {
      const t = teams.find((x: any) => x.id === id);
      table[id] = { id, name: t?.name || 'مجهول', pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    matches.forEach((m: any) => {
      const mRound = Number(m.round) || 1;
      const mLeg = m.leg || 'ذهاب';

      // تطبيق فلترة حساب الترتيب (حتى أسبوع محدد أو مرحلة محددة)
      if (standingsFilter === 'leg1' && mLeg !== 'ذهاب') return;
      if (standingsFilter === 'leg2' && mLeg !== 'إياب') return;
      if (standingsFilter.startsWith('round_')) {
        const maxR = parseInt(standingsFilter.replace('round_', ''), 10);
        if (mRound > maxR) return;
      }

      let isPlayed = m.status === 'ملعوبة';
      let s1 = m.team1Score;
      let s2 = m.team2Score;
      
      if (m.linkedMatchId) {
         const lMatch = state.matches.find((x: any) => x.id === m.linkedMatchId);
         if (lMatch && lMatch.isCompleted) {
            isPlayed = true;
            const t1Obj = teams.find((tz: any) => tz.id === m.team1Id);
            const t2Obj = teams.find((tz: any) => tz.id === m.team2Id);
            s1 = t1Obj?.isOurTeam ? parseInt(lMatch.ourScore) : parseInt(lMatch.opponentScore);
            s2 = t2Obj?.isOurTeam ? parseInt(lMatch.ourScore) : parseInt(lMatch.opponentScore);
         }
      }

      if (isPlayed && s1 != null && s2 != null && !isNaN(s1) && !isNaN(s2)) {
        const row1 = table[m.team1Id];
        const row2 = table[m.team2Id];
        if (!row1 || !row2) return;

        row1.pld++; row2.pld++;
        row1.gf += s1; row1.ga += s2;
        row2.gf += s2; row2.ga += s1;
        
        if (s1 > s2) {
           row1.w++; row2.l++; row1.pts += 3;
        } else if (s1 < s2) {
           row2.w++; row1.l++; row2.pts += 3;
        } else {
           row1.d++; row2.d++; row1.pts += 1; row2.pts += 1;
        }
      }
    });

    return Object.values(table)
      .map((t: any) => { t.gd = t.gf - t.ga; return t; })
      .sort((a: any, b: any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [stage, matches, teams, state.matches, standingsFilter]);

  // إضافة مباراة جديدة (أو مباراتي ذهاب وإياب معاً)
  const handleAddMatch = async () => {
    if (!t1 || !t2 || t1 === t2) { addLog('يرجى اختيار فريقين مختلفين', 'error'); return; }
    
    const t1Obj = teams.find((tz: any) => tz.id === t1);
    const t2Obj = teams.find((tz: any) => tz.id === t2);
    const involvesOurTeam = t1Obj?.isOurTeam || t2Obj?.isOurTeam;
    
    let linkedMatchId = null;
    let linkedMatchIdLeg2 = null;
    let newOurMatch: any = null;
    
    if (involvesOurTeam) {
       const newOurMatchId = generateId();
       const opponentTeam = t1Obj?.isOurTeam ? t2Obj : t1Obj;
       newOurMatch = {
         id: newOurMatchId,
         category: tour.category,
         season: tour.season || state.activeSeason,
         matchType: tour.type || 'دوري',
         opponent: opponentTeam?.name || '',
         date: matchDate || new Date().toISOString().split('T')[0],
         time: matchTime || '16:00',
         advancePayment: '0',
         isCompleted: false,
         ourScore: '0',
         opponentScore: '0',
         stoppageTime1: '0',
         stoppageTime2: '0',
         pitch: pitch || 'غير محدد',
         referee: '',
         homeCoach: '',
         awayCoach: '',
         events: [],
         lineup: { 
           starters: Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '90' })),
           subs: [], 
           staff: [], 
           captain: '' 
         },
         notes: `بطولة: ${tour.name} - ${stage.name} - الأسبوع ${matchRound} (${matchLeg})`,
         isHome: t1Obj?.isOurTeam
       };
       
       await syncToCloud('matches', newOurMatch);
       setState((prev: any) => ({ ...prev, matches: [...prev.matches, newOurMatch] }));
       linkedMatchId = newOurMatchId;

       if (isHomeAway) {
           const newOurMatchIdLeg2 = generateId();
           const calcLeg2Date = returnMatchDate || (() => {
             const d = new Date(matchDate);
             d.setDate(d.getDate() + 7);
             return d.toISOString().split('T')[0];
           })();
           const newOurMatch2 = { 
             ...newOurMatch, 
             id: newOurMatchIdLeg2, 
             date: calcLeg2Date,
             notes: `بطولة: ${tour.name} - ${stage.name} - الأسبوع ${returnMatchRound || (Number(matchRound) + 1)} (إياب)`, 
             isHome: !(t1Obj?.isOurTeam) 
           };
           await syncToCloud('matches', newOurMatch2);
           setState((prev: any) => ({ ...prev, matches: [...prev.matches, newOurMatch2] }));
           linkedMatchIdLeg2 = newOurMatchIdLeg2;
       }
    }

    const nm: TournamentMatch = {
      id: generateId(),
      tournamentId: tour.id,
      stageId: stage.id,
      team1Id: t1,
      team2Id: t2,
      matchDate,
      matchTime,
      pitch,
      round: Number(matchRound) || 1,
      leg: matchLeg,
      status: 'قادمة',
      linkedMatchId: linkedMatchId || null
    };

    const success = await syncToCloud('tournament_matches', nm);
    if (success) {
      let addedMatches = [nm];
      
      if (isHomeAway) {
         const calcLeg2Date = returnMatchDate || (() => {
           const d = new Date(matchDate);
           d.setDate(d.getDate() + 7);
           return d.toISOString().split('T')[0];
         })();
         const nmLeg2: TournamentMatch = {
            id: generateId(),
            tournamentId: tour.id,
            stageId: stage.id,
            team1Id: t2, // عكس الأرض والضيف للإياب
            team2Id: t1,
            matchDate: calcLeg2Date,
            matchTime,
            pitch,
            round: Number(returnMatchRound) || (Number(matchRound) + 1),
            leg: 'إياب',
            status: 'قادمة',
            linkedMatchId: linkedMatchIdLeg2 || null
         };
         await syncToCloud('tournament_matches', nmLeg2);
         addedMatches.push(nmLeg2);
      }

      setState((prev: any) => ({ ...prev, tournamentMatches: [...prev.tournamentMatches, ...addedMatches] }));
      setIsAddingMatch(false);
      setT1(''); setT2('');
      setPitch('');
      setIsHomeAway(false);
      
      if (linkedMatchId && onMatchClick) {
        addLog('تمت إضافة ' + (isHomeAway ? 'مباراتي الذهاب والإياب' : 'المباراة') + ' بنجاح، يُرجى استكمال البيانات والتشكيلة', 'success');
        onMatchClick(linkedMatchId);
      } else {
        addLog('تمت إضافة ' + (isHomeAway ? 'مباراتي الذهاب والإياب' : 'المباراة') + ' بنجاح', 'success');
      }
    }
  };

  // تسجيل وحفظ النتيجة
  const setScore = async (matchId: string, s1: number, s2: number) => {
    const mm = matches.find((m: any) => m.id === matchId);
    if (!mm) return;
    
    const updatedM = { ...mm, status: 'ملعوبة', team1Score: s1, team2Score: s2 };
    await syncToCloud('tournament_matches', updatedM);
    setState((prev: any) => ({
       ...prev,
       tournamentMatches: prev.tournamentMatches.map((mx: any) => mx.id === matchId ? updatedM : mx)
    }));

    if (mm.linkedMatchId) {
       const t1Obj = teams.find((tz: any) => tz.id === mm.team1Id);
       const isOurTeam1 = t1Obj?.isOurTeam;
       const linkedMatch = state.matches.find((x: any) => x.id === mm.linkedMatchId);
       if (linkedMatch) {
         const upLinked = { ...linkedMatch, isCompleted: true, ourScore: isOurTeam1 ? s1.toString() : s2.toString(), opponentScore: isOurTeam1 ? s2.toString() : s1.toString() };
         await syncToCloud('matches', upLinked);
         setState((prev: any) => ({ ...prev, matches: prev.matches.map((mx: any) => mx.id === linkedMatch.id ? upLinked : mx) }));
       }
    }
    addLog('تم تحديث نتيجة المباراة بنجاح', 'success');
  };

  // تعديل بيانات مباراة
  const handleSaveEditMatch = async () => {
    if (!editingMatch) return;
    const payload = { ...editingMatch };
    const success = await syncToCloud('tournament_matches', payload);
    if (success) {
      setState((prev: any) => ({
        ...prev,
        tournamentMatches: prev.tournamentMatches.map((mx: any) => mx.id === editingMatch.id ? editingMatch : mx)
      }));
      setEditingMatch(null);
      addLog('تم تعديل بيانات المباراة بنجاح', 'success');
    }
  };

  // حذف مباراة
  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المباراة نهائياً؟')) return;
    const mm = matches.find((m: any) => m.id === matchId);
    const { error } = await supabase.from('tournament_matches').delete().eq('id', matchId);
    if (error) {
      addLog('خطأ في حذف المباراة: ' + error.message, 'error');
      return;
    }
    if (mm?.linkedMatchId) {
      await supabase.from('matches').delete().eq('id', mm.linkedMatchId);
      setState((prev: any) => ({
        ...prev,
        matches: prev.matches.filter((x: any) => x.id !== mm.linkedMatchId),
        tournamentMatches: prev.tournamentMatches.filter((x: any) => x.id !== matchId)
      }));
    } else {
      setState((prev: any) => ({
        ...prev,
        tournamentMatches: prev.tournamentMatches.filter((x: any) => x.id !== matchId)
      }));
    }
    addLog('تم حذف المباراة بنجاح', 'success');
  };

  // تصفية المباريات حسب مرحلة الذهاب/الإياب والأسبوع
  const filteredMatches = useMemo(() => {
    return matches.filter((m: any) => {
      const mLeg = m.leg || 'ذهاب';
      const mRound = Number(m.round) || 1;

      if (activeLegFilter !== 'الكل' && mLeg !== activeLegFilter) return false;
      if (selectedWeekFilter !== 'الكل' && mRound !== selectedWeekFilter) return false;

      return true;
    });
  }, [matches, activeLegFilter, selectedWeekFilter]);

  // تجميع المباريات حسب الأسبوع مع الفرز من الأحدث إلى الأقدم (الأسبوع الأحدث أولاً)
  const groupedByWeek = useMemo(() => {
    const map = new Map<number, any[]>();
    filteredMatches.forEach((m: any) => {
      const r = Number(m.round) || 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    });

    // فرز تنازلي: الأسبوع الأحدث أولاً
    const sortedRounds = Array.from(map.keys()).sort((a: any, b: any) => b - a);
    return sortedRounds.map(r => ({
      round: r,
      matches: map.get(r)!
    }));
  }, [filteredMatches]);

  return (
    <div className="space-y-6">
       {/* رأس المرحلة وزر إضافة مباراة */}
       <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
             <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
               {stage.isGroupStage ? 'نظام دوري / نقاط' : 'نظام إقصائي'}
             </span>
             <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-2">{stage.name}</h3>
          </div>
          {!isViewer && (
            <button 
              onClick={() => {
                setMatchRound(latestRoundNumber(matches));
                setIsAddingMatch(!isAddingMatch);
              }} 
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus size={18} /> إضافة مباراة
            </button>
          )}
       </div>

       {/* نموذج إضافة مباراة جديدة */}
       {!isViewer && isAddingMatch && (
         <div className="bg-white p-4 sm:p-6 rounded-3xl border border-orange-200 shadow-md space-y-4 animate-in fade-in">
           <div className="flex justify-between items-center border-b border-slate-100 pb-3">
             <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
               <Plus size={18} className="text-orange-500" /> إضافة مباراة في {stage.name}
             </h4>
             <button onClick={() => setIsAddingMatch(false)} className="text-slate-400 hover:text-slate-600 p-1">
               <X size={18} />
             </button>
           </div>

           {/* اختيار الفريقين */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الفريق الأول (المستضيف / الأرض)</label>
                <select value={t1} onChange={e => setT1(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500">
                   <option value="">اختر الفريق الأول...</option>
                   {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name} {t.isOurTeam ? '(فريقنا)' : ''}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الفريق الثاني (الضيف / الخصم)</label>
                <select value={t2} onChange={e => setT2(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500">
                   <option value="">اختر الفريق الثاني...</option>
                   {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name} {t.isOurTeam ? '(فريقنا)' : ''}</option>)}
                </select>
             </div>
           </div>

           {/* الجولة والمرحلة */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">رقم الأسبوع / الجولة</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min={1} 
                    max={50} 
                    value={matchRound} 
                    onChange={e => setMatchRound(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-black text-center text-blue-900 focus:outline-none focus:border-orange-500" 
                  />
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => setMatchRound(r => r + 1)} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">+</button>
                    <button type="button" onClick={() => setMatchRound(r => Math.max(1, r - 1))} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold">-</button>
                  </div>
                </div>
             </div>

             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">مرحلة المباراة</label>
                <select 
                  value={matchLeg} 
                  onChange={e => setMatchLeg(e.target.value as any)} 
                  disabled={isHomeAway}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                >
                   <option value="ذهاب">مرحلة الذهاب</option>
                   <option value="إياب">مرحلة الإياب</option>
                </select>
             </div>

             <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer select-none hover:border-orange-300 transition-all">
                  <input 
                    type="checkbox" 
                    id="isHomeAwayChk" 
                    checked={isHomeAway} 
                    onChange={e => setIsHomeAway(e.target.checked)} 
                    className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500" 
                  />
                  <span className="text-xs font-bold text-slate-700">إنشاء مباراتي الذهاب والإياب معاً</span>
                </label>
             </div>
           </div>

           {/* تفاصيل مباراة الإياب التلقائية في حال تفعيل الخيار */}
           {isHomeAway && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-orange-50 p-4 rounded-2xl border border-orange-200 animate-in fade-in">
               <div>
                  <label className="block text-xs font-bold text-orange-800 mb-1.5">أسبوع مباراة الإياب</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={50} 
                    value={returnMatchRound || (Number(matchRound) + 1)} 
                    onChange={e => setReturnMatchRound(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-full bg-white border border-orange-200 rounded-xl p-3 text-sm font-black text-center text-orange-900 focus:outline-none" 
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-orange-800 mb-1.5">تاريخ مباراة الإياب (اختياري)</label>
                  <input 
                    type="date" 
                    value={returnMatchDate} 
                    onChange={e => setReturnMatchDate(e.target.value)} 
                    className="w-full bg-white border border-orange-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none" 
                  />
               </div>
             </div>
           )}

           {/* التاريخ والوقت والملعب */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">تاريخ المباراة</label>
                <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">وقت المباراة</label>
                <input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">الملعب</label>
                <input type="text" value={pitch} onChange={e => setPitch(e.target.value)} placeholder="اسم الملعب أو المدينة" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500" />
             </div>
           </div>

           <div className="flex gap-3 justify-end pt-2">
             <button onClick={() => setIsAddingMatch(false)} className="px-5 py-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-sm">
               إلغاء
             </button>
             <button onClick={handleAddMatch} className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm transition-all">
               حفظ المباراة
             </button>
           </div>
         </div>
       )}

       {/* نافذة تعديل مباراة */}
       {editingMatch && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95" dir="rtl">
             <div className="flex justify-between items-center border-b border-slate-100 pb-3">
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Edit2 size={18} className="text-orange-500" /> تعديل بيانات المباراة
               </h3>
               <button onClick={() => setEditingMatch(null)} className="text-slate-400 hover:text-slate-600 p-1">
                 <X size={18} />
               </button>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">رقم الأسبوع / الجولة</label>
                 <input 
                   type="number" 
                   value={editingMatch.round || 1} 
                   onChange={e => setEditingMatch({ ...editingMatch, round: parseInt(e.target.value) || 1 })} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-sm" 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">المرحلة</label>
                 <select 
                   value={editingMatch.leg || 'ذهاب'} 
                   onChange={e => setEditingMatch({ ...editingMatch, leg: e.target.value })} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-sm"
                 >
                   <option value="ذهاب">مرحلة الذهاب</option>
                   <option value="إياب">مرحلة الإياب</option>
                 </select>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">التاريخ</label>
                 <input 
                   type="date" 
                   value={editingMatch.matchDate || ''} 
                   onChange={e => setEditingMatch({ ...editingMatch, matchDate: e.target.value })} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-sm" 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">الوقت</label>
                 <input 
                   type="time" 
                   value={editingMatch.matchTime || ''} 
                   onChange={e => setEditingMatch({ ...editingMatch, matchTime: e.target.value })} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-sm" 
                 />
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-600 mb-1">الملعب</label>
               <input 
                 type="text" 
                 value={editingMatch.pitch || ''} 
                 onChange={e => setEditingMatch({ ...editingMatch, pitch: e.target.value })} 
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-sm" 
               />
             </div>

             <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
               <label className="block text-xs font-bold text-slate-600 mb-2">النتيجة والحالة</label>
               <div className="flex items-center gap-3">
                 <input 
                   type="number" 
                   placeholder="فريق 1" 
                   value={editingMatch.team1Score != null ? editingMatch.team1Score : ''} 
                   onChange={e => setEditingMatch({ ...editingMatch, team1Score: e.target.value === '' ? null : parseInt(e.target.value), status: 'ملعوبة' })} 
                   className="w-16 text-center bg-white border border-slate-200 rounded-xl p-2 font-bold" 
                 />
                 <span className="font-bold text-slate-400">-</span>
                 <input 
                   type="number" 
                   placeholder="فريق 2" 
                   value={editingMatch.team2Score != null ? editingMatch.team2Score : ''} 
                   onChange={e => setEditingMatch({ ...editingMatch, team2Score: e.target.value === '' ? null : parseInt(e.target.value), status: 'ملعوبة' })} 
                   className="w-16 text-center bg-white border border-slate-200 rounded-xl p-2 font-bold" 
                 />
                 <select 
                   value={editingMatch.status} 
                   onChange={e => setEditingMatch({ ...editingMatch, status: e.target.value })} 
                   className="flex-1 bg-white border border-slate-200 rounded-xl p-2 font-bold text-xs"
                 >
                   <option value="قادمة">قادمة</option>
                   <option value="ملعوبة">ملعوبة</option>
                 </select>
               </div>
             </div>

             <div className="flex gap-2 justify-end pt-2">
               <button onClick={() => setEditingMatch(null)} className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-sm">
                 إلغاء
               </button>
               <button onClick={handleSaveEditMatch} className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm">
                 حفظ التعديلات
               </button>
             </div>
           </div>
         </div>
       )}

       {/* ======================================================== */}
       {/* 1. جدول الترتيب أول الصفحة (مع مراعاة التجاوب الكامل مع الهواتف) */}
       {/* ======================================================== */}
       {stage.isGroupStage && (
         <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
               <div>
                  <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Trophy className="text-orange-500" size={20} /> جدول الترتيب العام
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تحديث تلقائي فوري للنقاط والفوارق والأهداف
                  </p>
               </div>

               {/* خيار عرض الترتيب العام عند جولة محددة أو مرحلة الذهاب/الإياب */}
               <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Filter size={14} /> الترتيب حتى:
                  </label>
                  <select 
                    value={standingsFilter} 
                    onChange={e => setStandingsFilter(e.target.value)} 
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-900 focus:outline-none focus:border-orange-500 w-full sm:w-auto shadow-sm"
                  >
                     <option value="all">كافة الجولات (الترتيب التراكمي الكامل)</option>
                     <option value="leg1">مرحلة الذهاب فقط</option>
                     <option value="leg2">مرحلة الإياب فقط</option>
                     {allRounds.map(r => (
                       <option key={r} value={`round_${r}`}>
                         حتى الأسبوع / الجولة {r}
                       </option>
                     ))}
                  </select>
               </div>
            </div>

            {/* جدول الترتيب متجاوب بالكامل مع شاشات الهواتف عبر شريط تمرير سلس */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-2 sm:px-0">
               <table className="w-full text-xs sm:text-sm text-right min-w-[540px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] sm:text-xs font-black">
                     <tr>
                       <th className="px-3 sm:px-4 py-3 text-center w-10">#</th>
                       <th className="px-3 sm:px-4 py-3">الفريق</th>
                       <th className="px-2 py-3 text-center" title="المباريات الملعوبة">لعب</th>
                       <th className="px-2 py-3 text-center text-emerald-600" title="فوز">ف</th>
                       <th className="px-2 py-3 text-center text-slate-500" title="تعادل">ت</th>
                       <th className="px-2 py-3 text-center text-red-500" title="خسارة">خ</th>
                       <th className="px-2 py-3 text-center" title="أهداف له">له</th>
                       <th className="px-2 py-3 text-center" title="أهداف عليه">عليه</th>
                       <th className="px-2 py-3 text-center" title="فارق الأهداف">+/-</th>
                       <th className="px-4 py-3 text-center font-black text-blue-900 bg-blue-50/50" title="إجمالي النقاط">النقاط</th>
                     </tr>
                  </thead>
                  <tbody className="font-medium divide-y divide-slate-100">
                     {standings.map((r: any, idx: number) => {
                        const isOurTeam = teams.find((tz: any) => tz.id === r.id)?.isOurTeam;
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${isOurTeam ? 'bg-orange-50/50 font-bold' : ''}`}>
                             <td className="px-3 sm:px-4 py-3 text-center">
                               {idx === 0 ? (
                                 <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-black text-xs inline-flex items-center justify-center shadow-sm">1</span>
                               ) : idx === 1 ? (
                                 <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 font-black text-xs inline-flex items-center justify-center">2</span>
                               ) : idx === 2 ? (
                                 <span className="w-6 h-6 rounded-full bg-amber-600/40 text-amber-900 font-black text-xs inline-flex items-center justify-center">3</span>
                               ) : (
                                 <span className="text-slate-400 font-bold">{idx + 1}</span>
                               )}
                             </td>
                             <td className="px-3 sm:px-4 py-3 text-slate-800">
                               <div className="flex items-center gap-1.5">
                                 <span>{r.name}</span>
                                 {isOurTeam && (
                                   <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                     فريقنا
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-2 py-3 text-center text-slate-700 font-bold">{r.pld}</td>
                             <td className="px-2 py-3 text-center text-emerald-600 font-bold">{r.w}</td>
                             <td className="px-2 py-3 text-center text-slate-500 font-bold">{r.d}</td>
                             <td className="px-2 py-3 text-center text-red-500 font-bold">{r.l}</td>
                             <td className="px-2 py-3 text-center text-slate-600">{r.gf}</td>
                             <td className="px-2 py-3 text-center text-slate-600">{r.ga}</td>
                             <td className="px-2 py-3 text-center font-bold dir-ltr">
                               <span className={r.gd > 0 ? 'text-emerald-600' : r.gd < 0 ? 'text-red-500' : 'text-slate-400'}>
                                 {r.gd > 0 ? `+${r.gd}` : r.gd}
                               </span>
                             </td>
                             <td className="px-4 py-3 text-center font-black text-blue-900 bg-blue-50/30 text-sm">
                               {r.pts}
                             </td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>
               {standings.length === 0 && (
                 <div className="p-6 text-center text-xs text-slate-400 font-bold">
                   لا توجد نتائج مباريات مسجلة لاحتساب جدول الترتيب بعد.
                 </div>
               )}
            </div>
         </div>
       )}

       {/* ======================================================== */}
       {/* 2. جدول المباريات تحت جدول الترتيب ومفرز حسب الأسبوع الأحدث */}
       {/* ======================================================== */}
       <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-6">
          {/* شريط الأدوات والفلاتر */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
             <div className="flex items-center gap-3">
                <Calendar className="text-orange-500" size={22} />
                <div>
                   <h4 className="font-black text-slate-800 text-base sm:text-lg">مباريات {stage.name}</h4>
                   <span className="text-xs text-slate-500 font-bold">
                     مقسمة حسب الأسابيع ومرتبة حسب الأسبوع الأحدث
                   </span>
                </div>
             </div>

             <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* تبويبات الذهاب والإياب */}
                <div className="flex bg-white rounded-xl p-1 border border-slate-200 text-xs font-bold shadow-sm">
                   <button 
                     onClick={() => setActiveLegFilter('الكل')} 
                     className={`px-3 py-1.5 rounded-lg transition-all ${activeLegFilter === 'الكل' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                   >
                     الكل
                   </button>
                   <button 
                     onClick={() => setActiveLegFilter('ذهاب')} 
                     className={`px-3 py-1.5 rounded-lg transition-all ${activeLegFilter === 'ذهاب' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                   >
                     مرحلة الذهاب
                   </button>
                   <button 
                     onClick={() => setActiveLegFilter('إياب')} 
                     className={`px-3 py-1.5 rounded-lg transition-all ${activeLegFilter === 'إياب' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                   >
                     مرحلة الإياب
                   </button>
                </div>

                {/* قائمة منسدلة لاختيار الأسبوع */}
                <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-[150px]">
                   <select 
                     value={selectedWeekFilter} 
                     onChange={e => setSelectedWeekFilter(e.target.value === 'الكل' ? 'الكل' : parseInt(e.target.value))} 
                     className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 shadow-sm"
                   >
                      <option value="الكل">جميع الأسابيع ({matches.length} مباراة)</option>
                      {allRounds.map(r => (
                        <option key={r} value={r}>
                          الأسبوع {r} ({matches.filter((m: any) => (m.round || 1) === r).length} مباراة)
                        </option>
                      ))}
                   </select>
                </div>

                {/* زر فتح / طي كافة الأسابيع */}
                <div className="flex gap-1">
                   <button 
                     onClick={() => setAllWeeksExpanded(true)} 
                     className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold border border-slate-200 shadow-sm transition-all"
                     title="توسيع كافة الأسابيع"
                   >
                     فتح الكل
                   </button>
                   <button 
                     onClick={() => setAllWeeksExpanded(false)} 
                     className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-bold border border-slate-200 shadow-sm transition-all"
                     title="طي كافة الأسابيع"
                   >
                     طي الكل
                   </button>
                </div>
             </div>
          </div>

          {/* قائمة المجموعات المقسمة حسب الأسابيع (مرتبة حسب الأسبوع الأحدث أولاً) */}
          {groupedByWeek.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <Calendar size={36} className="mx-auto mb-2 text-slate-300" />
               <p className="text-sm font-bold">لا توجد مباريات مسجلة وفق الفلتر المحدد</p>
               {!isViewer && (
                 <button onClick={() => setIsAddingMatch(true)} className="mt-3 text-xs text-orange-600 font-bold hover:underline">
                   + انقر هنا لإضافة أول مباراة
                 </button>
               )}
            </div>
          ) : (
            <div className="space-y-6">
               {groupedByWeek.map(weekGroup => {
                  const weekNum = weekGroup.round;
                  const weekMatches = weekGroup.matches;
                  const isExpanded = isWeekExpanded(weekNum);
                  const playedCount = weekMatches.filter((m: any) => m.status === 'ملعوبة').length;

                  return (
                    <div key={weekNum} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                       {/* رأس الأسبوع القابل للنقر (أكورديون) */}
                       <div 
                         onClick={() => toggleWeekExpand(weekNum)} 
                         className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white hover:bg-slate-100/80 cursor-pointer transition-colors border-b border-slate-100"
                       >
                          <div className="flex items-center gap-3">
                             <span className="w-8 h-8 rounded-xl bg-blue-900 text-white font-black text-sm flex items-center justify-center shadow-sm">
                               {weekNum}
                             </span>
                             <div>
                                <h5 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                  الأسبوع {weekNum}
                                  {weekMatches[0]?.leg && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${weekMatches[0].leg === 'ذهاب' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      مرحلة {weekMatches[0].leg}
                                    </span>
                                  )}
                                </h5>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {weekMatches.length} مباريات ({playedCount} ملعوبة)
                                </span>
                             </div>
                          </div>

                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                               {isExpanded ? 'طي المباريات' : 'عرض المباريات'}
                             </span>
                             {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                          </div>
                       </div>

                       {/* قائمة مباريات الأسبوع */}
                       {isExpanded && (
                         <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/40">
                            {weekMatches.map((m: any) => {
                               const team1 = teams.find((x: any) => x.id === m.team1Id);
                               const team2 = teams.find((x: any) => x.id === m.team2Id);
                               
                               let isPlayed = m.status === 'ملعوبة';
                               let t1Score = m.team1Score;
                               let t2Score = m.team2Score;
                               
                               if (m.linkedMatchId) {
                                  const lMatch = state.matches.find((x: any) => x.id === m.linkedMatchId);
                                  if (lMatch && lMatch.isCompleted) {
                                     isPlayed = true;
                                     t1Score = team1?.isOurTeam ? lMatch.ourScore : lMatch.opponentScore;
                                     t2Score = team2?.isOurTeam ? lMatch.ourScore : lMatch.opponentScore;
                                  } else {
                                     isPlayed = false;
                                  }
                               }

                               return (
                                 <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col justify-between gap-3 hover:border-orange-300 transition-all">
                                    {/* شريط معلومات المباراة العلوي */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-b border-slate-100 pb-2">
                                       <span className="flex items-center gap-1.5">
                                         <Calendar size={13} className="text-orange-500" /> {m.matchDate || 'تاريخ غير محدد'} • {m.matchTime || '16:00'}
                                       </span>
                                       <div className="flex items-center gap-1.5">
                                          {m.leg && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.leg === 'ذهاب' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                              {m.leg}
                                            </span>
                                          )}
                                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-bold">
                                            الأسبوع {m.round || 1}
                                          </span>
                                       </div>
                                    </div>

                                    {/* الفرق والنتيجة */}
                                    <div className="flex items-center justify-between gap-2 my-1">
                                       {/* الفريق الأول */}
                                       <div className="flex-1 text-right">
                                          <span className={`font-black text-sm sm:text-base block truncate ${team1?.isOurTeam ? 'text-orange-600' : 'text-slate-800'}`}>
                                            {team1?.name || 'فريق 1'}
                                          </span>
                                          {team1?.isOurTeam && <span className="text-[10px] text-orange-500 font-bold">فريقنا</span>}
                                       </div>

                                       {/* النتيجة في المنتصف */}
                                       <div className="shrink-0 px-2 flex justify-center items-center">
                                         {isPlayed ? (
                                            <div className="bg-blue-900 text-white px-3.5 py-1 rounded-full text-base font-black tracking-widest shadow-sm">
                                              {t1Score} - {t2Score}
                                            </div>
                                         ) : m.linkedMatchId ? (
                                            <button 
                                              onClick={() => onMatchClick && onMatchClick(m.linkedMatchId)} 
                                              className="bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-sm border border-orange-200"
                                            >
                                               تعيين التشكيلة والنتيجة
                                            </button>
                                         ) : (
                                            <div className="flex items-center gap-1.5">
                                               <input type="number" id={`s1-${m.id}`} className="w-9 h-8 text-center border border-slate-300 rounded-lg font-black text-sm bg-slate-50 focus:bg-white focus:outline-none" defaultValue={0} />
                                               <span className="text-slate-400 font-bold">-</span>
                                               <input type="number" id={`s2-${m.id}`} className="w-9 h-8 text-center border border-slate-300 rounded-lg font-black text-sm bg-slate-50 focus:bg-white focus:outline-none" defaultValue={0} />
                                               <button 
                                                 onClick={() => {
                                                    const v1 = parseInt((document.getElementById(`s1-${m.id}`) as HTMLInputElement).value) || 0;
                                                    const v2 = parseInt((document.getElementById(`s2-${m.id}`) as HTMLInputElement).value) || 0;
                                                    setScore(m.id, v1, v2);
                                                 }} 
                                                 className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm transition-all"
                                                 title="تثبيت النتيجة"
                                               >
                                                 <Check size={14}/>
                                               </button>
                                            </div>
                                         )}
                                       </div>

                                       {/* الفريق الثاني */}
                                       <div className="flex-1 text-left">
                                          <span className={`font-black text-sm sm:text-base block truncate ${team2?.isOurTeam ? 'text-orange-600' : 'text-slate-800'}`}>
                                            {team2?.name || 'فريق 2'}
                                          </span>
                                          {team2?.isOurTeam && <span className="text-[10px] text-orange-500 font-bold">فريقنا</span>}
                                       </div>
                                    </div>

                                    {/* شريط الملعب والأزرار */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                       <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                                         <MapPin size={12} className="text-slate-400" /> {m.pitch || 'ملعب غير محدد'}
                                       </span>

                                       <div className="flex items-center gap-1">
                                          {m.linkedMatchId && isPlayed && (
                                            <button 
                                              onClick={() => onMatchClick && onMatchClick(m.linkedMatchId)} 
                                              className="text-[10px] text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-bold transition-colors"
                                              title="معاينة التقرير الكامل"
                                            >
                                               تقرير المباراة
                                            </button>
                                          )}
                                          {!isViewer && (
                                            <>
                                              <button 
                                                onClick={() => setEditingMatch(m)} 
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="تعديل المباراة"
                                              >
                                                <Edit2 size={13} />
                                              </button>
                                              <button 
                                                onClick={() => handleDeleteMatch(m.id)} 
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="حذف المباراة"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                       )}
                    </div>
                  );
               })}
            </div>
          )}
       </div>
    </div>
  );
};

// دالة مساعدة لتحديد رقم الجولة التالي افتراضياً
function latestRoundNumber(matches: any[]): number {
  if (!matches || matches.length === 0) return 1;
  const rounds = matches.map((m: any) => Number(m.round) || 1);
  return Math.max(...rounds, 1);
}

export default TournamentsView;
