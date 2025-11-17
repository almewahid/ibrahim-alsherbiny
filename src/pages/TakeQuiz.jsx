import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle, Award, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TakeQuiz() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
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

  const { data: quiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const quizzes = await base44.entities.Quiz.filter({ id: quizId });
      return quizzes[0];
    },
    enabled: !!quizId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', quizId],
    queryFn: () => base44.entities.QuizQuestion.filter({ quiz_id: quizId }),
    enabled: !!quizId,
  });

  useEffect(() => {
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const submitAttemptMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizAttempt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myQuizAttempts'] });
      queryClient.invalidateQueries({ queryKey: ['allQuizAttempts'] });
    },
  });

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    const correctAnswers = {};
    const userAnswers = [];
    let score = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points || 1;
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correct_answer;
      
      correctAnswers[q.id] = {
        correct: q.correct_answer,
        explanation: q.explanation
      };

      userAnswers.push({
        question_id: q.id,
        user_answer: userAnswer || "",
        is_correct: isCorrect
      });

      if (isCorrect) {
        score += q.points || 1;
      }
    });

    const percentage = Math.round((score / totalPoints) * 100);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const passed = percentage >= (quiz.passing_score || 60);

    const attemptData = {
      quiz_id: quizId,
      series_id: quiz.series_id || null,
      user_id: user.id,
      user_name: user.full_name || user.email,
      score: score,
      total_points: totalPoints,
      percentage: percentage,
      answers: userAnswers,
      time_taken_seconds: timeTaken,
      passed: passed,
      completed_at: new Date().toISOString()
    };

    await submitAttemptMutation.mutateAsync(attemptData);

    setResults({
      score,
      totalPoints,
      percentage,
      passed,
      correctAnswers
    });
    setShowResults(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="border-2 border-purple-100">
              <CardHeader className="text-center">
                <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  results.passed ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {results.passed ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-600" />
                  )}
                </div>
                <CardTitle className="text-3xl mb-2">
                  {results.passed ? "🎉 مبروك! نجحت في الاختبار" : "حاول مرة أخرى"}
                </CardTitle>
                <p className="text-gray-600">
                  {results.passed 
                    ? "أحسنت! لقد أظهرت فهماً جيداً للمادة"
                    : "لا تقلق، يمكنك إعادة المحاولة"}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 text-center border-2 border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">درجتك</p>
                    <p className="text-4xl font-bold text-purple-600">
                      {results.score}/{results.totalPoints}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 text-center border-2 border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">النسبة المئوية</p>
                    <p className="text-4xl font-bold text-blue-600">{results.percentage}%</p>
                  </div>
                  <div className={`rounded-xl p-6 text-center border-2 ${
                    results.passed 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                      : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                  }`}>
                    <p className="text-sm text-gray-600 mb-2">النتيجة</p>
                    <p className={`text-2xl font-bold ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {results.passed ? "ناجح" : "راسب"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold">مراجعة الإجابات</h3>
                  {questions.map((q, index) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer === q.correct_answer;
                    return (
                      <Card key={q.id} className={`border-2 ${
                        isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3 mb-3">
                            {isCorrect ? (
                              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-600 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold mb-2">
                                {index + 1}. {q.question_text}
                              </p>
                              <p className="text-sm mb-1">
                                <span className="font-semibold">إجابتك:</span> {userAnswer || "لم تجب"}
                              </p>
                              {!isCorrect && (
                                <p className="text-sm text-green-700 mb-2">
                                  <span className="font-semibold">الإجابة الصحيحة:</span> {q.correct_answer}
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-sm text-gray-600 mt-2 bg-white/50 p-2 rounded">
                                  💡 {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => navigate(createPageUrl("Quizzes"))}
                    variant="outline"
                    className="flex-1"
                  >
                    العودة للاختبارات
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            {timeLeft !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>السؤال {currentQuestion + 1} من {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl">{question.question_text}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options?.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 space-x-reverse p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-purple-50 ${
                        answers[question.id] === option
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200'
                      }`}
                      onClick={() => handleAnswerChange(question.id, option)}
                    >
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer text-base"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex gap-4 pt-4">
                  {currentQuestion > 0 && (
                    <Button
                      onClick={() => setCurrentQuestion(currentQuestion - 1)}
                      variant="outline"
                      className="flex-1"
                    >
                      السابق
                    </Button>
                  )}
                  
                  {currentQuestion < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      التالي
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                      disabled={Object.keys(answers).length < questions.length}
                    >
                      إنهاء الاختبار
                      <CheckCircle className="w-4 h-4 mr-2" />
                    </Button>
                  )}
                </div>

                {currentQuestion === questions.length - 1 && Object.keys(answers).length < questions.length && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertDescription className="text-yellow-800">
                      ⚠️ يرجى الإجابة على جميع الأسئلة قبل الإنهاء
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}