import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Clock, Award, Target, TrendingUp, Play, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const difficultyColors = {
  "سهل": "bg-green-100 text-green-700 border-green-200",
  "متوسط": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "صعب": "bg-red-100 text-red-700 border-red-200"
};

export default function Quizzes() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.filter({ is_active: true }),
  });

  const { data: myAttempts = [] } = useQuery({
    queryKey: ['myQuizAttempts', user?.id],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: allAttempts = [] } = useQuery({
    queryKey: ['allQuizAttempts'],
    queryFn: () => base44.entities.QuizAttempt.list("-score"),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const mySeriesScores = useMemo(() => {
    const scores = {};
    myAttempts.forEach(attempt => {
      if (attempt.series_id) {
        if (!scores[attempt.series_id]) {
          scores[attempt.series_id] = { total: 0, count: 0 };
        }
        scores[attempt.series_id].total += attempt.percentage;
        scores[attempt.series_id].count += 1;
      }
    });
    
    return Object.entries(scores).map(([seriesId, data]) => ({
      series_id: seriesId,
      series_name: series.find(s => s.id === seriesId)?.title || "سلسلة غير معروفة",
      average: Math.round(data.total / data.count),
      attempts: data.count
    })).sort((a, b) => b.average - a.average);
  }, [myAttempts, series]);

  const myTotalScore = useMemo(() => {
    if (myAttempts.length === 0) return 0;
    const total = myAttempts.reduce((sum, a) => sum + a.percentage, 0);
    return Math.round(total / myAttempts.length);
  }, [myAttempts]);

  const topScorers = useMemo(() => {
    const userScores = {};
    allAttempts.forEach(attempt => {
      if (!userScores[attempt.user_id]) {
        userScores[attempt.user_id] = {
          user_name: attempt.user_name,
          total: 0,
          count: 0
        };
      }
      userScores[attempt.user_id].total += attempt.percentage;
      userScores[attempt.user_id].count += 1;
    });

    return Object.values(userScores)
      .map(user => ({
        ...user,
        average: Math.round(user.total / user.count)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [allAttempts]);

  const filteredQuizzes = useMemo(() => {
    if (selectedTab === "all") return quizzes;
    if (selectedTab === "completed") {
      const completedIds = myAttempts.map(a => a.quiz_id);
      return quizzes.filter(q => completedIds.includes(q.id));
    }
    if (selectedTab === "pending") {
      const completedIds = myAttempts.map(a => a.quiz_id);
      return quizzes.filter(q => !completedIds.includes(q.id));
    }
    return quizzes;
  }, [quizzes, myAttempts, selectedTab]);

  const getMyBestScore = (quizId) => {
    const attempts = myAttempts.filter(a => a.quiz_id === quizId);
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map(a => a.percentage));
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">الاختبارات التفاعلية</h1>
          <p className="text-lg text-gray-600">اختبر معلوماتك وتنافس مع الآخرين</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">متوسط درجاتك</p>
                  <p className="text-3xl font-bold text-gray-900">{myTotalScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">اختبارات مكتملة</p>
                  <p className="text-3xl font-bold text-gray-900">{myAttempts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-10 h-10 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">اختبارات متاحة</p>
                  <p className="text-3xl font-bold text-gray-900">{quizzes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">ترتيبك</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {topScorers.findIndex(s => s.user_name === user?.full_name) + 1 || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-8">
          <TabsList className="grid w-full md:w-[500px] grid-cols-3">
            <TabsTrigger value="all">جميع الاختبارات</TabsTrigger>
            <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
            <TabsTrigger value="completed">مكتملة</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuizzes.map((quiz) => {
                const bestScore = getMyBestScore(quiz.id);
                return (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-2 border-purple-100 hover:shadow-xl transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                          <Badge className={difficultyColors[quiz.difficulty]}>
                            {quiz.difficulty}
                          </Badge>
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-600">الأسئلة</p>
                            <p className="font-bold text-lg">{quiz.total_questions}</p>
                          </div>
                          {quiz.time_limit_minutes && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-gray-600">الوقت</p>
                              <p className="font-bold text-lg">{quiz.time_limit_minutes} د</p>
                            </div>
                          )}
                        </div>

                        {bestScore !== null && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                            <p className="text-sm text-green-700 mb-1">أفضل نتيجة لك</p>
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-green-600" />
                              <p className="text-2xl font-bold text-green-900">{bestScore}%</p>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => navigate(createPageUrl(`TakeQuiz?id=${quiz.id}`))}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {bestScore !== null ? "إعادة المحاولة" : "ابدأ الاختبار"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="border-2 border-yellow-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                المتصدرون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topScorers.map((scorer, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{scorer.user_name}</p>
                        <p className="text-xs text-gray-600">{scorer.count} اختبار</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{scorer.average}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                درجاتك حسب السلسلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mySeriesScores.length > 0 ? (
                  mySeriesScores.map((seriesScore, index) => (
                    <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{seriesScore.series_name}</p>
                        <p className="text-2xl font-bold text-purple-600">{seriesScore.average}%</p>
                      </div>
                      <p className="text-xs text-gray-600">{seriesScore.attempts} اختبار مكتمل</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">لم تكمل أي اختبارات بعد</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}