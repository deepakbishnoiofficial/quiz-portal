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
  session: { id: string; join_code: string };
  user: User;
  onQuizStart: (quiz: Quiz) => void;
  onLeave: () => void;
}

interface Participant {
  user_id: string;
  display_name: string;
}

const LiveQuizLobby = ({ quiz, session, user, onQuizStart, onLeave }: LiveQuizLobbyProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

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
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Waiting for the host to start the quiz...</h3>
            <div className="flex justify-center items-center gap-2 text-gray-600">
              <Clock className="h-5 w-5 animate-pulse" />
              <span>The quiz will begin for everyone at the same time.</span>
            </div>
          </div>

          <div className="py-6 min-h-[150px]">
            <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
              <Users className="h-6 w-6 text-blue-600" />
              Participants ({participants.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {participants.map((p) => (
                <div key={p.user_id} className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${p.display_name}`} />
                    <AvatarFallback>{p.display_name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-center truncate w-full">{p.display_name}</span>
                </div>
              ))}
            </div>
            {participants.length === 0 && (
                <div className="text-center py-4 text-gray-500 flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <span>You're the first one here! Waiting for others...</span>
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
