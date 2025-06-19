import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Users, Trophy, Plus, Edit, Trash2, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QuizCreator from '@/components/QuizCreator';
import type { Quiz } from '@/types/quiz';

interface AdminStats {
  totalQuizzes: number;
  activeStudents: number;
  quizAttempts: number;
  averageScore: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stats, setStats] = useState<AdminStats>({
    totalQuizzes: 0,
    activeStudents: 0,
    quizAttempts: 0,
    averageScore: 0
  });
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
    fetchStats();
  }, []);

  useEffect(() => {
    // Filter quizzes when category selection changes
    if (selectedCategory === 'all') {
      setFilteredQuizzes(quizzes);
    } else {
      setFilteredQuizzes(quizzes.filter(quiz => quiz.category === selectedCategory));
    }
  }, [quizzes, selectedCategory]);

  const fetchStats = async () => {
    try {
      // Get total number of students
      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      }

      // Get quiz attempts and calculate average score
      const { data: resultsData, error: resultsError } = await supabase
        .from('quiz_results')
        .select('score, total_points');

      if (resultsError) {
        console.error('Error fetching quiz results:', resultsError);
      }

      // Calculate average score percentage
      let averageScore = 0;
      if (resultsData && resultsData.length > 0) {
        const totalPercentages = resultsData.reduce((acc, result) => {
          const percentage = (result.score / result.total_points) * 100;
          return acc + percentage;
        }, 0);
        averageScore = Math.round(totalPercentages / resultsData.length);
      }

      setStats({
        totalQuizzes: quizzes.length,
        activeStudents: studentsData?.length || 0,
        quizAttempts: resultsData?.length || 0,
        averageScore
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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

  const handleSaveQuiz = async (quiz: Quiz) => {
    try {
      // First, create the quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quiz.title,
          description: quiz.description,
          category: quiz.category,
          difficulty: quiz.difficulty,
          time_limit: quiz.timeLimit,
          created_by: user?.id
        })
        .select()
        .single();

      if (quizError) {
        console.error('Error creating quiz:', quizError);
        toast.error('Failed to create quiz');
        return;
      }

      // Then, create the questions
      if (quiz.questions.length > 0) {
        const questionsToInsert = quiz.questions.map(question => ({
          quiz_id: quizData.id,
          question_type: question.type,
          question: question.question,
          options: question.options || null,
          correct_answer: question.correctAnswer,
          points: question.points
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) {
          console.error('Error creating questions:', questionsError);
          toast.error('Quiz created but failed to add questions');
          return;
        }
      }

      toast.success('Quiz created successfully!');
      setShowQuizCreator(false);
      fetchQuizzes();
      fetchStats(); // Refresh stats after creating quiz
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      // Delete questions first (due to foreign key constraint)
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', quizId);

      if (questionsError) {
        console.error('Error deleting questions:', questionsError);
        toast.error('Failed to delete quiz questions');
        return;
      }

      // Then delete the quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (quizError) {
        console.error('Error deleting quiz:', quizError);
        toast.error('Failed to delete quiz');
        return;
      }

      toast.success('Quiz deleted successfully!');
      fetchQuizzes();
      fetchStats(); // Refresh stats after deleting quiz
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  // Update stats when quizzes change
  useEffect(() => {
    if (quizzes.length > 0) {
      fetchStats();
    }
  }, [quizzes]);

  // Get unique categories from quizzes
  const categories = Array.from(new Set(quizzes.map(quiz => quiz.category))).sort();

  if (showQuizCreator) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <QuizCreator
            onSave={handleSaveQuiz}
            onCancel={() => setShowQuizCreator(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage quizzes and monitor student progress</p>
          </div>
          <Button 
            onClick={() => setShowQuizCreator(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
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
                  <p className="text-sm text-gray-600">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Students</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeStudents}</p>
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
                  <p className="text-sm text-gray-600">Quiz Attempts</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.quizAttempts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quizzes List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manage Quizzes</CardTitle>
                <CardDescription>Create, edit, and manage your quizzes</CardDescription>
              </div>
              {categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading quizzes...</p>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {selectedCategory === 'all' ? 'No quizzes created yet' : `No quizzes found in "${selectedCategory}" category`}
                </p>
                <Button 
                  onClick={() => setShowQuizCreator(true)}
                  variant="outline"
                >
                  Create Your First Quiz
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuizzes.map((quiz) => (
                  <div key={quiz.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
                          <Badge variant="outline">{quiz.difficulty}</Badge>
                          <Badge variant="secondary">{quiz.category}</Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{quiz.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{quiz.questions.length} questions</span>
                          <span>{quiz.timeLimit} minutes</span>
                          <span>Created {quiz.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;