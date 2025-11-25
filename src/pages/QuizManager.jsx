import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileQuestion, Plus, Edit, Trash2, Sparkles, Loader2, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function QuizManager() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    recording_id: "",
    series_id: "",
    questions: [],
    passing_score: 70
  });
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [selectedRecordingForGen, setSelectedRecordingForGen] = useState("");

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => base44.entities.Quiz.list("-created_date"),
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['recordingsForQuiz'],
    queryFn: () => base44.entities.Recording.list("-created_date"),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['seriesForQuiz'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['quizAttempts'],
    queryFn: () => base44.entities.QuizAttempt.list("-created_date"),
  });

  const createQuizMutation = useMutation({
    mutationFn: (data) => base44.entities.Quiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setShowDialog(false);
      resetForm();
      alert('✅ تم إنشاء الاختبار بنجاح');
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quiz.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setShowDialog(false);
      setEditingQuiz(null);
      resetForm();
      alert('✅ تم تحديث الاختبار بنجاح');
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      alert('✅ تم حذف الاختبار بنجاح');
    },
  });

  const handleGenerateQuestions = async () => {
    if (!selectedRecordingForGen) {
      alert('يرجى اختيار تسجيل أولاً');
      return;
    }

    setGeneratingQuestions(true);
    try {
      const response = await base44.functions.invoke('generateQuizQuestions', {
        recording_id: selectedRecordingForGen,
        num_questions: 5
      });

      if (response.data.success) {
        setQuizData(prev => ({
          ...prev,
          recording_id: selectedRecordingForGen,
          questions: response.data.questions
        }));
        alert('✅ تم توليد الأسئلة بنجاح!');
      }
    } catch (error) {
      alert('فشل توليد الأسئلة: ' + error.message);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const resetForm = () => {
    setQuizData({
      title: "",
      description: "",
      recording_id: "",
      series_id: "",
      questions: [],
      passing_score: 70
    });
    setSelectedRecordingForGen("");
  };

  const handleSaveQuiz = () => {
    if (!quizData.title || quizData.questions.length === 0) {
      alert('يرجى إدخال العنوان والأسئلة');
      return;
    }

    if (editingQuiz) {
      updateQuizMutation.mutate({ id: editingQuiz.id, data: quizData });
    } else {
      createQuizMutation.mutate(quizData);
    }
  };

  const openEditDialog = (quiz) => {
    setEditingQuiz(quiz);
    setQuizData(quiz);
    setShowDialog(true);
  };

  const addQuestion = () => {
    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, {
        question: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        explanation: ""
      }]
    }));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...quizData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuizData({ ...quizData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const getQuizStats = (quizId) => {
    const quizAttempts = attempts.filter(a => a.quiz_id === quizId);
    return {
      total: quizAttempts.length,
      passed: quizAttempts.filter(a => a.passed).length,
      avgScore: quizAttempts.length > 0 
        ? (quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length).toFixed(1)
        : 0
    };
  };

  if (user?.role !== 'admin' && user?.custom_role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-gray-600">هذه الصفحة متاحة للمشرفين فقط</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">إدارة الاختبارات</h1>
            <p className="text-gray-600">إنشاء وإدارة اختبارات المحتوى</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingQuiz(null);
              setShowDialog(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2 w-full md:w-auto"
          >
            <Plus className="w-5 h-5" />
            إنشاء اختبار جديد
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const stats = getQuizStats(quiz.id);
            const recording = recordings.find(r => r.id === quiz.recording_id);
            
            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-2 border-purple-100 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2 line-clamp-2">{quiz.title}</CardTitle>
                        {recording && (
                          <p className="text-sm text-gray-600">📻 {recording.title}</p>
                        )}
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 flex-shrink-0">
                        {quiz.questions.length} سؤال
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <p className="font-bold text-blue-900">{stats.total}</p>
                        <p className="text-xs text-blue-600">محاولة</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <Trophy className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <p className="font-bold text-green-900">{stats.passed}</p>
                        <p className="text-xs text-green-600">ناجح</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="font-bold text-orange-900 text-lg">{stats.avgScore}%</p>
                        <p className="text-xs text-orange-600">المعدل</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => openEditDialog(quiz)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-2 gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        تعديل
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm(`هل تريد حذف الاختبار "${quiz.title}"؟`)) {
                            deleteQuizMutation.mutate(quiz.id);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-2 text-red-600 gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuiz ? 'تعديل الاختبار' : 'إنشاء اختبار جديد'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان الاختبار *</Label>
                  <Input
                    value={quizData.title}
                    onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                    placeholder="مثال: اختبار تفسير سورة البقرة"
                  />
                </div>

                <div className="space-y-2">
                  <Label>نسبة النجاح %</Label>
                  <Input
                    type="number"
                    value={quizData.passing_score}
                    onChange={(e) => setQuizData({ ...quizData, passing_score: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  placeholder="وصف الاختبار..."
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>التسجيل المرتبط</Label>
                  <Select
                    value={quizData.recording_id || "none"}
                    onValueChange={(value) => {
                      setQuizData({ ...quizData, recording_id: value === "none" ? "" : value });
                      setSelectedRecordingForGen(value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر تسجيل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون تسجيل</SelectItem>
                      {recordings.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>السلسلة (اختياري)</Label>
                  <Select
                    value={quizData.series_id || "none"}
                    onValueChange={(value) => setQuizData({ ...quizData, series_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سلسلة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون سلسلة</SelectItem>
                      {series.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-purple-900 mb-1">توليد أسئلة بالذكاء الاصطناعي</h4>
                    <p className="text-sm text-purple-700">يمكنك توليد أسئلة تلقائياً من محتوى التسجيل</p>
                  </div>
                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={!selectedRecordingForGen || generatingQuestions}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2 w-full md:w-auto"
                  >
                    {generatingQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جارٍ التوليد...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        توليد الأسئلة
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-bold">الأسئلة ({quizData.questions.length})</Label>
                  <Button onClick={addQuestion} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة سؤال يدوياً
                  </Button>
                </div>

                {quizData.questions.map((q, qIndex) => (
                  <Card key={qIndex} className="border-2 border-gray-200">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <Label className="text-base font-bold">سؤال {qIndex + 1}</Label>
                        <Button
                          onClick={() => removeQuestion(qIndex)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <Input
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        placeholder="نص السؤال..."
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={q.correct_answer === oIndex}
                              onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                              className="text-green-600"
                            />
                            <Input
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...q.options];
                                newOptions[oIndex] = e.target.value;
                                updateQuestion(qIndex, 'options', newOptions);
                              }}
                              placeholder={`الخيار ${oIndex + 1}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>

                      <Input
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                        placeholder="شرح الإجابة الصحيحة (اختياري)"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSaveQuiz}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
                disabled={createQuizMutation.isPending || updateQuizMutation.isPending}
              >
                {editingQuiz ? 'حفظ التعديلات' : 'إنشاء الاختبار'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}