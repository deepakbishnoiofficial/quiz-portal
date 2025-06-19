import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, X, Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Define interfaces directly within the immersive for self-containment
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

// Updated interface to match AdminDashboard expectations
interface QuizCreatorProps {
  onSave: (quiz: Quiz) => Promise<void>;
  onCancel: () => void;
  initialQuiz?: Quiz; // Optional prop for editing existing quizzes, renamed from 'quiz'
}

const QuizCreator = ({ onSave, onCancel, initialQuiz }: QuizCreatorProps) => {
  // Use initialQuiz for state initialization
  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [category, setCategory] = useState(initialQuiz?.category || '');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(initialQuiz?.difficulty || 'Easy');
  const [timeLimit, setTimeLimit] = useState(initialQuiz?.timeLimit || 30);
  const [questions, setQuestions] = useState<Question[]>(initialQuiz?.questions || []);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 10
  });
  const [bulkImportText, setBulkImportText] = useState('');
  const [saving, setSaving] = useState(false);

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

  /**
   * Adds the current question being edited to the list of quiz questions.
   * Performs basic validation before adding.
   */
  const addQuestion = () => {
    // Ensure question and correct answer are provided
    if (!currentQuestion.question || !currentQuestion.correctAnswer) {
      toast.error('Please enter a question and its correct answer.');
      return;
    }

    // For multiple choice, ensure at least two options are provided and not empty
    if (currentQuestion.type === 'multiple-choice' && (!currentQuestion.options || currentQuestion.options.filter(opt => opt.trim()).length < 2)) {
        toast.error('Multiple choice questions require at least two non-empty options.');
        return;
    }

    const newQuestion: Question = {
      id: Date.now().toString(), // Unique ID for the question
      type: currentQuestion.type as Question['type'],
      question: currentQuestion.question,
      options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
      correctAnswer: currentQuestion.correctAnswer,
      points: currentQuestion.points || 10
    };

    setQuestions([...questions, newQuestion]); // Add new question to the list
    // Reset current question fields for the next entry
    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10
    });
    toast.success('Question added!');
  };

  /**
   * Removes a question from the list by its index.
   * @param index The index of the question to remove.
   */
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    toast.info('Question removed.');
  };

  /**
   * Handles changes to an option text for multiple-choice questions.
   * @param index The index of the option to update.
   * @param value The new text value for the option.
   */
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  /**
   * Helper function to normalize answers based on question type.
   * For multiple-choice, it tries to match exact option text or letter (A, B, C, D).
   * For true/false, it normalizes to 'true' or 'false'.
   * @param answerText The raw answer text from bulk import.
   * @param question The partial question object being built.
   * @returns The normalized correct answer string.
   */
  const normalizeAnswer = (answerText: string, question: Partial<Question>): string => {
    const normalized = answerText.trim();
    
    // Normalize true/false answers
    if (question.type === 'true-false') {
      const lower = normalized.toLowerCase();
      return (lower === 'true' || lower === 't' || lower === '1') ? 'true' : 'false';
    }
    
    // For multiple choice, try to match the answer to an option
    if (question.type === 'multiple-choice' && question.options) {
      // First, check if it's already a valid option
      const exactMatch = question.options.find(opt => 
        opt.trim().toLowerCase() === normalized.toLowerCase()
      );
      if (exactMatch) {
        return exactMatch.trim(); // Return the exact option text
      }
      
      // Check if it's a letter reference (A, B, C, D)
      const letterMatch = normalized.match(/^[A-D]$/i);
      if (letterMatch) {
        const index = letterMatch[0].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
        if (index < question.options.length && question.options[index].trim()) {
          return question.options[index].trim();
        }
      }
      
      // If no match found, return as-is but warn in console (toast for user)
      console.warn(`Answer "${normalized}" doesn't match any option for question: ${question.question}`);
      toast.warning(`For question "${question.question}", answer "${normalized}" didn't match an option. Using as-is.`);
    }
    
    return normalized;
  };

  /**
   * Helper function to create a valid question object from parsed bulk data.
   * Performs validation and assigns default values if needed.
   * @param questionData Partial question data parsed from bulk text.
   * @param index Index for unique ID generation.
   * @returns A complete Question object.
   * @throws Error if a multiple-choice question is invalid.
   */
  const createValidQuestion = (questionData: Partial<Question>, index: number): Question => {
    // Validate multiple choice questions
    if (questionData.type === 'multiple-choice') {
      if (!questionData.options || questionData.options.length < 2) {
        throw new Error(`Multiple choice question must have at least 2 options: ${questionData.question}`);
      }
      
      // Filter out empty options from bulk import
      questionData.options = questionData.options.filter(opt => opt.trim());
      
      // Re-verify correct answer exists in filtered options
      const answerExists = questionData.options.some(opt => 
        opt.trim().toLowerCase() === questionData.correctAnswer?.toLowerCase()
      );
      
      if (!answerExists) {
        console.warn(`Correct answer "${questionData.correctAnswer}" not found in filtered options for: ${questionData.question}`);
        toast.warning(`Correct answer "${questionData.correctAnswer}" for "${questionData.question}" not found in provided options. Please check.`);
      }
    }

    return {
      id: `bulk_${Date.now()}_${index}`, // Generate a unique ID
      type: questionData.type || 'multiple-choice',
      question: questionData.question || '',
      options: questionData.options,
      correctAnswer: questionData.correctAnswer || '',
      points: questionData.points || 10
    };
  };

  /**
   * Parses the bulk import text area content into Question objects and adds them to the quiz.
   * Supports 'Q:', 'Question:', 'A)', 'B)', 'C)', 'D)', 'Answer:', 'Correct:', 'Points:', 'Type:' formats.
   */
  const parseBulkImport = () => {
    if (!bulkImportText.trim()) {
      toast.error('Please enter questions to import in the text area.');
      return;
    }

    try {
      const lines = bulkImportText.trim().split('\n').filter(line => line.trim());
      const importedQuestions: Question[] = [];
      
      let currentQ: Partial<Question> = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('Q:') || line.startsWith('Question:')) {
          // If a previous question was being built, add it before starting a new one
          if (currentQ.question && currentQ.correctAnswer) {
            try {
              importedQuestions.push(createValidQuestion(currentQ, importedQuestions.length));
            } catch (error: any) {
              toast.error(`Error with question: "${currentQ.question}" - ${error.message}`);
              console.error(`Error processing bulk question: ${currentQ.question}`, error);
            }
          }
          
          // Start new question
          currentQ = {
            type: 'multiple-choice', // Default type
            question: line.replace(/^(Q:|Question:)\s*/, '').trim(),
            options: [], // Initialize options for potential multiple choice
            points: 10 // Default points
          };
        } else if (line.match(/^[A-D]\)/)) {
          // Multiple choice option (A), B), C), D))
          if (!currentQ.options) currentQ.options = [];
          const optionText = line.substring(2).trim();
          currentQ.options.push(optionText);
        } else if (line.startsWith('Answer:') || line.startsWith('Correct:')) {
          // Correct answer - normalize and validate
          const answerText = line.replace(/^(Answer:|Correct:)\s*/, '').trim();
          currentQ.correctAnswer = normalizeAnswer(answerText, currentQ);
        } else if (line.startsWith('Points:')) {
          // Points value
          const points = parseInt(line.replace('Points:', '').trim());
          if (!isNaN(points) && points > 0) currentQ.points = points;
        } else if (line.startsWith('Type:')) {
          // Question type
          const type = line.replace('Type:', '').trim().toLowerCase();
          if (type.includes('true') || type.includes('false')) {
            currentQ.type = 'true-false';
            currentQ.options = undefined; // Remove options for true/false
          } else if (type.includes('short') || type.includes('text')) {
            currentQ.type = 'short-answer';
            currentQ.options = undefined; // Remove options for short answer
          } else {
            currentQ.type = 'multiple-choice';
            if (!currentQ.options) currentQ.options = []; // Ensure options array exists for MC
          }
        }
      }
      
      // Add the last question if valid after the loop finishes
      if (currentQ.question && currentQ.correctAnswer) {
        try {
          importedQuestions.push(createValidQuestion(currentQ, importedQuestions.length));
        } catch (error: any) {
          toast.error(`Error with final question: "${currentQ.question}" - ${error.message}`);
          console.error(`Error processing final bulk question: ${currentQ.question}`, error);
        }
      }
      
      if (importedQuestions.length === 0) {
        toast.error('No valid questions found. Please check the format and try again.');
        return;
      }
      
      setQuestions([...questions, ...importedQuestions]); // Append imported questions
      setBulkImportText(''); // Clear bulk import area
      toast.success(`Successfully imported ${importedQuestions.length} questions!`);
    } catch (error) {
      console.error('Error parsing bulk import:', error);
      toast.error('An unexpected error occurred during bulk import. Please check format.');
    }
  };

  /**
   * Handles the saving of the quiz.
   * Validates required fields and then calls the onSave prop.
   */
  const handleSave = async () => {
    if (!title || !description || !category || questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question.');
      return;
    }

    setSaving(true); // Indicate saving in progress
    try {
      const quizToSave: Quiz = {
        id: initialQuiz?.id || Date.now().toString(), // Use existing ID if editing, otherwise generate new
        title,
        description,
        category,
        difficulty,
        timeLimit,
        questions,
        createdAt: initialQuiz?.createdAt || new Date() // Preserve original creation date or set new
      };

      await onSave(quizToSave); // Call the parent's save function
      toast.success(initialQuiz ? 'Quiz updated successfully!' : 'Quiz created successfully!');
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error('Failed to save quiz. Please try again.');
    } finally {
      setSaving(false); // Reset saving state
    }
  };

  // Determine if the "Add Question" button should be enabled
  const canAddQuestion = currentQuestion.question && currentQuestion.correctAnswer && 
    (currentQuestion.type !== 'multiple-choice' || 
     (currentQuestion.options && currentQuestion.options.filter(opt => opt.trim()).length >= 2));

  // Example format for bulk import
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
Points: 15

Q: Which of these is a programming language?
A) HTML
B) CSS
C) Python
D) JSON
Answer: C
Points: 10`;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {initialQuiz ? 'Edit Quiz' : 'Create New Quiz'} {/* Use initialQuiz here */}
          </h1>
          <p className="text-gray-600 mt-1">
            {initialQuiz ? 'Update your quiz details and questions' : 'Design your quiz with questions and settings'} {/* Use initialQuiz here */}
          </p>
        </div>
      </div>

      {/* Warning Box for Bulk Import */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Important Notes for Bulk Import:</span>
        </div>
        <ul className="mt-2 text-sm text-yellow-700 space-y-1">
          <li>• For multiple-choice: Answer should match option text exactly or use letter (A, B, C, D)</li>
          <li>• For true/false: Use "true" or "false" (case insensitive)</li>
          <li>• Ensure consistent formatting (one line per data point) for reliable import</li>
          <li>• Questions must start with "Q:" or "Question:"</li>
        </ul>
      </div>

      {/* Quiz Details */}
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-xl font-semibold text-gray-700">Quiz Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="font-medium text-gray-700 mb-1 block">Quiz Title*</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="category" className="font-medium text-gray-700 mb-1 block">Category*</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
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
            <Label htmlFor="description" className="font-medium text-gray-700 mb-1 block">Description*</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this quiz covers"
              rows={3}
              className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="difficulty" className="font-medium text-gray-700 mb-1 block">Difficulty</Label>
              <Select value={difficulty} onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => setDifficulty(value)}>
                <SelectTrigger className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
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
              <Label htmlFor="timeLimit" className="font-medium text-gray-700 mb-1 block">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                min={1}
                max={180}
                className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Questions - Tabs for Individual vs Bulk Import */}
      <Card className="rounded-lg shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-xl font-semibold text-gray-700">Add Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-md p-1">
              <TabsTrigger value="individual" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-colors">
                <Plus className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-colors">
                <Upload className="h-4 w-4" />
                Bulk Import
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="questionType" className="font-medium text-gray-700 mb-1 block">Question Type</Label>
                  <Select 
                    value={currentQuestion.type} 
                    onValueChange={(value: Question['type']) => 
                      setCurrentQuestion({ 
                        ...currentQuestion, 
                        type: value,
                        // Reset options and correct answer based on new type
                        options: value === 'multiple-choice' ? ['', '', '', ''] : undefined,
                        correctAnswer: ''
                      })
                    }
                  >
                    <SelectTrigger className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
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
                  <Label htmlFor="points" className="font-medium text-gray-700 mb-1 block">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                    className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="question" className="font-medium text-gray-700 mb-1 block">Question*</Label>
                <Textarea
                  id="question"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="Enter your question"
                  rows={2}
                  className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>

              {currentQuestion.type === 'multiple-choice' && (
                <div>
                  <Label className="font-medium text-gray-700 mb-1 block">Answer Options*</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {currentQuestion.options?.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="rounded-md border-gray-300"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="correctAnswer" className="font-medium text-gray-700 mb-1 block">Correct Answer*</Label>
                {currentQuestion.type === 'multiple-choice' ? (
                  <Select 
                    value={currentQuestion.correctAnswer} 
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                  >
                    <SelectTrigger className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                      <SelectValue placeholder="Select correct option" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only show non-empty options */}
                      {currentQuestion.options?.map((option, index) => (
                        option.trim() && (
                          <SelectItem key={index} value={option}>
                            {String.fromCharCode(65 + index)}) {option}
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
                    <SelectTrigger className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
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
                    className="rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                )}
              </div>

              <Button 
                onClick={addQuestion} 
                disabled={!canAddQuestion}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </TabsContent>
            
            <TabsContent value="bulk" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulkImport" className="font-medium text-gray-700 mb-1 block">Bulk Import Questions</Label>
                  <Textarea
                    id="bulkImport"
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="Paste your questions here using the format shown below..."
                    rows={10}
                    className="font-mono text-sm rounded-md border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={parseBulkImport}
                    disabled={!bulkImportText.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Questions
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setBulkImportText('')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm transition-colors"
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    Format Example:
                  </h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded-md border border-gray-100">{bulkImportExample}</pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length > 0 && (
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle className="text-xl font-semibold text-gray-700">Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{question.type}</Badge>
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{question.points} pts</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-800 rounded-md p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2 leading-snug">{index + 1}. {question.question}</h4>
                  {question.options && (
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium text-gray-600">Options:</span>
                      <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                        {question.options.map((option, idx) => (
                          <li key={idx}>{String.fromCharCode(65 + idx)}) {option}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-sm text-gray-700 flex items-center">
                    <span className="font-medium text-gray-600">Correct Answer:</span> 
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2 text-xs font-semibold">
                      {question.correctAnswer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4 justify-end pt-4 border-t border-gray-200 mt-6">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          disabled={saving}
          className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm transition-colors px-4 py-2"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!title || !description || !category || questions.length === 0 || saving}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2 px-4 rounded-md shadow-lg transition-all"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {initialQuiz ? 'Update Quiz' : 'Save Quiz'} ({questions.length} questions) {/* Use initialQuiz here */}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default QuizCreator;
