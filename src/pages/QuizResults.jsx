import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuizResults() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const attemptId = urlParams.get('attempt_id');

  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['quizAttempt', attemptId],
    queryFn: async () => {
      const attempts = await base44.entities.QuizAttempt.filter({ id: attemptId });
      return attempts[0];
    },
    enabled: !!attemptId,
  });

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ['quizForResults', attempt?.quiz_id],
    queryFn: async () => {
      const quizzes = await base44.entities.Quiz.filter({ id: attempt.quiz_id });
      return quizzes[0];
    },
    enabled: !!attempt?.quiz_id,
  });

  if (attemptLoading || quizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جارٍ تحميل النتائج...</p>
        </div>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              نتيجة غير موجودة
            </h2>
            <p className="text-gray-600 mb-6">
              لم يتم العثور على النتيجة المطلوبة
            </p>
            <Button onClick={() => navigate(createPageUrl("Quizzes"))}>
              العودة للاختبارات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const correctAnswers = attempt.answers.filter((answer, index) => 
    answer === quiz.questions[index].correct_answer
  ).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-4 mb-8 ${attempt.passed ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'}`}>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                {attempt.passed ? (
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <CardTitle className="text-3xl mb-2">
                {attempt.passed ? "مبروك! لقد نجحت" : "للأسف، لم تنجح"}
              </CardTitle>
              <p className="text-lg text-gray-700">{quiz.title}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 text-center shadow-md">
                  <p className="text-sm text-gray-600 mb-1">الدرجة</p>
                  <p className={`text-3xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {attempt.score}%
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-md">
                  <p className="text-sm text-gray-600 mb-1">إجابات صحيحة</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {correctAnswers}/{quiz.questions.length}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-md">
                  <p className="text-sm text-gray-600 mb-1">الوقت المستغرق</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.floor((attempt.time_taken_seconds || 0) / 60)}د
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-md">
                  <p className="text-sm text-gray-600 mb-1">النسبة المطلوبة</p>
                  <p className="text-3xl font-bold text-gray-600">
                    {quiz.passing_score}%
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(createPageUrl(`TakeQuiz?quiz_id=${quiz.id}`))}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  إعادة الاختبار
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("Quizzes"))}
                  variant="outline"
                >
                  العودة للاختبارات
                </Button>
              </div>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">مراجعة الأسئلة</h2>

          <div className="space-y-6">
            {quiz.questions.map((question, index) => {
              const userAnswer = attempt.answers[index];
              const isCorrect = userAnswer === question.correct_answer;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`border-2 ${isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">السؤال {index + 1}</Badge>
                            {isCorrect ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                صحيح
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3 mr-1" />
                                خطأ
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{question.question}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => {
                          const isUserAnswer = userAnswer === optionIndex;
                          const isCorrectAnswer = question.correct_answer === optionIndex;

                          let className = "p-4 rounded-lg border-2 ";
                          if (isCorrectAnswer) {
                            className += "bg-green-50 border-green-300";
                          } else if (isUserAnswer && !isCorrect) {
                            className += "bg-red-50 border-red-300";
                          } else {
                            className += "bg-gray-50 border-gray-200";
                          }

                          return (
                            <div key={optionIndex} className={className}>
                              <div className="flex items-center justify-between">
                                <p className="font-medium">{option}</p>
                                {isCorrectAnswer && (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {question.explanation && (
                        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            💡 الشرح:
                          </p>
                          <p className="text-sm text-blue-800">{question.explanation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}