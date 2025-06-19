import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Trophy, Play, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QuizTaking from '@/components/QuizTaking';
import ResultsView from '@/components/ResultsView';
import type { Quiz, QuizResult } from '@/types/quiz';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'taking' | 'results'>('dashboard');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentResult, setCurrentResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    fetchQuizzes();
    fetchResults();
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions(*)
        `)
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
        .select('*')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      const formattedResults: QuizResult[] = resultsData?.map(result => ({
        id: result.id,
        quizId: result.quiz_id,
        studentName: user.email || 'Student',
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

  const handleQuizComplete = async (result: QuizResult) => {
    if (!user) {
      toast.error('You must be logged in to save quiz results');
      return;
    }

    try {
      // Save result to Supabase
      const { error } = await supabase
        .from('quiz_results')
        .insert({
          quiz_id: result.quizId,
          student_id: user.id,
          score: result.score,
          total_points: result.totalPoints,
          answers: result.answers,
          completed_at: result.completedAt.toISOString()
        });

      if (error) {
        console.error('Error saving quiz result:', error);
        toast.error('Failed to save quiz result');
        return;
      }

      // Update local state
      setResults(prev => [...prev, result]);
      setCurrentResult(result);
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
    // Refresh data when returning to dashboard
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

  // Show quiz taking interface
  if (currentView === 'taking' && selectedQuiz) {
    return (
      <QuizTaking
        quiz={selectedQuiz}
        onComplete={handleQuizComplete}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Show results interface
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Ready to test your knowledge?</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Quizzes</p>
                  <p className="text-2xl font-bold text-gray-800">{availableQuizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-800">{results.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-800">{averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-800">{quizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6">
          <Button
            variant={activeTab === 'available' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('available')}
            className={activeTab === 'available' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Available Quizzes ({availableQuizzes.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('completed')}
            className={activeTab === 'completed' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Completed Quizzes ({results.length})
          </Button>
        </div>

        {/* Quiz Grid */}
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
                    <CardDescription className="text-sm">{quiz.description}</CardDescription>
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
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                        onClick={() => handleStartQuiz(quiz)}
                        disabled={quiz.questions.length === 0}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {quiz.questions.length === 0 ? 'No Questions Available' : 'Start Quiz'}
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
                      <CardDescription className="text-sm">{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Your Score</span>
                          <span className="font-semibold text-gray-800">
                            {result?.score}/{result?.totalPoints} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Completed {result?.completedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No completed quizzes</h3>
                <p className="text-gray-500">Start taking some quizzes to see your results here!</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;