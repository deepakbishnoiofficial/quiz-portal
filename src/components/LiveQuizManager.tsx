import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Play, Trash2, Copy, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { LiveQuizSession } from '@/types/quiz';

interface LiveQuizManagerProps {
  sessions: LiveQuizSession[];
  onSessionUpdate: (session: LiveQuizSession) => void;
  onSessionDelete: (sessionId: string) => void;
  onStartSession: (session: LiveQuizSession) => void;
}

const LiveQuizManager = ({ 
  sessions, 
  onSessionUpdate, 
  onSessionDelete, 
  onStartSession 
}: LiveQuizManagerProps) => {
  const { user } = useAuth();

  const getStatusBadge = (session: LiveQuizSession) => {
    const now = new Date();
    const startTime = session.scheduled_start;
    const endTime = session.scheduled_end;

    if (session.status === 'completed') {
      return <Badge variant="secondary">Completed</Badge>;
    }
    
    if (session.status === 'in_progress') {
      return <Badge variant="default">Live Now</Badge>;
    }

    if (startTime && endTime) {
      if (now < startTime) {
        return <Badge variant="outline">Scheduled</Badge>;
      } else if (now >= startTime && now <= endTime) {
        return <Badge variant="destructive">Ready to Start</Badge>;
      } else {
        return <Badge variant="secondary">Expired</Badge>;
      }
    }

    return <Badge variant="outline">Waiting</Badge>;
  };

  const canStartSession = (session: LiveQuizSession) => {
    if (session.status !== 'waiting') return false;
    
    const now = new Date();
    if (session.scheduled_start) {
      return now >= session.scheduled_start;
    }
    
    return true;
  };

  const handleStartSession = async (session: LiveQuizSession) => {
    try {
      const { error } = await supabase
        .from('live_quiz_sessions')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) {
        console.error('Error starting session:', error);
        toast.error('Failed to start quiz session');
        return;
      }

      toast.success('Quiz session started!');
      onStartSession(session);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start quiz session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('live_quiz_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete quiz session');
        return;
      }

      toast.success('Quiz session deleted');
      onSessionDelete(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete quiz session');
    }
  };

  const copyJoinCode = (joinCode: string | null, isPrivate: boolean = false) => {
    if (!joinCode) {
      console.error('Cannot copy null join code');
      toast.error('No code available to copy');
      return;
    }
    navigator.clipboard.writeText(joinCode);
    toast.success(`${isPrivate ? 'Private join' : 'Join'} code copied to clipboard: ${joinCode}`);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    // Sort by status priority: in_progress > waiting (ready to start) > waiting (scheduled) > completed
    const getStatusPriority = (session: LiveQuizSession) => {
      if (session.status === 'in_progress') return 1;
      if (session.status === 'waiting' && canStartSession(session)) return 2;
      if (session.status === 'waiting') return 3;
      return 4;
    };

    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Secondary sort by scheduled start time
    if (a.scheduled_start && b.scheduled_start) {
      return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Live Quiz Sessions</h3>
          <p className="text-muted-foreground text-center">
            Create your first live quiz session to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedSessions.map((session) => (
        <Card key={session.id} className="relative">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {session.quiz?.title || 'Quiz Session'}
                  </CardTitle>
                  {getStatusBadge(session)}
                  {session.is_private && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {session.quiz?.description || 'Live quiz session'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {session.is_private && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Private Quiz
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {session.quiz?.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {session.scheduled_start && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Start</div>
                    <div className="text-muted-foreground">
                      {format(session.scheduled_start, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-muted-foreground">
                      {format(session.scheduled_start, 'HH:mm')}
                    </div>
                  </div>
                </div>
              )}
              
              {session.scheduled_end && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">End</div>
                    <div className="text-muted-foreground">
                      {format(session.scheduled_end, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-muted-foreground">
                      {format(session.scheduled_end, 'HH:mm')}
                    </div>
                  </div>
                </div>
              )}
              
              {session.quiz && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Quiz Details</div>
                    <div className="text-muted-foreground">
                      {session.quiz.questions.length} questions
                    </div>
                    <div className="text-muted-foreground">
                      {session.quiz.timeLimit} minutes
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Join Code Section */}
            <div className="bg-gray-50 rounded-lg p-3 my-4">
              {session.is_private ? (
                <div className="text-center">
                  <div className="text-sm font-medium text-purple-700 mb-2">🔒 Private Quiz Code</div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (session.private_join_code) {
                        copyJoinCode(session.private_join_code, true);
                      } else {
                        toast.error('No private join code available');
                      }
                    }}
                    className="w-full bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 font-mono text-lg py-2"
                    disabled={!session.private_join_code}
                  >
                    <Lock className="h-5 w-5 mr-2" />
                    {session.private_join_code || 'No Code Generated'}
                    {session.private_join_code && <Copy className="h-4 w-4 ml-2" />}
                  </Button>
                  <p className="text-xs text-purple-600 mt-1">Share this code with students to join the private quiz</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 mb-2">👥 Public Quiz Code</div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (session.join_code) {
                        copyJoinCode(session.join_code, false);
                      } else {
                        toast.error('No join code available');
                      }
                    }}
                    className="w-full font-mono text-lg py-2"
                    disabled={!session.join_code}
                  >
                    <Users className="h-5 w-5 mr-2" />
                    {session.join_code || 'No Code Generated'}
                    {session.join_code && <Copy className="h-4 w-4 ml-2" />}
                  </Button>
                  <p className="text-xs text-gray-600 mt-1">Students can join with this code</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground flex items-center gap-4">
                <span>Created {format(session.created_at, 'MMM dd, yyyy HH:mm')}</span>
                {session.is_private && (
                  <div className="flex items-center gap-1 text-purple-600">
                    <Lock className="h-3 w-3" />
                    <span className="text-xs">Private Quiz</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {canStartSession(session) && (
                  <Button
                    size="sm"
                    onClick={() => handleStartSession(session)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start Quiz
                  </Button>
                )}
                
                {session.status === 'waiting' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LiveQuizManager;
