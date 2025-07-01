import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, Users, Play, Lock, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Quiz, LiveQuizSession } from '@/types/quiz';
import { Switch } from '@/components/ui/switch';

interface LiveQuizCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: LiveQuizSession) => void;
}

const LiveQuizCreator = ({ isOpen, onClose, onSessionCreated }: LiveQuizCreatorProps) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [scheduledStart, setScheduledStart] = useState<Date>();
  const [scheduledEnd, setScheduledEnd] = useState<Date>();
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuizzes();
    }
  }, [isOpen]);

  const fetchQuizzes = async () => {
    try {
      console.log('Fetching quizzes for live session creation...');
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`*, questions(*)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
        toast.error('Failed to load quizzes');
        return;
      }

      console.log('Fetched quizzes data:', quizzesData);

      const formattedQuizzes: Quiz[] = quizzesData?.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        category: quiz.category,
        difficulty: quiz.difficulty as 'Easy' | 'Medium' | 'Hard',
        timeLimit: quiz.time_limit,
        questions: quiz.questions?.map(q => ({
          id: q.id,
          type: q.question_type as 'multiple-choice' | 'true-false' | 'short-answer',
          question: q.question,
          options: q.options as string[] | undefined,
          correctAnswer: q.correct_answer,
          points: q.points
        })) || [],
        createdAt: new Date(quiz.created_at)
      })) || [];

      console.log('Formatted quizzes:', formattedQuizzes);
      setQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generatePrivateJoinCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const createLiveQuizSession = async () => {
    if (!selectedQuizId || !scheduledStart || !scheduledEnd || !startTime || !endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to create live quiz sessions');
      return;
    }

    // Combine date and time
    const [startHour, startMinute] = startTime.split(':');
    const [endHour, endMinute] = endTime.split(':');
    
    const finalStartTime = new Date(scheduledStart);
    finalStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const finalEndTime = new Date(scheduledEnd);
    finalEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    if (finalStartTime >= finalEndTime) {
      toast.error('End time must be after start time');
      return;
    }

    if (finalStartTime <= new Date()) {
      toast.error('Start time must be in the future');
      return;
    }

    setLoading(true);

    try {
      let joinCode = null;
      let privateJoinCode = null;
      
      if (isPrivate) {
        // For private quizzes, only generate private join code
        privateJoinCode = generatePrivateJoinCode();
      } else {
        // For public quizzes, only generate regular join code
        joinCode = generateJoinCode();
      }
      
      console.log('Creating live quiz session with data:', {
        quiz_id: selectedQuizId,
        host_id: user?.id,
        join_code: joinCode,
        status: 'waiting',
        scheduled_start: finalStartTime.toISOString(),
        scheduled_end: finalEndTime.toISOString(),
        is_private: isPrivate,
        private_join_code: privateJoinCode
      });
      
      const { data: sessionData, error } = await supabase
        .from('live_quiz_sessions')
        .insert({
          quiz_id: selectedQuizId,
          host_id: user?.id,
          join_code: joinCode, // null for private quizzes
          status: 'waiting',
          scheduled_start: finalStartTime.toISOString(),
          scheduled_end: finalEndTime.toISOString(),
          is_private: isPrivate,
          private_join_code: privateJoinCode // null for public quizzes
        })
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            category,
            difficulty,
            time_limit,
            created_at,
            questions (
              id,
              question_type,
              question,
              options,
              correct_answer,
              points
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error creating live quiz session:', error);
        toast.error('Failed to create live quiz session');
        return;
      }

      const newSession: LiveQuizSession = {
        id: sessionData.id,
        quiz_id: sessionData.quiz_id,
        host_id: sessionData.host_id,
        join_code: sessionData.join_code,
        status: sessionData.status as 'waiting' | 'in_progress' | 'completed',
        scheduled_start: new Date(sessionData.scheduled_start),
        scheduled_end: new Date(sessionData.scheduled_end),
        started_at: sessionData.started_at ? new Date(sessionData.started_at) : undefined,
        ended_at: sessionData.ended_at ? new Date(sessionData.ended_at) : undefined,
        created_at: new Date(sessionData.created_at),
        is_private: sessionData.is_private,
        private_join_code: sessionData.private_join_code,
        quiz: sessionData.quizzes ? {
          id: sessionData.quizzes.id,
          title: sessionData.quizzes.title,
          description: sessionData.quizzes.description || '',
          category: sessionData.quizzes.category,
          difficulty: sessionData.quizzes.difficulty as 'Easy' | 'Medium' | 'Hard',
          timeLimit: sessionData.quizzes.time_limit,
          questions: sessionData.quizzes.questions?.map(q => ({
            id: q.id,
            type: q.question_type as 'multiple-choice' | 'true-false' | 'short-answer',
            question: q.question,
            options: q.options as string[] | undefined,
            correctAnswer: q.correct_answer,
            points: q.points
          })) || [],
          createdAt: new Date(sessionData.quizzes.created_at)
        } : undefined
      };

      if (isPrivate) {
        toast.success(`Private live quiz session created! Share this code with students: ${privateJoinCode}`);
      } else {
        toast.success(`Live quiz session created! Students can join with code: ${joinCode}`);
      }
      
      onSessionCreated(newSession);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating live quiz session:', error);
      toast.error('Failed to create live quiz session');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedQuizId('');
    setScheduledStart(undefined);
    setScheduledEnd(undefined);
    setStartTime('');
    setEndTime('');
    setIsPrivate(false);
  };

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Schedule Live Quiz Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quiz Selection */}
          <div className="space-y-2">
            <Label htmlFor="quiz-select">Select Quiz</Label>
            {quizzes.length === 0 ? (
              <div className="p-4 text-center border rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">No quizzes available. Please create a quiz first.</p>
              </div>
            ) : (
              <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a quiz to make live..." />
                </SelectTrigger>
                <SelectContent>
                  {quizzes.map((quiz) => (
                    <SelectItem key={quiz.id} value={quiz.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{quiz.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {quiz.category} • {quiz.questions.length} questions • {quiz.timeLimit} min
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Quiz Preview */}
          {selectedQuiz && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedQuiz.title}</CardTitle>
                <CardDescription>{selectedQuiz.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedQuiz.questions.length} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedQuiz.timeLimit} Minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Quiz Privacy</Label>
                <div className="text-sm text-muted-foreground">
                  {isPrivate ? 'Only students with the join code can access this quiz' : 'All students can see and join this quiz'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="privacy-mode"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="privacy-mode" className="flex items-center gap-2">
                  {isPrivate ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Private
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Public
                    </>
                  )}
                </Label>
              </div>
            </div>
            
            {isPrivate && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Private Quiz Mode</p>
                      <p className="text-amber-700">
                        A unique join code will be generated that you can share with specific students. 
                        Only students who enter this code will be able to see and join the quiz.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Schedule Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date & Time */}
            <div className="space-y-4">
              <Label>Start Date & Time</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledStart ? format(scheduledStart, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledStart}
                      onSelect={setScheduledStart}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="Start time"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="space-y-4">
              <Label>End Date & Time</Label>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledEnd ? format(scheduledEnd, "PPP") : "Pick end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledEnd}
                      onSelect={setScheduledEnd}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="End time"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={createLiveQuizSession} 
              disabled={loading || quizzes.length === 0 || !selectedQuizId}
            >
              {loading ? 'Creating...' : 'Schedule Live Quiz'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveQuizCreator;
