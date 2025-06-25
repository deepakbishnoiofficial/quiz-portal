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
import type { Quiz, QuizResult } from '@/types/quiz';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from '@/types/supabase';
import { Checkbox } from '@/components/ui/checkbox'; // <-- 1. FEATURE: Import Checkbox

// 2. FEATURE: Define a list of available courses for selection
const AVAILABLE_COURSES = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
    "Computer Science",
    "Literature"
];

type Profile = Database['public']['Tables']['profiles']['Row'];

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'taking' | 'results'>('dashboard');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null);
  
  
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    dateOfJoining: new Date(),
    enrolledCourses: [] as string[],
  });

  // 3. FEATURE: Add enrolledCourses to the editable profile state
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
    }
  }, [user]);

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
          dateOfJoining: new Date(data.created_at), // This is the date of enrollment
          enrolledCourses: data.enrolled_courses ?? ['General Knowledge'],
        });
        setEditProfile({
          fullName: data.full_name || '',
          dateOfBirth: data.date_of_birth ?? '',
          gender: data.gender ?? 'Prefer not to say',
          // 4. FEATURE: Initialize editable courses from fetched data
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
          // 5. FEATURE: Add enrolled_courses to the update payload
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

  // Handler for course checkbox changes
  const handleCourseChange = (course: string) => {
    setEditProfile(prev => {
        const newCourses = prev.enrolledCourses.includes(course)
            ? prev.enrolledCourses.filter(c => c !== course) // Uncheck: remove course
            : [...prev.enrolledCourses, course]; // Check: add course
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
        .select(`*, profiles:student_id (full_name)`)
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
        answers: result.answers as Record<string, string>
      })) || [];

      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
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
          completed_at: result.completedAt.toISOString()
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
    fetchQuizzes();
    fetchResults();
  };

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
                {/* 6. FEATURE: Add selectable course list to dialog */}
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
                        {/* This shows the date of enrollment */}
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