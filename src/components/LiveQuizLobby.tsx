// src/components/LiveQuizLobby.tsx

import { useState, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Quiz } from '@/types/quiz';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LiveQuizLobbyProps {
  quiz: Quiz;
  session: { id: string; join_code: string; scheduled_start?: Date; scheduled_end?: Date };
  user: User;
  onQuizStart: (quiz: Quiz) => void;
  onLeave: () => void;
}

interface Participant {
  user_id: string;
  display_name: string;
}

interface WaitlistParticipant {
  student_id: string;
  display_name: string;
  joined_at: string;
}

const LiveQuizLobby = ({ quiz, session, user, onQuizStart, onLeave }: LiveQuizLobbyProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitlistParticipants, setWaitlistParticipants] = useState<WaitlistParticipant[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<number>(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Calculate time until start
  useEffect(() => {
    if (!session.scheduled_start) return;

    const updateCountdown = () => {
      const now = new Date();
      const startTime = new Date(session.scheduled_start!);
      const timeDiff = startTime.getTime() - now.getTime();
      
      if (timeDiff <= 0 && !hasAutoStarted) {
        // Auto-start the quiz!
        setHasAutoStarted(true);
        toast.success("Quiz is starting now!");
        onQuizStart(quiz);
        return;
      }
      
      setTimeUntilStart(Math.max(0, timeDiff));
    };

    updateCountdown(); // Initial calculation
    const interval = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [session.scheduled_start, hasAutoStarted, quiz, onQuizStart]);

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  useEffect(() => {
    const realtimeChannel = supabase.channel(`live-quiz-session-${session.id}`);

    realtimeChannel.on('presence', { event: 'sync' }, () => {
      const presenceState = realtimeChannel.presenceState();
      const currentParticipants = Object.values(presenceState)
        .map((p: any) => p[0])
        .filter(p => p.user_id && p.display_name) as Participant[];
      setParticipants(currentParticipants);
    });

    realtimeChannel.on('broadcast', { event: 'quiz_started' }, (payload) => {
      toast.success("The host has started the quiz! Good luck!");
      onQuizStart(quiz);
    });

    realtimeChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
          
        await realtimeChannel.track({
          user_id: user.id,
          display_name: profile?.full_name || user.email || 'A Student',
        });
      }
    });

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        realtimeChannel.untrack();
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [session.id, user.id, quiz, onQuizStart]);

  // Fetch waitlist participants from database
  const fetchWaitlistParticipants = async () => {
    try {
      console.log('Fetching waitlist participants for session:', session.id);
      
      const { data: waitlistData, error } = await supabase
        .from('quiz_waitlist')
        .select('student_id, joined_at')
        .eq('session_id', session.id)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching waitlist participants:', error);
        return;
      }

      console.log('Waitlist data:', waitlistData);

      if (!waitlistData || waitlistData.length === 0) {
        setWaitlistParticipants([]);
        return;
      }

      // Fetch profile information for each student
      const studentIds = waitlistData.map(item => item.student_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Still show waitlist even if profiles fail
        const formattedParticipants: WaitlistParticipant[] = waitlistData.map(item => ({
          student_id: item.student_id,
          display_name: 'Student',
          joined_at: item.joined_at || new Date().toISOString()
        }));
        setWaitlistParticipants(formattedParticipants);
        return;
      }

      console.log('Profiles data:', profilesData);

      // Combine waitlist and profile data
      const formattedParticipants: WaitlistParticipant[] = waitlistData.map(item => {
        const profile = profilesData?.find(p => p.id === item.student_id);
        return {
          student_id: item.student_id,
          display_name: profile?.full_name || 'Student',
          joined_at: item.joined_at || new Date().toISOString()
        };
      });

      console.log('Formatted waitlist participants:', formattedParticipants);
      setWaitlistParticipants(formattedParticipants);
    } catch (error) {
      console.error('Error fetching waitlist participants:', error);
    }
  };

  // Ensure current user is in waitlist when component mounts
  useEffect(() => {
    const ensureUserInWaitlist = async () => {
      try {
        // Check if current user is already in waitlist
        const { data: existingEntry } = await supabase
          .from('quiz_waitlist')
          .select('id')
          .eq('session_id', session.id)
          .eq('student_id', user.id)
          .single();

        if (!existingEntry) {
          // Add current user to waitlist if not already there
          const { error } = await supabase
            .from('quiz_waitlist')
            .insert({
              session_id: session.id,
              student_id: user.id
            });

          if (error && !error.message.includes('duplicate key')) {
            console.error('Error adding user to waitlist:', error);
          }
        }
        
        // Fetch waitlist after ensuring user is added
        fetchWaitlistParticipants();
      } catch (error) {
        console.error('Error ensuring user in waitlist:', error);
        // Still fetch waitlist even if adding user fails
        fetchWaitlistParticipants();
      }
    };

    ensureUserInWaitlist();
  }, [session.id, user.id]);

  // Fetch waitlist participants on component mount and periodically
  useEffect(() => {
    fetchWaitlistParticipants();
    
    // Refresh waitlist every 10 seconds to keep it updated
    const interval = setInterval(fetchWaitlistParticipants, 10000);
    
    return () => clearInterval(interval);
  }, [session.id]);

  return (
    <div className="min-h-screen p-6 flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-2xl shadow-2xl animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">{quiz.title}</CardTitle>
          <CardDescription className="text-lg text-gray-500">
            Join Code: <span className="font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">{session.join_code}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 border-y">
            {session.scheduled_start && timeUntilStart > 0 ? (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Quiz starts in:</h3>
                <div className="text-4xl font-bold text-blue-600 mb-4 font-mono">
                  {formatTimeRemaining(timeUntilStart)}
                </div>
                <div className="flex justify-center items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <span>Scheduled start: {new Date(session.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </>
            ) : session.scheduled_start && timeUntilStart <= 0 ? (
              <>
                <h3 className="text-xl font-semibold text-green-700 mb-4">Quiz is starting now!</h3>
                <div className="flex justify-center items-center gap-2 text-green-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading quiz...</span>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Waiting for the host to start the quiz...</h3>
                <div className="flex justify-center items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <span>The quiz will begin for everyone at the same time.</span>
                </div>
              </>
            )}
          </div>

          <div className="py-6 min-h-[150px]">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <Users className="h-6 w-6 text-blue-600" />
              Participants ({participants.length + waitlistParticipants.length})
            </h4>
            
            {/* Show live participants first (those who joined the lobby) */}
            {participants.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live in Lobby ({participants.length})
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {participants.map((p) => (
                    <div key={p.user_id} className="flex flex-col items-center gap-2">
                      <Avatar className="border-2 border-green-400">
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${p.display_name}`} />
                        <AvatarFallback>{p.display_name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-center truncate w-full">{p.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show waitlist participants */}
            {waitlistParticipants.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  In Waitlist ({waitlistParticipants.length})
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {waitlistParticipants.map((p) => (
                    <div key={p.student_id} className="flex flex-col items-center gap-2">
                      <Avatar className="border-2 border-blue-400">
                        <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${p.display_name}`} />
                        <AvatarFallback>{p.display_name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-center truncate w-full">{p.display_name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(p.joined_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {participants.length === 0 && waitlistParticipants.length === 0 && (
                <div className="text-center py-4 text-gray-500 flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span>Loading participants... You might be the first one here!</span>
                </div>
            )}

            {participants.length === 0 && waitlistParticipants.length > 0 && (
                <div className="text-center py-2 text-gray-500 text-sm">
                    <span>No one is currently in the live lobby, but {waitlistParticipants.length} {waitlistParticipants.length === 1 ? 'person is' : 'people are'} waiting for the quiz to start.</span>
                </div>
            )}
          </div>
          
          <Button variant="outline" className="w-full mt-4" onClick={onLeave}>
            Leave Lobby
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveQuizLobby;
