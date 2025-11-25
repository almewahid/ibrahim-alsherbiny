import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TakeQuiz() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const quizzes = await base44.entities.Quiz.filter({ id: quizId });
      return quizzes[0];
    },
    enabled: !!quizId,
  });

  const submitAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizAttempt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizAttempts'] });
    },
  });

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!confirm('لم تجب على جميع الأسئلة. هل تريد التسليم؟')) {
        return;
      }
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const userAnswers = quiz.questions.map((_, index) => answers[index] ?? -1);
    
    let correctCount = 0;
    quiz.questions.forEach((q, index) => {
      if (userAnswers[index] === q.correct_answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passing_score;

    const attemptData = {
      quiz_id: quizId,
      user_id: user.id,
      user_name: user.full_name,
      answers: userAnswers,
      score,
      passed,
      time_taken_seconds: timeTaken,
      completed_at: new Date().toISOString()
    };

    await submitAttemptMutation.mutateAsync(attemptData);

    setResult({
      score,
      passed,
      correctCount,
      totalQuestions: quiz.questions.length
    });
    setSubmitted(true);
  };

  if (!quizId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">اختبار غير صحيح</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">الاختبار غير موجود</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className={`border-4 ${result.passed ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50'}`}>
              <CardContent className="pt-12 pb-12 text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${result.passed ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {result.passed ? (
                    <Trophy className="w-12 h-12 text-green-600" />
                  ) : (
                    <CheckCircle className="w-12 h-12 text-orange-600" />
                  )}
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {result.passed ? '🎉 مبروك! لقد نجحت' : '💪 حاول مرة أخرى'}
                </h2>
                
                <div className="text-6xl font-bold mb-4" style={{ color: result.passed ? '#16a34a' : '#ea580c' }}>
                  {result.score}%
                </div>
                
                <p className="text-xl text-gray-700 mb-6">
                  {result.correctCount} من {result.totalQuestions} إجابة صحيحة
                </p>

                <div className="space-y-4 mt-8">
                  {quiz.questions.map((q, index) => {
                    const userAnswer = answers[index];
                    const isCorrect = userAnswer === q.correct_answer;
                    
                    return (
                      <Card key={index} className={`border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3 mb-3">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-2">{q.question}</p>
                              <div className="space-y-2 text-sm">
                                <p className="text-gray-700">
                                  ✅ الإجابة الصحيحة: <span className="font-bold text-green-700">{q.options[q.correct_answer]}</span>
                                </p>
                                {!isCorrect && userAnswer !== undefined && userAnswer !== -1 && (
                                  <p className="text-gray-700">
                                    ❌ إجابتك: <span className="font-bold text-red-700">{q.options[userAnswer]}</span>
                                  </p>
                                )}
                                {q.explanation && (
                                  <p className="text-gray-600 bg-white p-2 rounded-lg">
                                    💡 {q.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Button
                  onClick={() => navigate(createPageUrl("Recordings"))}
                  className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  العودة للتسجيلات
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-2 border-purple-100 mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">{quiz.title}</CardTitle>
                {quiz.description && (
                  <p className="text-gray-600 text-sm">{quiz.description}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-purple-100 text-purple-700">
                  {quiz.questions.length} سؤال
                </Badge>
                <Badge className="bg-green-100 text-green-700">
                  نسبة النجاح: {quiz.passing_score}%
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {quiz.questions.map((q, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <CardTitle className="text-lg">
                    <span className="text-purple-600 ml-2">س{index + 1}.</span>
                    {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {q.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onClick={() => setAnswers({ ...answers, [index]: oIndex })}
                      className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                        answers[index] === oIndex
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          answers[index] === oIndex
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {answers[index] === oIndex && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-base">{option}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleSubmit}
            className="w-full md:flex-1 h-14 text-lg bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
            disabled={submitAttemptMutation.isPending}
          >
            {submitAttemptMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            تسليم الاختبار
          </Button>
          
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-100 md:w-64 text-center">
            <p className="text-sm text-gray-600 mb-1">الأسئلة المُجاب عليها</p>
            <p className="text-2xl font-bold text-purple-900">
              {Object.keys(answers).length} / {quiz.questions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}