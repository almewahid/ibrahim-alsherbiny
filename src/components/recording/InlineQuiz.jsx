import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Trophy, XCircle, CheckCircle2, Users, ChevronDown, ChevronUp } from "lucide-react";

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];

// مفتاح التخزين المحلي لحفظ نتيجة الاختبار
const getAttemptKey = (quizId, userId) => `quiz_attempt_${quizId}_${userId}`;

export default function InlineQuiz({ recordingId, broadcastId, user }) {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const { data: quizzes = [] } = useQuery({
    queryKey: ["inline-quiz", recordingId, broadcastId],
    queryFn: async () => {
      const results = [];
      if (recordingId) {
        const r = await base44.entities.Quiz.filter({ recording_id: recordingId, is_active: true });
        results.push(...r);
      }
      if (broadcastId && results.length === 0) {
        const r = await base44.entities.Quiz.filter({ broadcast_id: broadcastId, is_active: true });
        results.push(...r);
      }
      return results;
    },
    enabled: !!(recordingId || broadcastId),
  });

  const quiz = quizzes[0];

  // تحقق من وجود نتيجة محفوظة مسبقاً
  useEffect(() => {
    if (!quiz || !user) return;
    const key = getAttemptKey(quiz.id, user.id);
    const stored = localStorage.getItem(key);
    if (stored) {
      setSavedResult(JSON.parse(stored));
    }
  }, [quiz, user]);

  // جلب نتائج الاختبار للأدمن
  const { data: allAttempts = [] } = useQuery({
    queryKey: ["quiz-attempts-admin", quiz?.id],
    queryFn: () => base44.entities.QuizAttempt.filter({ quiz_id: quiz.id }),
    enabled: !!quiz?.id && user?.role === 'admin',
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizAttempt.create(data),
  });

  if (!quiz) return null;

  const questions = quiz.questions || [];

  const handleAnswer = (idx) => {
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    if (currentQ + 1 >= questions.length) {
      const correct = newAnswers.filter((a, i) => a === questions[i].correct_answer).length;
      const score = Math.round((correct / questions.length) * 100);
      const passed = score >= (quiz.passing_score || 70);
      const result = { score, passed, correct, total: questions.length, answers: newAnswers, quiz_id: quiz.id };

      if (user) {
        saveMutation.mutate({
          quiz_id: quiz.id,
          user_id: user.id,
          user_name: user.full_name || user.email,
          answers: newAnswers,
          score,
          passed,
          completed_at: new Date().toISOString(),
        });
        // حفظ محلياً لمنع التكرار
        const key = getAttemptKey(quiz.id, user.id);
        localStorage.setItem(key, JSON.stringify(result));
        setSavedResult(result);
      }
      setFinished(true);
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  const correctCount = answers.filter((a, i) => a === questions[i]?.correct_answer).length;
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = score >= (quiz.passing_score || 70);

  // نتيجة محفوظة مسبقاً - تظهر بدلاً من الاختبار
  if (savedResult && !finished) {
    return (
      <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6">
        <div className="text-center mb-4">
          {savedResult.passed
            ? <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
            : <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          }
          <h3 className="text-xl font-bold mb-1">{quiz.title}</h3>
          <p className="text-sm text-gray-500 mb-3">لقد أجريت هذا الاختبار مسبقاً</p>
          <p className="text-4xl font-bold text-indigo-600 mb-1">{savedResult.score}%</p>
          <Badge className={savedResult.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
            {savedResult.passed ? "ناجح ✓" : "لم تنجح"}
          </Badge>
          <p className="text-gray-500 text-sm mt-2">{savedResult.correct} من {savedResult.total} إجابات صحيحة</p>
        </div>

        {/* نتائج الطلاب للأدمن */}
        {user?.role === 'admin' && (
          <AdminResults attempts={allAttempts} questions={questions} showResults={showResults} setShowResults={setShowResults} />
        )}
      </div>
    );
  }

  if (!started) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-2xl p-6">
        <div className="text-center">
          <FileQuestion className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-1">{quiz.title}</h3>
          <p className="text-gray-500 text-sm mb-4">{questions.length} سؤال • درجة النجاح {quiz.passing_score || 70}%</p>
          <Button onClick={() => setStarted(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 gap-2">
            <FileQuestion className="w-4 h-4" /> ابدأ الاختبار
          </Button>
        </div>
        {user?.role === 'admin' && (
          <AdminResults attempts={allAttempts} questions={questions} showResults={showResults} setShowResults={setShowResults} />
        )}
      </div>
    );
  }

  if (finished) {
    return (
      <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6">
        <div className="text-center mb-6">
          {passed
            ? <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
            : <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
          }
          <h3 className="text-2xl font-bold mb-1">{passed ? "أحسنت! 🎉" : "حاول مجدداً"}</h3>
          <p className="text-4xl font-bold text-indigo-600 mb-2">{score}%</p>
          <p className="text-gray-600 mb-3">{correctCount} من {questions.length} إجابات صحيحة</p>
          <Badge className={passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
            {passed ? "ناجح ✓" : "لم تنجح"}
          </Badge>
        </div>
        <div className="space-y-3 mb-5">
          {questions.map((q, i) => (
            <div key={i} className={`p-3 rounded-xl text-sm ${answers[i] === q.correct_answer ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-start gap-2">
                {answers[i] === q.correct_answer
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold text-gray-800">{q.question}</p>
                  {answers[i] !== q.correct_answer && (
                    <p className="text-green-700 text-xs mt-1">✓ الإجابة الصحيحة: {q.options[q.correct_answer]}</p>
                  )}
                  {q.explanation && <p className="text-gray-500 text-xs mt-1 italic">{q.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {user?.role === 'admin' && (
          <AdminResults attempts={allAttempts} questions={questions} showResults={showResults} setShowResults={setShowResults} />
        )}
      </div>
    );
  }

  const q = questions[currentQ];
  return (
    <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Badge className="bg-indigo-100 text-indigo-700">سؤال {currentQ + 1} / {questions.length}</Badge>
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${(currentQ / questions.length) * 100}%` }} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-5 leading-relaxed">{q.question}</h3>
      <div className="space-y-2">
        {q.options.map((opt, idx) => (
          <button key={idx} onClick={() => handleAnswer(idx)}
            className="w-full text-right px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all font-medium text-gray-800">
            <span className="text-indigo-600 font-bold ml-2">{ARABIC_LETTERS[idx]}</span> {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdminResults({ attempts, questions, showResults, setShowResults }) {
  if (!attempts.length) return null;
  const passed = attempts.filter(a => a.passed).length;
  const avg = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);

  return (
    <div className="mt-4 border-t border-indigo-100 pt-4">
      <button
        onClick={() => setShowResults(!showResults)}
        className="w-full flex items-center justify-between text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2 hover:bg-indigo-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          نتائج الطلاب ({attempts.length} محاولة • معدل {avg}% • نجح {passed})
        </span>
        {showResults ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showResults && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {[...attempts].sort((a, b) => b.score - a.score).map(a => (
            <div key={a.id} className="flex items-center justify-between bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm">
              <span className="font-semibold text-gray-800">{a.user_name}</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${a.passed ? "text-green-600" : "text-red-500"}`}>{a.score}%</span>
                <Badge className={a.passed ? "bg-green-100 text-green-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>
                  {a.passed ? "ناجح" : "راسب"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}