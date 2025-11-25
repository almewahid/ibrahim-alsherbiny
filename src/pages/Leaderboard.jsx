import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [filterBySeries, setFilterBySeries] = useState("all");

  const { data: attempts = [] } = useQuery({
    queryKey: ['allQuizAttempts'],
    queryFn: () => base44.entities.QuizAttempt.list("-score"),
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['allQuizzes'],
    queryFn: () => base44.entities.Quiz.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['allSeries'],
    queryFn: () => base44.entities.Series.list(),
  });

  const leaderboard = useMemo(() => {
    let filteredAttempts = attempts;

    if (filterBySeries !== "all") {
      const seriesQuizzes = quizzes.filter(q => q.series_id === filterBySeries).map(q => q.id);
      filteredAttempts = attempts.filter(a => seriesQuizzes.includes(a.quiz_id));
    }

    const userStats = {};
    filteredAttempts.forEach(attempt => {
      if (!userStats[attempt.user_id]) {
        userStats[attempt.user_id] = {
          user_name: attempt.user_name,
          total_quizzes: 0,
          total_score: 0,
          passed_quizzes: 0,
          perfect_scores: 0
        };
      }
      
      userStats[attempt.user_id].total_quizzes += 1;
      userStats[attempt.user_id].total_score += attempt.score;
      if (attempt.passed) userStats[attempt.user_id].passed_quizzes += 1;
      if (attempt.score === 100) userStats[attempt.user_id].perfect_scores += 1;
    });

    return Object.entries(userStats)
      .map(([user_id, stats]) => ({
        user_id,
        ...stats,
        avg_score: stats.total_quizzes > 0 ? (stats.total_score / stats.total_quizzes).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.avg_score) - parseFloat(a.avg_score));
  }, [attempts, quizzes, filterBySeries]);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-8 h-8 text-yellow-500" />;
    if (index === 1) return <Medal className="w-8 h-8 text-gray-400" />;
    if (index === 2) return <Medal className="w-8 h-8 text-orange-600" />;
    return <Award className="w-6 h-6 text-purple-500" />;
  };

  const getRankBg = (index) => {
    if (index === 0) return "bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-300";
    if (index === 1) return "bg-gradient-to-br from-gray-50 to-slate-100 border-gray-300";
    if (index === 2) return "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300";
    return "bg-white border-purple-100";
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">لوحة الشرف</h1>
          <p className="text-lg text-gray-600">أفضل المتفوقين في الاختبارات</p>
        </div>

        <div className="mb-6">
          <Select value={filterBySeries} onValueChange={setFilterBySeries}>
            <SelectTrigger className="border-2 h-12">
              <SelectValue placeholder="عرض الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع السلاسل</SelectItem>
              {series.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border-2 ${getRankBg(index)} hover:shadow-xl transition-all`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">{entry.user_name}</h3>
                        {entry.perfect_scores > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {entry.perfect_scores} علامة كاملة
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <p className="text-gray-600 text-xs">المعدل</p>
                          <p className="font-bold text-lg text-purple-700">{entry.avg_score}%</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <p className="text-gray-600 text-xs">الاختبارات</p>
                          <p className="font-bold text-lg text-gray-900">{entry.total_quizzes}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <p className="text-gray-600 text-xs">النجاح</p>
                          <p className="font-bold text-lg text-green-700">{entry.passed_quizzes}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-2 text-center">
                          <p className="text-gray-600 text-xs">معدل النجاح</p>
                          <p className="font-bold text-lg text-blue-700">
                            {entry.total_quizzes > 0 ? Math.round((entry.passed_quizzes / entry.total_quizzes) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-center">
                      <div className="text-3xl font-bold text-gray-400">#{index + 1}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {leaderboard.length === 0 && (
            <Card className="border-2 border-purple-100">
              <CardContent className="pt-12 pb-12 text-center">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد نتائج بعد</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}