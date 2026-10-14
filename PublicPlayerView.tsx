import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import { AppState, Person } from '../types';
import PlayerReport from './PlayerReport';
import { Loader2 } from 'lucide-react';
import ClubLogo from './ClubLogo';

interface PublicPlayerViewProps {
  playerId: string;
}

const PublicPlayerView: React.FC<PublicPlayerViewProps> = ({ playerId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockState, setMockState] = useState<AppState | null>(null);
  const [player, setPlayer] = useState<Person | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        // Call the RPC function
        const { data, error } = await supabase.rpc('get_public_player_data', {
          p_player_id: playerId,
        });

        if (error) throw error;
        if (!data || !data.player) throw new Error('لم يتم العثور على اللاعب');

        const playerData = data.player as Person;
        setPlayer(playerData);

        // Construct mock state
        const newState: AppState = {
          currentUser: { id: 'guest', username: 'زائر', role: 'مشاهد', email: 'guest@example.com' },
          categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال', 'البراعم'],
          people: [playerData],
          sessions: [], // We don't have all sessions, but attendance has sessionId. PlayerReport only cares about total numbers or uses state.sessions if needed. Wait, let's see what PlayerReport uses.
          matches: data.matches || [],
          attendance: data.attendance || [],
          warehouse: [],
          technicalReports: [],
          tournaments: [],
          tournamentStages: [],
          tournamentTeams: [],
          tournamentStageTeams: [],
          tournamentMatches: [],
          injuries: [],
          tacticalPlans: [],
          users: [],
          notifications: [],
          servicesDirectory: [],
          globalCategoryFilter: 'الكل'
        };

        setMockState(newState);
      } catch (e: any) {
        console.error('Error fetching public player data:', e);
        setError(e.message || 'حدث خطأ أثناء تحميل بيانات اللاعب');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden" dir="rtl">
        <div className="text-center z-10 relative">
          <ClubLogo size={80} className="mb-6 mx-auto animate-pulse" />
          <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={40} />
          <h2 className="text-xl font-bold text-blue-900 border-b-2 border-slate-200 pr-3 mx-2">جاري تحميل بيانات اللاعب...</h2>
        </div>
      </div>
    );
  }

  if (error || !mockState || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden" dir="rtl">
         <div className="text-center bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200">
           <ClubLogo size={60} className="mb-6 mx-auto" opacity={0.5} />
           <p className="text-red-600 font-bold mb-4">{error || 'لم يتم العثور على بيانات اللاعب'}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['IBM_Plex_Sans_Arabic']" dir="rtl">
       <div className="max-w-6xl mx-auto py-8">
           <PlayerReport 
              state={mockState}
              setState={() => {}}
              player={player}
              onBack={() => { window.location.href = '/' }}
           />
       </div>
    </div>
  );
};

export default PublicPlayerView;
