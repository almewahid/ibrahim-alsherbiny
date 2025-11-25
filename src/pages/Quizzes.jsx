import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileQuestion, Star, Clock, CheckCircle, XCircle, Trophy, Layers, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Quizzes() {
  const navigate = useNavigate();
  const [selectedSeries, setSelectedSeries] = useState("all");
  const [filterType, setFilterType] = useState("all");
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
    queryKey: ['quizzesPage'],
    queryFn: () => base44.entities.Quiz.filter({ is_active: true }),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['seriesForQuizzes'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['myQuizAttempts', user?.id],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_id: user.id }),
    enabled: !!user?.id,
  });

  const filteredQuizzes = useMemo(() => {
    let result = quizzes;

    if (selectedSeries !== "all") {
      result = result.filter(q => q.series_id === selectedSeries);
    }

    if (filterType === "featured") {
      result = result.filter(q => q.is_featured);
    } else if (filterType === "completed") {
      const completedIds = attempts.map(a => a.quiz_id);
      result = result.filter(q => completedIds.includes(q.id));
    } else if (filterType === "pending") {
      const completedIds = attempts.map(a => a.quiz_id);
      result = result.filter(q => !completedIds.includes(q.id));
    }

    return result;
  }, [quizzes, selectedSeries, filterType, attempts]);

  const groupedQuizzes = useMemo(() => {
    const grouped = {};
    const withoutSeries = [];

    filteredQuizzes.forEach(quiz => {
      if (quiz.series_id) {
        if (!grouped[quiz.series_id]) {
          grouped[quiz.series_id] = [];
        }
        grouped[quiz.series_id].push(quiz);
      } else {
        withoutSeries.push(quiz);
      }
    });

    return { grouped, withoutSeries };
  }, [filteredQuizzes]);

  const getQuizAttempt = (quizId) => {
    return attempts.find(a => a.quiz_id === quizId);
  };

  const featuredQuizzes = quizzes.filter(q => q.is_featured && q.is_active);

  const stats = {
    total: quizzes.length,
    completed: [...new Set(attempts.map(a => a.quiz_id))].length,
    passed: attempts.filter(a => a.passed).length,
    avgScore: attempts.length > 0 ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : 0
  };

  const QuizCard = ({ quiz }) => {
    const attempt = getQuizAttempt(quiz.id);
    const seriesInfo = series.find(s => s.id === quiz.series_id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-purple-100 hover:shadow-xl transition-all">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {quiz.is_featured && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Star className="w-3 h-3 mr-1" />
                      مميز
                    </Badge>
                  )}
                  {attempt && (
                    <Badge className={attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {attempt.passed ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {attempt.passed ? "ناجح" : "راسب"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{quiz.title}</CardTitle>
                {quiz.description && (
                  <p className="text-sm text-gray-600 mt-2">{quiz.description}</p>
                )}
              </div>
              <FileQuestion className="w-8 h-8 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {seriesInfo && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Layers className="w-4 h-4" />
                <span>{seriesInfo.title}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-blue-600 font-semibold">{quiz.questions.length} سؤال</p>
              </div>
              {quiz.time_limit_minutes && (
                <div className="bg-orange-50 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <p className="text-orange-600 font-semibold">{quiz.time_limit_minutes} دقيقة</p>
                </div>
              )}
            </div>

            {attempt && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-100">
                <p className="text-sm text-gray-700 mb-2">آخر محاولة:</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-purple-700">{attempt.score}%</p>
                  <Button
                    onClick={() => navigate(createPageUrl(`QuizResults?attempt_id=${attempt.id}`))}
                    variant="outline"
                    size="sm"
                  >
                    عرض النتيجة
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate(createPageUrl(`TakeQuiz?quiz_id=${quiz.id}`))}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {attempt ? "إعادة الاختبار" : "بدء الاختبار"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
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
            <FileQuestion className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            الاختبارات
          </h1>
          <p className="text-lg text-gray-600">
            اختبر معرفتك وتتبع تقدمك في المحاضرات
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 max-w-4xl mx-auto">
            <Card className="bg-white border-2 border-purple-100">
              <CardContent className="pt-4 text-center">
                <FileQuestion className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">إجمالي الاختبارات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-2 border-blue-100">
              <CardContent className="pt-4 text-center">
                <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">اختبارات مكتملة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-2 border-green-100">
              <CardContent className="pt-4 text-center">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">اختبارات ناجحة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.passed}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-2 border-yellow-100">
              <CardContent className="pt-4 text-center">
                <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">متوسط الدرجات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgScore}%</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {featuredQuizzes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">الاختبارات المميزة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredQuizzes.map(quiz => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={filterType} onValueChange={setFilterType} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="pending">لم يُحل</TabsTrigger>
                <TabsTrigger value="completed">مكتمل</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="جميع السلاسل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع السلاسل</SelectItem>
                {series.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-8">
          {Object.keys(groupedQuizzes.grouped).map(seriesId => {
            const seriesInfo = series.find(s => s.id === seriesId);
            const seriesQuizzes = groupedQuizzes.grouped[seriesId];
            const seriesAttempts = attempts.filter(a => {
              const quiz = quizzes.find(q => q.id === a.quiz_id);
              return quiz && quiz.series_id === seriesId;
            });
            const avgSeriesScore = seriesAttempts.length > 0 
              ? Math.round(seriesAttempts.reduce((sum, a) => sum + a.score, 0) / seriesAttempts.length)
              : 0;

            return (
              <div key={seriesId}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {seriesInfo?.title || "سلسلة"}
                    </h2>
                    <Badge className="bg-purple-100 text-purple-700">
                      {seriesQuizzes.length} اختبار
                    </Badge>
                  </div>
                  {avgSeriesScore > 0 && (
                    <div className="bg-purple-50 rounded-lg px-4 py-2">
                      <p className="text-sm text-gray-600">متوسط الدرجات</p>
                      <p className="text-xl font-bold text-purple-700">{avgSeriesScore}%</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {seriesQuizzes.map(quiz => (
                    <QuizCard key={quiz.id} quiz={quiz} />
                  ))}
                </div>
              </div>
            );
          })}

          {groupedQuizzes.withoutSeries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">اختبارات أخرى</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {groupedQuizzes.withoutSeries.map(quiz => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            </div>
          )}
        </div>

        {filteredQuizzes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto border-2 border-purple-100">
              <CardContent className="pt-12 pb-12">
                <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  لا توجد اختبارات
                </h3>
                <p className="text-gray-600">
                  لا توجد اختبارات متاحة في الوقت الحالي
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}