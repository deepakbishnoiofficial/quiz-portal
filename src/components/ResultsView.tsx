import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, CheckCircle, XCircle, ArrowLeft, Calendar, Clock } from 'lucide-react';
import type { Quiz, QuizResult } from '@/types/quiz';

interface ResultsViewProps {
  result: QuizResult;
  quiz: Quiz;
  onBack: () => void;
}

const ResultsView = ({ result, quiz, onBack }: ResultsViewProps) => {
  const percentage = Math.round((result.score / result.totalPoints) * 100);
  
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return { text: 'Excellent!', class: 'bg-green-100 text-green-800 border-green-200' };
    if (percentage >= 60) return { text: 'Good Job!', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { text: 'Keep Practicing!', class: 'bg-red-100 text-red-800 border-red-200' };
  };

  const scoreBadge = getScoreBadge(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Quiz Results</h1>
            <p className="text-gray-600 mt-1">Here's how you performed on the quiz</p>
          </div>
        </div>

        {/* Results Overview */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-8">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-fit">
              <Trophy className={`h-12 w-12 ${getScoreColor(percentage)}`} />
            </div>
            <CardTitle className="text-2xl text-gray-800">{quiz.title}</CardTitle>
            <Badge className={scoreBadge.class}>
              {scoreBadge.text}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getScoreColor(percentage)} mb-2`}>
                {percentage}%
              </div>
              <div className="text-xl text-gray-600 mb-4">
                {result.score} out of {result.totalPoints} points
              </div>
              <Progress value={percentage} className="max-w-md mx-auto h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{quiz.questions.length}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {quiz.questions.filter(q => 
                    result.answers[q.id]?.toLowerCase() === q.correctAnswer.toLowerCase()
                  ).length}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{result.score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Completed: {result.completedAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time: {result.completedAt.toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question-by-Question Review */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Detailed Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const userAnswer = result.answers[question.id];
                const isCorrect = userAnswer?.toLowerCase() === question.correctAnswer.toLowerCase();
                
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-1 rounded-full ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800">Question {index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {question.points} pts
                          </Badge>
                          <Badge className={isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-800 mb-3">{question.question}</h3>
                        
                        {question.type === 'multiple-choice' && question.options && (
                          <div className="space-y-2 mb-3">
                            {question.options.map((option, optIndex) => (
                              <div 
                                key={optIndex}
                                className={`p-2 rounded border text-sm ${
                                  option === question.correctAnswer 
                                    ? 'bg-green-50 border-green-200 text-green-800' 
                                    : option === userAnswer && !isCorrect
                                      ? 'bg-red-50 border-red-200 text-red-800'
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{option}</span>
                                  {option === question.correctAnswer && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                  {option === userAnswer && option !== question.correctAnswer && (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Your Answer: </span>
                            <span className={userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}>
                              {userAnswer || 'No answer provided'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Correct Answer: </span>
                            <span className="text-green-600">{question.correctAnswer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={onBack}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
