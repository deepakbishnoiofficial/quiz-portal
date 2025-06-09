
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, X, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Quiz, Question } from '@/types/quiz';

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

const QuizCreator = ({ onSave, onCancel }: QuizCreatorProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 10
  });
  const [bulkImportText, setBulkImportText] = useState('');

  // Predefined categories
  const categoryOptions = [
    'Programming',
    'Science',
    'History',
    'Mathematics',
    'Literature',
    'Geography',
    'General Knowledge',
    'Technology',
    'Business',
    'Arts'
  ];

  const addQuestion = () => {
    if (!currentQuestion.question || !currentQuestion.correctAnswer) return;

    const newQuestion: Question = {
      id: Date.now().toString(),
      type: currentQuestion.type as Question['type'],
      question: currentQuestion.question,
      options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.correctAnswer,
      points: currentQuestion.points || 10
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const parseBulkImport = () => {
    if (!bulkImportText.trim()) {
      toast.error('Please enter questions to import');
      return;
    }

    try {
      const lines = bulkImportText.trim().split('\n').filter(line => line.trim());
      const importedQuestions: Question[] = [];
      
      let currentQ: Partial<Question> = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('Q:') || line.startsWith('Question:')) {
          // Start of a new question
          if (currentQ.question && currentQ.correctAnswer) {
            importedQuestions.push({
              id: `bulk_${Date.now()}_${importedQuestions.length}`,
              type: currentQ.type || 'multiple-choice',
              question: currentQ.question,
              options: currentQ.options,
              correctAnswer: currentQ.correctAnswer,
              points: currentQ.points || 10
            });
          }
          
          currentQ = {
            type: 'multiple-choice',
            question: line.replace(/^(Q:|Question:)\s*/, ''),
            options: [],
            points: 10
          };
        } else if (line.startsWith('A)') || line.startsWith('B)') || line.startsWith('C)') || line.startsWith('D)')) {
          // Multiple choice option
          if (!currentQ.options) currentQ.options = [];
          currentQ.options.push(line.substring(2).trim());
        } else if (line.startsWith('Answer:') || line.startsWith('Correct:')) {
          // Correct answer
          currentQ.correctAnswer = line.replace(/^(Answer:|Correct:)\s*/, '');
        } else if (line.startsWith('Points:')) {
          // Points value
          const points = parseInt(line.replace('Points:', '').trim());
          if (!isNaN(points)) currentQ.points = points;
        } else if (line.startsWith('Type:')) {
          // Question type
          const type = line.replace('Type:', '').trim().toLowerCase();
          if (type.includes('true') || type.includes('false')) {
            currentQ.type = 'true-false';
          } else if (type.includes('short') || type.includes('text')) {
            currentQ.type = 'short-answer';
          } else {
            currentQ.type = 'multiple-choice';
          }
        }
      }
      
      // Add the last question if valid
      if (currentQ.question && currentQ.correctAnswer) {
        importedQuestions.push({
          id: `bulk_${Date.now()}_${importedQuestions.length}`,
          type: currentQ.type || 'multiple-choice',
          question: currentQ.question,
          options: currentQ.options,
          correctAnswer: currentQ.correctAnswer,
          points: currentQ.points || 10
        });
      }
      
      if (importedQuestions.length === 0) {
        toast.error('No valid questions found. Please check the format.');
        return;
      }
      
      setQuestions([...questions, ...importedQuestions]);
      setBulkImportText('');
      toast.success(`Successfully imported ${importedQuestions.length} questions!`);
    } catch (error) {
      console.error('Error parsing bulk import:', error);
      toast.error('Error parsing questions. Please check the format.');
    }
  };

  const handleSave = () => {
    if (!title || !description || !category || questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question.');
      return;
    }

    const quiz: Quiz = {
      id: Date.now().toString(),
      title,
      description,
      category,
      difficulty,
      timeLimit,
      questions,
      createdAt: new Date()
    };

    onSave(quiz);
  };

  const canAddQuestion = currentQuestion.question && currentQuestion.correctAnswer && 
    (currentQuestion.type !== 'multiple-choice' || 
     (currentQuestion.options && currentQuestion.options.filter(opt => opt.trim()).length >= 2));

  const bulkImportExample = `Q: What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Answer: Paris
Points: 10

Q: The Earth is flat.
Type: true-false
Answer: false
Points: 5

Q: What programming language is known for web development?
Type: short-answer
Answer: JavaScript
Points: 15`;

  return (
    <div className="space-y-6">
      {/* Quiz Details */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Quiz Title*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="category">Category*</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this quiz covers"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => setDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                min={1}
                max={180}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Questions - Tabs for Individual vs Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle>Add Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select 
                    value={currentQuestion.type} 
                    onValueChange={(value: Question['type']) => 
                      setCurrentQuestion({ 
                        ...currentQuestion, 
                        type: value,
                        options: value === 'multiple-choice' ? ['', '', '', ''] : undefined,
                        correctAnswer: ''
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="short-answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="question">Question*</Label>
                <Textarea
                  id="question"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter your question"
                  rows={2}
                />
              </div>

              {currentQuestion.type === 'multiple-choice' && (
                <div>
                  <Label>Answer Options*</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {currentQuestion.options?.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="correctAnswer">Correct Answer*</Label>
                {currentQuestion.type === 'multiple-choice' ? (
                  <Select 
                    value={currentQuestion.correctAnswer} 
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentQuestion.options?.map((option, index) => (
                        option.trim() && (
                          <SelectItem key={index} value={option}>
                            {option}
                          </SelectItem>
                        )
                      ))}
                    </SelectContent>
                  </Select>
                ) : currentQuestion.type === 'true-false' ? (
                  <Select 
                    value={currentQuestion.correctAnswer} 
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select true or false" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                    placeholder="Enter the correct answer"
                  />
                )}
              </div>

              <Button 
                onClick={addQuestion} 
                disabled={!canAddQuestion}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </TabsContent>
            
            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulkImport">Bulk Import Questions</Label>
                  <Textarea
                    id="bulkImport"
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="Paste your questions here using the format shown below..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={parseBulkImport}
                    disabled={!bulkImportText.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Questions
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setBulkImportText('')}
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Format Example:
                  </h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">{bulkImportExample}</pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <Badge variant="outline">{question.type}</Badge>
                      <Badge variant="outline">{question.points} pts</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-2">{question.question}</h4>
                  {question.options && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Options:</span> {question.options.join(', ')}
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Correct Answer:</span> {question.correctAnswer}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!title || !description || !category || questions.length === 0}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Quiz
        </Button>
      </div>
    </div>
  );
};

export default QuizCreator;
