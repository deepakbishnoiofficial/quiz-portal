// Add these to your existing imports
import { Tv, Users, LogIn } from 'lucide-react'; 
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Trophy, Play, Calendar, User, Eye, GraduationCap, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QuizTaking from '@/components/QuizTaking';
import ResultsView from '@/components/ResultsView';
import LiveQuizLobby from '@/components/LiveQuizLobby';
import type { Quiz, QuizResult, LiveQuizSession } from '@/types/quiz';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from '@/types/supabase';
import { Checkbox } from '@/components/ui/checkbox';

const AVAILABLE_COURSES = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography'
];

type Profile = Database['public']['Tables']['profiles']['Row'];

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'taking' | 'results' | 'live-lobby'>('dashboard');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveQuizSession[]>([]);
  const [currentLiveSession, setCurrentLiveSession] = useState<LiveQuizSession | null>(null);
  const [selectedLiveCategory, setSelectedLiveCategory] = useState<string>('all');
  const [showAllLiveQuizzes, setShowAllLiveQuizzes] = useState(false);
  const [joinedWaitlists, setJoinedWaitlists] = useState<Set<string>>(new Set()); // Track which sessions user has joined
  const [showPrivateJoinDialog, setShowPrivateJoinDialog] = useState(false);
  const [privateJoinCode, setPrivateJoinCode] = useState('');
  const [joinedPrivateQuizzes, setJoinedPrivateQuizzes] = useState<Set<string>>(new Set()); // Track private quizzes user has joined
  
  
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    dateOfJoining: new Date(),
    enrolledCourses: [] as string[],
  });

  const [editProfile, setEditProfile] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    enrolledCourses: [] as string[],
  });

  useEffect(() => {
    if (user) {
        fetchQuizzes();
        fetchResults();
        fetchProfile();
        fetchLiveSessions();
        fetchUserWaitlists();
        fetchJoinedPrivateQuizzes();
    }
  }, [user]);

  // Auto-refresh live sessions every 30 seconds to keep timers updated
  useEffect(() => {
    if (user && liveSessions.length > 0) {
      const interval = setInterval(() => {
        fetchLiveSessions();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user, liveSessions.length]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile({
          displayName: data.full_name || user.email || 'Student',
          email: user.email || 'No email provided',
          dateOfJoining: new Date(data.created_at),
          enrolledCourses: data.enrolled_courses ?? ['General Knowledge'],
        });
        setEditProfile({
          fullName: data.full_name || '',
          dateOfBirth: data.date_of_birth ?? '',
          gender: data.gender ?? 'Prefer not to say',
          enrolledCourses: data.enrolled_courses ?? [],
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editProfile.fullName,
          date_of_birth: editProfile.dateOfBirth,
          gender: editProfile.gender,
          enrolled_courses: editProfile.enrolledCourses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.error(`Database Error: ${error.message}`);
        throw error;
      }

      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCourseChange = (course: string) => {
    setEditProfile(prev => {
        const newCourses = prev.enrolledCourses.includes(course)
            ? prev.enrolledCourses.filter(c => c !== course)
            : [...prev.enrolledCourses, course];
        return { ...prev, enrolledCourses: newCourses };
    });
  };

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`*, questions(*)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
        toast.error('Failed to load quizzes');
        return;
      }

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

      setQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!user) return;

    try {
      const { data: resultsData, error } = await supabase
        .from('quiz_results')
        // FIX: Ensure you are selecting the time_taken column
        .select(`*, time_taken, profiles:student_id (full_name)`)
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      const formattedResults: QuizResult[] = resultsData?.map(result => ({
        id: result.id,
        quizId: result.quiz_id,
        studentName: result.profiles?.full_name || user.email || 'Student',
        score: result.score,
        totalPoints: result.total_points,
        completedAt: new Date(result.completed_at),
        answers: result.answers as Record<string, string>,
        // FIX: Add the timeTaken property, with a fallback for old results
        timeTaken: result.time_taken ?? 0
      })) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      console.log('Student: Fetching live sessions...');
      
      const { data: sessionsData, error } = await supabase
        .from('live_quiz_sessions')
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
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching live sessions:', error);
        return;
      }

      console.log('Student: Raw live sessions data:', sessionsData);

      const now = new Date();
      const availableSessions: LiveQuizSession[] = sessionsData?.filter(session => {
        // Show ALL sessions that are not completed and not ended
        if (session.status === 'in_progress') return true;
        if (session.status === 'waiting') {
          // If there's a scheduled end time, make sure we haven't passed it
          if (session.scheduled_end) {
            const endTime = new Date(session.scheduled_end);
            return now <= endTime; // Show if we haven't passed the end time
          }
          return true; // Show all waiting sessions without end time
        }
        return false;
      }).map(session => ({
        id: session.id,
        quiz_id: session.quiz_id,
        host_id: session.host_id,
        join_code: session.join_code,
        status: session.status as 'waiting' | 'in_progress' | 'completed',
        scheduled_start: session.scheduled_start ? new Date(session.scheduled_start) : undefined,
        scheduled_end: session.scheduled_end ? new Date(session.scheduled_end) : undefined,
        started_at: session.started_at ? new Date(session.started_at) : undefined,
        ended_at: session.ended_at ? new Date(session.ended_at) : undefined,
        created_at: new Date(session.created_at),
        quiz: session.quizzes ? {
          id: session.quizzes.id,
          title: session.quizzes.title,
          description: session.quizzes.description || '',
          category: session.quizzes.category,
          difficulty: session.quizzes.difficulty as 'Easy' | 'Medium' | 'Hard',
          timeLimit: session.quizzes.time_limit,
          questions: session.quizzes.questions?.map(q => ({
            id: q.id,
            type: q.question_type as 'multiple-choice' | 'true-false' | 'short-answer',
            question: q.question,
            options: q.options as string[] | undefined,
            correctAnswer: q.correct_answer,
            points: q.points
          })) || [],
          createdAt: new Date(session.quizzes.created_at)
        } : undefined
      })) || [];

      console.log('Student: Filtered available sessions:', availableSessions);
      console.log('Student: Sessions count:', availableSessions.length);
      setLiveSessions(availableSessions);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  const fetchUserWaitlists = async () => {
    if (!user) return;

    try {
      const { data: waitlistData, error } = await supabase
        .from('quiz_waitlist')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching user waitlists:', error);
        return;
      }

      const sessionIds = waitlistData?.map(item => item.session_id) || [];
      setJoinedWaitlists(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching user waitlists:', error);
    }
  };

  const fetchJoinedPrivateQuizzes = async () => {
    if (!user) return;

    try {
      const { data: privateData, error } = await supabase
        .from('private_quiz_participants')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching joined private quizzes:', error);
        return;
      }

      const sessionIds = privateData?.map(item => item.session_id) || [];
      setJoinedPrivateQuizzes(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching joined private quizzes:', error);
    }
  };

  const joinPrivateQuiz = async () => {
    if (!user || !privateJoinCode.trim()) {
      toast.error('Please enter a valid join code');
      return;
    }

    try {
      // First, find the session with this private join code
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('private_join_code', privateJoinCode.trim().toUpperCase())
        .eq('is_private', true)
        .single();

      if (sessionError || !sessionData) {
        toast.error('Invalid join code or quiz not found');
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('private_quiz_participants')
        .select('id')
        .eq('session_id', sessionData.id)
        .eq('student_id', user.id)
        .single();

      if (existingParticipant) {
        toast.info('You are already part of this private quiz');
        setShowPrivateJoinDialog(false);
        setPrivateJoinCode('');
        fetchLiveSessions(); // Refresh to show the quiz
        return;
      }

      // Add user to private quiz participants
      const { error: insertError } = await supabase
        .from('private_quiz_participants')
        .insert({
          session_id: sessionData.id,
          student_id: user.id
        });

      if (insertError) {
        console.error('Error joining private quiz:', insertError);
        toast.error('Failed to join private quiz');
        return;
      }

      setJoinedPrivateQuizzes(prev => new Set([...prev, sessionData.id]));
      toast.success(`Successfully joined private quiz: ${sessionData.quiz?.title || 'Quiz'}`);
      setShowPrivateJoinDialog(false);
      setPrivateJoinCode('');
      
      // Refresh live sessions to show the newly joined private quiz
      fetchLiveSessions();
    } catch (error) {
      console.error('Error joining private quiz:', error);
      toast.error('Failed to join private quiz');
    }
  };

  const handleCourseChange = (course: string) => {
    setEditProfile(prev => {
        const newCourses = prev.enrolledCourses.includes(course)
            ? prev.enrolledCourses.filter(c => c !== course)
            : [...prev.enrolledCourses, course];
        return { ...prev, enrolledCourses: newCourses };
    });
  };

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`*, questions(*)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
        toast.error('Failed to load quizzes');
        return;
      }

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

      setQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!user) return;

    try {
      const { data: resultsData, error } = await supabase
        .from('quiz_results')
        // FIX: Ensure you are selecting the time_taken column
        .select(`*, time_taken, profiles:student_id (full_name)`)
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      const formattedResults: QuizResult[] = resultsData?.map(result => ({
        id: result.id,
        quizId: result.quiz_id,
        studentName: result.profiles?.full_name || user.email || 'Student',
        score: result.score,
        totalPoints: result.total_points,
        completedAt: new Date(result.completed_at),
        answers: result.answers as Record<string, string>,
        // FIX: Add the timeTaken property, with a fallback for old results
        timeTaken: result.time_taken ?? 0
      })) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      console.log('Student: Fetching live sessions...');
      
      const { data: sessionsData, error } = await supabase
        .from('live_quiz_sessions')
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
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching live sessions:', error);
        return;
      }

      console.log('Student: Raw live sessions data:', sessionsData);

      const now = new Date();
      const availableSessions: LiveQuizSession[] = sessionsData?.filter(session => {
        // Show ALL sessions that are not completed and not ended
        if (session.status === 'in_progress') return true;
        if (session.status === 'waiting') {
          // If there's a scheduled end time, make sure we haven't passed it
          if (session.scheduled_end) {
            const endTime = new Date(session.scheduled_end);
            return now <= endTime; // Show if we haven't passed the end time
          }
          return true; // Show all waiting sessions without end time
        }
        return false;
      }).map(session => ({
        id: session.id,
        quiz_id: session.quiz_id,
        host_id: session.host_id,
        join_code: session.join_code,
        status: session.status as 'waiting' | 'in_progress' | 'completed',
        scheduled_start: session.scheduled_start ? new Date(session.scheduled_start) : undefined,
        scheduled_end: session.scheduled_end ? new Date(session.scheduled_end) : undefined,
        started_at: session.started_at ? new Date(session.started_at) : undefined,
        ended_at: session.ended_at ? new Date(session.ended_at) : undefined,
        created_at: new Date(session.created_at),
        quiz: session.quizzes ? {
          id: session.quizzes.id,
          title: session.quizzes.title,
          description: session.quizzes.description || '',
          category: session.quizzes.category,
          difficulty: session.quizzes.difficulty as 'Easy' | 'Medium' | 'Hard',
          timeLimit: session.quizzes.time_limit,
          questions: session.quizzes.questions?.map(q => ({
            id: q.id,
            type: q.question_type as 'multiple-choice' | 'true-false' | 'short-answer',
            question: q.question,
            options: q.options as string[] | undefined,
            correctAnswer: q.correct_answer,
            points: q.points
          })) || [],
          createdAt: new Date(session.quizzes.created_at)
        } : undefined
      })) || [];

      console.log('Student: Filtered available sessions:', availableSessions);
      console.log('Student: Sessions count:', availableSessions.length);
      setLiveSessions(availableSessions);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  const fetchUserWaitlists = async () => {
    if (!user) return;

    try {
      const { data: waitlistData, error } = await supabase
        .from('quiz_waitlist')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching user waitlists:', error);
        return;
      }

      const sessionIds = waitlistData?.map(item => item.session_id) || [];
      setJoinedWaitlists(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching user waitlists:', error);
    }
  };

  const fetchJoinedPrivateQuizzes = async () => {
    if (!user) return;

    try {
      const { data: privateData, error } = await supabase
        .from('private_quiz_participants')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching joined private quizzes:', error);
        return;
      }

      const sessionIds = privateData?.map(item => item.session_id) || [];
      setJoinedPrivateQuizzes(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching joined private quizzes:', error);
    }
  };

  const joinPrivateQuiz = async () => {
    if (!user || !privateJoinCode.trim()) {
      toast.error('Please enter a valid join code');
      return;
    }

    try {
      // First, find the session with this private join code
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('private_join_code', privateJoinCode.trim().toUpperCase())
        .eq('is_private', true)
        .single();

      if (sessionError || !sessionData) {
        toast.error('Invalid join code or quiz not found');
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('private_quiz_participants')
        .select('id')
        .eq('session_id', sessionData.id)
        .eq('student_id', user.id)
        .single();

      if (existingParticipant) {
        toast.info('You are already part of this private quiz');
        setShowPrivateJoinDialog(false);
        setPrivateJoinCode('');
        fetchLiveSessions(); // Refresh to show the quiz
        return;
      }

      // Add user to private quiz participants
      const { error: insertError } = await supabase
        .from('private_quiz_participants')
        .insert({
          session_id: sessionData.id,
          student_id: user.id
        });

      if (insertError) {
        console.error('Error joining private quiz:', insertError);
        toast.error('Failed to join private quiz');
        return;
      }

      setJoinedPrivateQuizzes(prev => new Set([...prev, sessionData.id]));
      toast.success(`Successfully joined private quiz: ${sessionData.quiz?.title || 'Quiz'}`);
      setShowPrivateJoinDialog(false);
      setPrivateJoinCode('');
      
      // Refresh live sessions to show the newly joined private quiz
      fetchLiveSessions();
    } catch (error) {
      console.error('Error joining private quiz:', error);
      toast.error('Failed to join private quiz');
    }
  };

  const handleCourseChange = (course: string) => {
    setEditProfile(prev => {
        const newCourses = prev.enrolledCourses.includes(course)
            ? prev.enrolledCourses.filter(c => c !== course)
            : [...prev.enrolledCourses, course];
        return { ...prev, enrolledCourses: newCourses };
    });
  };

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`*, questions(*)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quizzes:', error);
        toast.error('Failed to load quizzes');
        return;
      }

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

      setQuizzes(formattedQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!user) return;

    try {
      const { data: resultsData, error } = await supabase
        .from('quiz_results')
        // FIX: Ensure you are selecting the time_taken column
        .select(`*, time_taken, profiles:student_id (full_name)`)
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      const formattedResults: QuizResult[] = resultsData?.map(result => ({
        id: result.id,
        quizId: result.quiz_id,
        studentName: result.profiles?.full_name || user.email || 'Student',
        score: result.score,
        totalPoints: result.total_points,
        completedAt: new Date(result.completed_at),
        answers: result.answers as Record<string, string>,
        // FIX: Add the timeTaken property, with a fallback for old results
        timeTaken: result.time_taken ?? 0
      })) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      console.log('Student: Fetching live sessions...');
      
      const { data: sessionsData, error } = await supabase
        .from('live_quiz_sessions')
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
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching live sessions:', error);
        return;
      }

      console.log('Student: Raw live sessions data:', sessionsData);

      const now = new Date();
      const availableSessions: LiveQuizSession[] = sessionsData?.filter(session => {
        // Show ALL sessions that are not completed and not ended
        if (session.status === 'in_progress') return true;
        if (session.status === 'waiting') {
          // If there's a scheduled end time, make sure we haven't passed it
          if (session.scheduled_end) {
            const endTime = new Date(session.scheduled_end);
            return now <= endTime; // Show if we haven't passed the end time
          }
          return true; // Show all waiting sessions without end time
        }
        return false;
      }).map(session => ({
        id: session.id,
        quiz_id: session.quiz_id,
        host_id: session.host_id,
        join_code: session.join_code,
        status: session.status as 'waiting' | 'in_progress' | 'completed',
        scheduled_start: session.scheduled_start ? new Date(session.scheduled_start) : undefined,
        scheduled_end: session.scheduled_end ? new Date(session.scheduled_end) : undefined,
        started_at: session.started_at ? new Date(session.started_at) : undefined,
        ended_at: session.ended_at ? new Date(session.ended_at) : undefined,
        created_at: new Date(session.created_at),
        quiz: session.quizzes ? {
          id: session.quizzes.id,
          title: session.quizzes.title,
          description: session.quizzes.description || '',
          category: session.quizzes.category,
          difficulty: session.quizzes.difficulty as 'Easy' | 'Medium' | 'Hard',
          timeLimit: session.quizzes.time_limit,
          questions: session.quizzes.questions?.map(q => ({
            id: q.id,
            type: q.question_type as 'multiple-choice' | 'true-false' | 'short-answer',
            question: q.question,
            options: q.options as string[] | undefined,
            correctAnswer: q.correct_answer,
            points: q.points
          })) || [],
          createdAt: new Date(session.quizzes.created_at)
        } : undefined
      })) || [];

      console.log('Student: Filtered available sessions:', availableSessions);
      console.log('Student: Sessions count:', availableSessions.length);
      setLiveSessions(availableSessions);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  const fetchUserWaitlists = async () => {
    if (!user) return;

    try {
      const { data: waitlistData, error } = await supabase
        .from('quiz_waitlist')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching user waitlists:', error);
        return;
      }

      const sessionIds = waitlistData?.map(item => item.session_id) || [];
      setJoinedWaitlists(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching user waitlists:', error);
    }
  };

  const fetchJoinedPrivateQuizzes = async () => {
    if (!user) return;

    try {
      const { data: privateData, error } = await supabase
        .from('private_quiz_participants')
        .select('session_id')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching joined private quizzes:', error);
        return;
      }

      const sessionIds = privateData?.map(item => item.session_id) || [];
      setJoinedPrivateQuizzes(new Set(sessionIds));
    } catch (error) {
      console.error('Error fetching joined private quizzes:', error);
    }
  };

  const joinPrivateQuiz = async () => {
    if (!user || !privateJoinCode.trim()) {
      toast.error('Please enter a valid join code');
      return;
    }

    try {
      // First, find the session with this private join code
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('private_join_code', privateJoinCode.trim().toUpperCase())
        .eq('is_private', true)
        .single();

      if (sessionError || !sessionData) {
        toast.error('Invalid join code or quiz not found');
        return;
      }

      // Check if already joined
      const { data: existingParticipant } = await supabase
        .from('private_quiz_participants')
        .select('id')
        .eq('session_id', sessionData.id)
        .eq('student_id', user.id)
        .single();

      if (existingParticipant) {
        toast.info('You are already part of this private quiz');
        setShowPrivateJoinDialog(false);
        setPrivateJoinCode('');
        fetchLiveSessions(); // Refresh to show the quiz
        return;
      }

      // Add user to private quiz participants
      const { error: insertError } = await supabase
        .from('private_quiz_participants')
        .insert({
          session_id: sessionData.id,
          student_id: user.id
        });

      if (insertError) {
        console.error('Error joining private quiz:', insertError);
        toast.error('Failed to join private quiz');
        return;
      }

      setJoinedPrivateQuizzes(prev => new Set([...prev, sessionData.id]));
      toast.success(`Successfully joined private quiz: ${sessionData.quiz?.title || 'Quiz'}`);
      setShowPrivateJoinDialog(false);
      setPrivateJoinCode('');
      
      // Refresh live sessions to show the newly joined private quiz
      fetchLiveSessions();
    } catch (error) {
      console.error('Error joining private quiz:', error);
      toast.error('Failed to join private quiz');
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentView('taking');
  };

  const handleViewResults = (quiz: Quiz) => {
    const result = getQuizResult(quiz.id);
    if (result) {
        setSelectedQuiz(quiz);
        setCurrentResult(result);
        setCurrentView('results');
    } else {
        toast.error("Could not find the results for this quiz.");
    }
  };

  const handleQuizComplete = async (result: QuizResult) => {
    if (!user) {
      toast.error('You must be logged in to save quiz results');
      return;
    }

    try {
      const { data: newResult, error } = await supabase
        .from('quiz_results')
        .insert({
          quiz_id: result.quizId,
          student_id: user.id,
          score: result.score,
          total_points: result.totalPoints,
          answers: result.answers,
          completed_at: result.completedAt.toISOString(),
          // FIX: Add the time_taken property to the insert payload
          time_taken: result.timeTaken
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving quiz result:', error);
        toast.error('Failed to save quiz result');
        return;
      }

      const updatedResult = {
        ...result,
        id: newResult.id,
        studentName: profile.displayName || user.email || 'Student'
      };

      setResults(prev => [...prev, updatedResult]);
      setCurrentResult(updatedResult);
      setCurrentView('results');
      toast.success('Quiz completed successfully!');
    } catch (error) {
      console.error('Error saving quiz result:', error);
      toast.error('Failed to save quiz result');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedQuiz(null);
    setCurrentResult(null);
    // Don't remove from waitlist - they should stay in waitlist when leaving lobby
    setCurrentLiveSession(null);
    fetchQuizzes();
    fetchResults();
  };
  
// --- NO CHANGES NEEDED BELOW THIS LINE ---
// The rest of your component's rendering logic is correct.

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const completedQuizIds = new Set(results.map(r => r.quizId));
  const availableQuizzes = quizzes.filter(quiz => !completedQuizIds.has(quiz.id));
  const completedQuizzes = quizzes.filter(quiz => completedQuizIds.has(quiz.id));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQuizResult = (quizId: string) => {
    return results.find(r => r.quizId === quizId);
  };

  const averageScore = results.length > 0
    ? Math.round(results.reduce((acc, r) => acc + (r.score / r.totalPoints) * 100, 0) / results.length)
    : 0;

  if (currentView === 'live-lobby' && currentLiveSession) {
    return (
      <LiveQuizLobby
        quiz={currentLiveSession.quiz!}
        session={{ 
          id: currentLiveSession.id, 
          join_code: currentLiveSession.join_code,
          scheduled_start: currentLiveSession.scheduled_start,
          scheduled_end: currentLiveSession.scheduled_end
        }}
        user={user!}
        onQuizStart={handleStartQuiz}
        onLeave={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'taking' && selectedQuiz) {
    return (
      <QuizTaking
        quiz={selectedQuiz}
        onComplete={handleQuizComplete}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'results' && currentResult && selectedQuiz) {
    return (
      <ResultsView
        result={currentResult}
        quiz={selectedQuiz}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {profile.displayName}!</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                My Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Your Profile</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fullName" className="text-right">Full Name</Label>
                  <Input id="fullName" value={editProfile.fullName} onChange={(e) => setEditProfile({ ...editProfile, fullName: e.target.value })} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dateOfBirth" className="text-right">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={editProfile.dateOfBirth} onChange={(e) => setEditProfile({ ...editProfile, dateOfBirth: e.target.value })} className="col-span-3"/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gender" className="text-right">Gender</Label>
                  <Select value={editProfile.gender} onValueChange={(value) => setEditProfile({ ...editProfile, gender: value })}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Courses</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                        {AVAILABLE_COURSES.map(course => (
                            <div key={course} className="flex items-center space-x-2">
                                <Checkbox
                                    id={course}
                                    checked={editProfile.enrolledCourses.includes(course)}
                                    onCheckedChange={() => handleCourseChange(course)}
                                />
                                <label
                                    htmlFor={course}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {course}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

              </div>
                <Button onClick={updateProfile} type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Available Quizzes</p>
                            <p className="text-2xl font-bold text-gray-800">{availableQuizzes.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Trophy className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Completed Quizzes</p>
                            <p className="text-2xl font-bold text-gray-800">{results.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Trophy className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Average Score</p>
                            <p className="text-2xl font-bold text-gray-800">{averageScore}%</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <GraduationCap className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Enrolled Courses</p>
                            <p className="text-2xl font-bold text-gray-800">{profile.enrolledCourses.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg lg:col-span-1">
                <CardHeader>
                    <CardTitle>My Information</CardTitle>
                    <CardDescription>Your registered details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">{profile.email}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-700">Joined on: {profile.dateOfJoining.toLocaleDateString()}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <GraduationCap className="h-5 w-5 text-gray-500" />
                            <h4 className="text-gray-700 font-medium">Enrolled Courses:</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-8">
                            {profile.enrolledCourses.map(course => (
                                <Badge key={course} variant="secondary">{course}</Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Live Quiz Section */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="h-5 w-5 text-red-600" />
                  Live Quizzes
                  {liveSessions.length > 0 && (
                    <Badge variant="destructive" className="ml-2 animate-pulse">
                      {liveSessions.filter(s => s.status === 'in_progress').length} Live Now
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Join live quiz sessions happening now!</CardDescription>
              </div>
              {liveSessions.length > 3 && (
                <Button
                  variant="outline"
                  onClick={() => setShowAllLiveQuizzes(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  See All ({liveSessions.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {liveSessions.length === 0 ? (
              <div className="text-center py-8">
                <Tv className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Live Quizzes Available</h3>
                <p className="text-gray-500">Check back later for live quiz sessions!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Category Tabs for Live Quizzes */}
                {(() => {
                  const liveCategories = [...new Set(liveSessions.map(s => s.quiz?.category).filter(Boolean))];
                  return liveCategories.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant={selectedLiveCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedLiveCategory('all')}
                        className="text-xs"
                      >
                        All ({liveSessions.length})
                      </Button>
                      {liveCategories.map((category) => {
                        const count = liveSessions.filter(s => s.quiz?.category === category).length;
                        return (
                          <Button
                            key={category}
                            variant={selectedLiveCategory === category ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedLiveCategory(category)}
                            className="text-xs"
                          >
                            {category} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Live Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveSessions
                    .filter(session => selectedLiveCategory === 'all' || session.quiz?.category === selectedLiveCategory)
                    .slice(0, 6) // Show max 6 in main view
                    .map((session) => {
                      const now = new Date();
                      const startTime = session.scheduled_start ? new Date(session.scheduled_start) : null;
                      const endTime = session.scheduled_end ? new Date(session.scheduled_end) : null;
                      
                      // Calculate time until start
                      const timeUntilStart = startTime ? Math.max(0, startTime.getTime() - now.getTime()) : 0;
                      const isStartingSoon = timeUntilStart > 0 && timeUntilStart <= 30 * 60 * 1000; // 30 minutes
                      const shouldBeActive = !startTime || now >= startTime;
                      const hasEnded = endTime && now > endTime;
                      
                      // Auto-start logic: if scheduled time has passed, quiz should be active
                      const isLive = session.status === 'in_progress' || shouldBeActive;
                      const isInWaitlist = joinedWaitlists.has(session.id);
                      
                      // Format time remaining
                      const formatTimeRemaining = (ms: number) => {
                        const minutes = Math.floor(ms / (1000 * 60));
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);
                        
                        if (days > 0) return `${days}d ${hours % 24}h`;
                        if (hours > 0) return `${hours}h ${minutes % 60}m`;
                        return `${minutes}m`;
                      };
                      
                      return (
                        <Card key={session.id} className="border-red-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge 
                                variant={isLive ? 'destructive' : isStartingSoon ? 'default' : 'outline'}
                                className={`${isLive ? 'animate-pulse' : ''} text-xs`}
                              >
                                {isLive ? '🔴 Live Now' : 
                                 isStartingSoon ? '🔥 Starting Soon' : 
                                 hasEnded ? '⏹️ Ended' : 
                                 startTime ? '📅 Scheduled' : '⏰ Waiting'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {session.quiz?.category}
                              </Badge>
                            </div>
                            
                            <h5 className="font-semibold text-gray-800 mb-2 line-clamp-2">{session.quiz?.title}</h5>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{session.quiz?.description}</p>
                            
                            {/* Timing Information */}
                            {startTime && (
                              <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">
                                    {session.status === 'in_progress' ? 'Started:' : 'Starts:'}
                                  </span>
                                  <span className="font-medium">
                                    {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                {!shouldBeActive && timeUntilStart > 0 && (
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-600">Time until start:</span>
                                    <span className={`font-medium ${isStartingSoon ? 'text-orange-600' : 'text-blue-600'}`}>
                                      {formatTimeRemaining(timeUntilStart)}
                                    </span>
                                  </div>
                                )}
                                {endTime && (
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-gray-600">Ends:</span>
                                    <span className="font-medium">
                                      {endTime.toLocaleDateString()} at {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {session.quiz?.questions.length}Q
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.quiz?.timeLimit}min
                                </span>
                                <Badge className={getDifficultyColor(session.quiz?.difficulty || 'Medium')} variant="outline">
                                  {session.quiz?.difficulty}
                                </Badge>
                              </div>
                            </div>

                            <Button
                              className={`w-full ${
                                isLive ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 
                                isInWaitlist ? 'bg-green-600 hover:bg-green-700' :
                                isStartingSoon ? 'bg-orange-600 hover:bg-orange-700' :
                                hasEnded ? 'bg-gray-400 cursor-not-allowed' :
                                'bg-blue-600 hover:bg-blue-700'
                              }`}
                              onClick={() => {
                                if (isLive) {
                                  joinLiveSession(session);
                                } else if (isInWaitlist) {
                                  // If already in waitlist, show option to view lobby or leave
                                  setCurrentLiveSession(session);
                                  setCurrentView('live-lobby');
                                } else {
                                  joinLiveSession(session);
                                }
                              }}
                              disabled={hasEnded}
                            >
                              {isLive ? (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Join Live Quiz
                                </>
                              ) : hasEnded ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Session Ended
                                </>
                              ) : isInWaitlist ? (
                                <>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Lobby {isStartingSoon ? `(${formatTimeRemaining(timeUntilStart)})` : ''}
                                </>
                              ) : isStartingSoon ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Join Waitlist (Starts in {formatTimeRemaining(timeUntilStart)})
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Join Waitlist
                                </>
                              )}
                            </Button>

                            {/* Add a secondary button for leaving waitlist when user is in waitlist */}
                            {isInWaitlist && !isLive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => leaveWaitlist(session.id)}
                              >
                                Leave Waitlist
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Live Quizzes Modal */}
        <Dialog open={showAllLiveQuizzes} onOpenChange={setShowAllLiveQuizzes}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tv className="h-5 w-5 text-red-600" />
                All Live Quizzes ({liveSessions.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Category Filters in Modal */}
              {(() => {
                const liveCategories = [...new Set(liveSessions.map(s => s.quiz?.category).filter(Boolean))];
                return liveCategories.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedLiveCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedLiveCategory('all')}
                    >
                      All ({liveSessions.length})
                    </Button>
                    {liveCategories.map((category) => {
                      const count = liveSessions.filter(s => s.quiz?.category === category).length;
                      return (
                        <Button
                          key={category}
                          variant={selectedLiveCategory === category ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedLiveCategory(category)}
                        >
                          {category} ({count})
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Scrollable Quiz List */}
              <div className="max-h-[50vh] overflow-y-auto space-y-3">
                {liveSessions
                  .filter(session => selectedLiveCategory === 'all' || session.quiz?.category === selectedLiveCategory)
                  .map((session) => {
                    const now = new Date();
                    const startTime = session.scheduled_start ? new Date(session.scheduled_start) : null;
                    const endTime = session.scheduled_end ? new Date(session.scheduled_end) : null;
                    
                    // Calculate time until start
                    const timeUntilStart = startTime ? Math.max(0, startTime.getTime() - now.getTime()) : 0;
                    const isStartingSoon = timeUntilStart > 0 && timeUntilStart <= 30 * 60 * 1000; // 30 minutes
                    const shouldBeActive = !startTime || now >= startTime;
                    const hasEnded = endTime && now > endTime;
                    
                    // Auto-start logic: if scheduled time has passed, quiz should be active
                    const isLive = session.status === 'in_progress' || shouldBeActive;
                    const isInWaitlist = joinedWaitlists.has(session.id);
                    
                    // Format time remaining
                    const formatTimeRemaining = (ms: number) => {
                      const minutes = Math.floor(ms / (1000 * 60));
                      const hours = Math.floor(minutes / 60);
                      const days = Math.floor(hours / 24);
                      
                      if (days > 0) return `${days}d ${hours % 24}h`;
                      if (hours > 0) return `${hours}h ${minutes % 60}m`;
                      return `${minutes}m`;
                    };
                    
                    return (
                      <Card key={session.id} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h5 className="font-semibold text-gray-800">{session.quiz?.title}</h5>
                                <Badge 
                                  variant={isLive ? 'destructive' : isStartingSoon ? 'default' : 'outline'}
                                  className={isLive ? 'animate-pulse' : ''}
                                >
                                  {isLive ? '🔴 Live Now' : 
                                   isStartingSoon ? '🔥 Starting Soon' : 
                                   hasEnded ? '⏹️ Ended' : 
                                   startTime ? '📅 Scheduled' : '⏰ Waiting'}
                                </Badge>
                                <Badge variant="secondary">{session.quiz?.category}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{session.quiz?.description}</p>
                              
                              {/* Timing Information */}
                              {startTime && (
                                <div className="bg-gray-50 rounded-lg p-2 mb-2 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-gray-600">
                                        {session.status === 'in_progress' ? 'Started:' : 'Starts:'}
                                      </span>
                                      <div className="font-medium">
                                        {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                    </div>
                                    {endTime && (
                                      <div>
                                        <span className="text-gray-600">Ends:</span>
                                        <div className="font-medium">
                                          {endTime.toLocaleDateString()} at {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {!shouldBeActive && timeUntilStart > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <span className="text-gray-600">Time until start: </span>
                                      <span className={`font-medium ${isStartingSoon ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {formatTimeRemaining(timeUntilStart)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {session.quiz?.questions.length} Questions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.quiz?.timeLimit} Minutes
                                </span>
                                <Badge className={getDifficultyColor(session.quiz?.difficulty || 'Medium')} variant="outline">
                                  {session.quiz?.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              className={
                                isLive ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 
                                isInWaitlist ? 'bg-green-600 hover:bg-green-700' :
                                isStartingSoon ? 'bg-orange-600 hover:bg-orange-700' :
                                hasEnded ? 'bg-gray-400 cursor-not-allowed' :
                                'bg-blue-600 hover:bg-blue-700'
                              }
                              onClick={() => {
                                if (isLive) {
                                  joinLiveSession(session);
                                  setShowAllLiveQuizzes(false);
                                } else if (isInWaitlist) {
                                  // If already in waitlist, show option to view lobby
                                  setCurrentLiveSession(session);
                                  setCurrentView('live-lobby');
                                  setShowAllLiveQuizzes(false);
                                } else {
                                  joinLiveSession(session);
                                  setShowAllLiveQuizzes(false);
                                }
                              }}
                              disabled={hasEnded}
                            >
                              {isLive ? (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Join Live
                                </>
                              ) : hasEnded ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Ended
                                </>
                              ) : isInWaitlist ? (
                                <>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Lobby
                                </>
                              ) : isStartingSoon ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Join Waitlist
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Join Waitlist
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* Add a secondary section for leaving waitlist when user is in waitlist */}
                          {isInWaitlist && !isLive && (
                            <div className="flex mt-3 pt-3 border-t border-gray-200">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => leaveWaitlist(session.id)}
                              >
                                Leave Waitlist
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex border-b mb-6">
            <Button
                variant="ghost"
                onClick={() => setActiveTab('available')}
                className={`rounded-none ${activeTab === 'available' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
                Available Quizzes ({availableQuizzes.length})
            </Button>
            <Button
                variant="ghost"
                onClick={() => setActiveTab('completed')}
                className={`rounded-none ${activeTab === 'completed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
                Completed Quizzes ({results.length})
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'available' ? (
            availableQuizzes.length > 0 ? (
              availableQuizzes.map((quiz) => (
                <Card key={quiz.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={getDifficultyColor(quiz.difficulty)}>
                        {quiz.difficulty}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {quiz.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="text-sm h-10 overflow-hidden">{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="h-4 w-4" />
                        <span>{quiz.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{quiz.timeLimit} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Created {quiz.createdAt.toLocaleDateString()}</span>
                      </div>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transition-all"
                        onClick={() => handleStartQuiz(quiz)}
                        disabled={quiz.questions.length === 0}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {quiz.questions.length === 0 ? 'No Questions' : 'Start Quiz'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No available quizzes</h3>
                <p className="text-gray-500">Check back later for new quizzes!</p>
              </div>
            )
          ) : (
            completedQuizzes.length > 0 ? (
              completedQuizzes.map((quiz) => {
                const result = getQuizResult(quiz.id);
                const percentage = result ? Math.round((result.score / result.totalPoints) * 100) : 0;

                return (
                  <Card key={quiz.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                            <Badge className={getDifficultyColor(quiz.difficulty)}>
                                {quiz.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                {quiz.category}
                            </Badge>
                        </div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-medium text-gray-600">Your Score</p>
                                    <p className="text-sm font-bold text-blue-600">{result?.score} / {result?.totalPoints}</p>
                                </div>
                                <Progress value={percentage} className="h-2" />
                                <p className="text-right text-xs text-gray-500 mt-1">{percentage}%</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>Completed on {result?.completedAt.toLocaleDateString()}</span>
                            </div>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => handleViewResults(quiz)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View Results
                            </Button>
                        </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
                <div className="col-span-full text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No completed quizzes</h3>
                    <p className="text-gray-500">Take a quiz to see your results here!</p>
                </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;