import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Clock, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
// Ensure this imported type includes `timeTaken: number;`
import type { Quiz, QuizResult } from '@/types/quiz';

interface QuizTakingProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
  onBack: () => void;
}

const QuizTaking = ({ quiz, onComplete, onBack }: QuizTakingProps) => {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit * 60); // in seconds
  const [isStarted, setIsStarted] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  useEffect(() => {
    if (!isStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Use a callback with handleSubmit to ensure state is up-to-date
          handleSubmit(true); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = (isAutoSubmit = false) => {
    let totalScore = 0;
    const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0);

    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (userAnswer && userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()) {
        totalScore += question.points;
      }
    });

    // 1. FEATURE: Calculate the time taken in seconds.
    const timeTakenInSeconds = (quiz.timeLimit * 60) - (isAutoSubmit ? 0 : timeRemaining);

    const result: QuizResult = {
      id: Date.now().toString(),
      quizId: quiz.id,
      studentName: user?.email || 'Anonymous', // Recommended to use a display name if available
      score: totalScore,
      totalPoints,
      completedAt: new Date(),
      answers,
      // 2. FEATURE: Add the `timeTaken` property to the result object.
      timeTaken: timeTakenInSeconds,
    };

    onComplete(result);
  };

  const isAnswered = (questionId: string) => {
    return answers[questionId] !== undefined && answers[questionId] !== '';
  };

  const answeredCount = quiz.questions.filter(q => isAnswered(q.id)).length;

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="absolute left-6 top-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            <CardTitle className="text-2xl text-gray-800">{quiz.title}</CardTitle>
            <p className="text-gray-600 mt-2">{quiz.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{quiz.questions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{quiz.timeLimit}</div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {quiz.questions.reduce((acc, q) => acc + q.points, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Quiz Instructions:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• You have {quiz.timeLimit} minutes to complete this quiz</li>
                <li>• You can navigate between questions using the Previous/Next buttons</li>
                <li>• Make sure to answer all questions before submitting</li>
                <li>• The quiz will auto-submit when time runs out</li>
              </ul>
            </div>

            <Button
              onClick={() => setIsStarted(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3"
            >
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-red-600 font-bold' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Answered: {answeredCount}/{quiz.questions.length}
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </div>

        {/* Question Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              {currentQuestion.question}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Points:</span>
              <span className="font-semibold text-blue-600">{currentQuestion.points}</span>
            </div>
          </CardHeader>
          <CardContent>
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.type === 'true-false' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.type === 'short-answer' && (
              <Input
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your answer"
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-gray-600">
            {answeredCount === quiz.questions.length ? (
              <span className="text-green-600 font-medium">All questions answered!</span>
            ) : (
              <span>{quiz.questions.length - answeredCount} questions remaining</span>
            )}
          </div>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <Button
              onClick={() => handleSubmit(false)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizTaking;