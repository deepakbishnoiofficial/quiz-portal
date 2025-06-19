import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, CheckCircle, XCircle, ArrowLeft, Calendar, Clock, AlertCircle } from 'lucide-react'; // Added AlertCircle

// Mock types for demo (kept here for self-containment)
interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeLimit: number;
  questions: Question[];
  createdAt: Date;
}

interface QuizResult {
  id: string;
  quizId: string;
  score: number;
  totalPoints: number;
  answers: Record<string, string>; // Stores user's answers by question ID
  completedAt: Date;
}

interface ResultsViewProps {
  result: QuizResult;
  quiz: Quiz;
  onBack: () => void;
}

const ResultsView = ({ result, quiz, onBack }: ResultsViewProps) => {
  // --- START FIX: Add safeguard for undefined props ---
  if (!result || !quiz) {
    console.error("ResultsView received undefined 'result' or 'quiz' prop. Please ensure data is loaded before rendering.");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 text-lg text-gray-600 p-4">
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow-md border border-gray-200">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span>Error: Quiz results or quiz data is missing.</span>
        </div>
      </div>
    );
  }
  // --- END FIX ---

  const percentage = Math.round((result.score / result.totalPoints) * 100);
  
  /**
   * Determines the color class based on the score percentage.
   * @param percentage The quiz score percentage.
   * @returns Tailwind CSS color class.
   */
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Determines the badge text and class based on the score percentage.
   * @param percentage The quiz score percentage.
   * @returns An object containing badge text and Tailwind CSS classes.
   */
  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return { text: 'Excellent!', class: 'bg-green-100 text-green-800 border-green-200' };
    if (percentage >= 60) return { text: 'Good Job!', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { text: 'Keep Practicing!', class: 'bg-red-100 text-red-800 border-red-200' };
  };

  /**
   * Compares a user's answer to the correct answer, handling different question types
   * and potential variations in user input (e.g., 'A' vs 'Option A Text').
   * @param userAnswer The answer provided by the user.
   * @param correctAnswer The actual correct answer for the question.
   * @param options Optional: Array of options for multiple-choice questions.
   * @returns True if the answers match, false otherwise.
   */
  const compareAnswers = (userAnswer: string | undefined, correctAnswer: string, options?: string[]): boolean => {
    if (!userAnswer) return false;
    
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    // Direct comparison for short-answer or exact matches
    if (normalizedUser === normalizedCorrect) return true;
    
    // For true/false questions, handle common variations like 't'/'f' or '1'/'0'
    if (normalizedCorrect === 'true' || normalizedCorrect === 'false') {
      if (normalizedUser === 't' && normalizedCorrect === 'true') return true;
      if (normalizedUser === 'f' && normalizedCorrect === 'false') return true;
      if (normalizedUser === '1' && normalizedCorrect === 'true') return true;
      if (normalizedUser === '0' && normalizedCorrect === 'false') return true;
    }

    // For multiple choice, check if user's answer is a letter that maps to the correct option text
    if (options && normalizedUser.match(/^[a-d]$/)) { // Checks if user's answer is 'a', 'b', 'c', or 'd'
      const optionIndex = normalizedUser.charCodeAt(0) - 'a'.charCodeAt(0);
      if (optionIndex >= 0 && optionIndex < options.length) {
        const optionText = options[optionIndex].trim().toLowerCase();
        if (optionText === normalizedCorrect) {
          return true;
        }
      }
    }
    
    return false;
  };

  const scoreBadge = getScoreBadge(percentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-800 rounded-md transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Quiz Results</h1>
            <p className="text-gray-600 mt-1">Here's how you performed on the quiz</p>
          </div>
        </div>

        {/* Results Overview */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-8 rounded-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-fit shadow-md">
              <Trophy className={`h-12 w-12 ${getScoreColor(percentage)}`} />
            </div>
            <CardTitle className="text-2xl text-gray-800">{quiz.title}</CardTitle>
            <Badge className={`mx-auto mt-2 text-base px-4 py-2 rounded-full ${scoreBadge.class}`}>
              {scoreBadge.text}
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getScoreColor(percentage)} mb-2`}>
                {percentage}%
              </div>
              <div className="text-xl text-gray-600 mb-4">
                {result.score} out of {result.totalPoints} points
              </div>
              <Progress value={percentage} className="max-w-md mx-auto h-3 rounded-full bg-gray-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{quiz.questions.length}</div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {quiz.questions.filter(q => 
                    compareAnswers(result.answers[q.id], q.correctAnswer, q.options)
                  ).length}
                </div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{result.score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Completed: {result.completedAt.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Time: {result.completedAt.toLocaleTimeString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question-by-Question Review */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-xl font-semibold text-gray-700">Detailed Review</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const userAnswer = result.answers[question.id];
                const isCorrect = compareAnswers(userAnswer, question.correctAnswer, question.options);
                
                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-1 rounded-full ${isCorrect ? 'bg-green-100' : 'bg-red-100'} flex-shrink-0`}>
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-800">Question {index + 1}</span>
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                            {question.points} pts
                          </Badge>
                          <Badge className={isCorrect ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-800 mb-3 leading-snug">{question.question}</h3>
                        
                        {question.type === 'multiple-choice' && question.options && (
                          <div className="space-y-2 mb-3">
                            {question.options.map((option, optIndex) => {
                              // isCorrectOption checks if THIS option text is the correct answer
                              const isCorrectOption = compareAnswers(option, question.correctAnswer, question.options); 
                              // isUserChoice checks if the user's saved answer (which might be a letter or the full text) matches THIS option
                              const isUserChoice = compareAnswers(userAnswer, option, question.options); 

                              // Determine highlighting for each option
                              let optionClasses = 'p-2 rounded border text-sm ';
                              if (isCorrectOption) {
                                optionClasses += 'bg-green-50 border-green-200 text-green-800';
                              } else if (isUserChoice && !isCorrectOption) { // Highlight user's wrong choice
                                optionClasses += 'bg-red-50 border-red-200 text-red-800';
                              } else { // Default for unselected or correct options
                                optionClasses += 'bg-gray-50 border-gray-200 text-gray-700';
                              }
                              
                              return (
                                <div 
                                  key={optIndex}
                                  className={optionClasses}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{String.fromCharCode(65 + optIndex)})</span>
                                    <span>{option}</span>
                                    {isCorrectOption && (
                                      <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                    )}
                                    {isUserChoice && !isCorrectOption && (
                                      <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-100 p-3 rounded-md border border-gray-200">
                          <div>
                            <span className="font-medium text-gray-600">Your Answer: </span>
                            <span className={userAnswer ? (isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold') : 'text-gray-500 italic'}>
                              {userAnswer || 'No answer provided'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Correct Answer: </span>
                            <span className="text-green-600 font-semibold">{question.correctAnswer}</span>
                          </div>
                        </div>

                        {/* Debug information (keep during development, remove for production) */}
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <strong>Debug:</strong> User: "{userAnswer}" | Correct: "{question.correctAnswer}" | Match: {isCorrect ? 'YES' : 'NO'}
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 text-lg rounded-md shadow-lg transition-all"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
