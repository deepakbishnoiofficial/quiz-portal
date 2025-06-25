// src/components/Leaderboard.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowLeft, Crown, Medal, Award } from 'lucide-react';
import type { QuizResult } from '@/types/quiz';

interface LeaderboardProps {
  quizTitle: string;
  performers: QuizResult[];
  onBack: () => void;
}

const Leaderboard = ({ quizTitle, performers, onBack }: LeaderboardProps) => {
  const rankIcons = [
    <Crown key="rank1" className="h-6 w-6 text-yellow-500" />,
    <Medal key="rank2" className="h-6 w-6 text-gray-400" />,
    <Award key="rank3" className="h-6 w-6 text-yellow-700" />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Leaderboard</h1>
            <p className="text-gray-600 mt-1">Top performers for "{quizTitle}"</p>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-fit shadow-md">
              <Trophy className="h-12 w-12 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-gray-800">{quizTitle}</CardTitle>
            <CardDescription>See who came out on top!</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {performers.length > 0 ? (
              <ul className="space-y-3">
                {performers.map((performer, index) => {
                  const percentage = Math.round((performer.score / performer.totalPoints) * 100);
                  return (
                    <li key={performer.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50 shadow-sm">
                      <div className="flex items-center justify-center gap-3 w-16">
                        <span className="text-xl font-bold text-gray-600">{index + 1}</span>
                        {rankIcons[index] || <div className="h-6 w-6"></div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{performer.studentName}</p>
                        <p className="text-sm text-gray-500">Score: {performer.score}/{performer.totalPoints}</p>
                      </div>
                      <div className="text-lg font-bold text-purple-600">{percentage}%</div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No results have been submitted for this quiz yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;