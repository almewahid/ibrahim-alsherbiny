
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles, Loader2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox"; // New import

export default function QuizManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    series_id: "",
    difficulty: "متوسط",
    time_limit_minutes: 10,
    passing_score: 60
  });
  const [generatingQuiz, setGeneratingQuiz] = useState(null);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // New state variables
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionData, setQuestionData] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: ""
  });
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [filterRecording, setFilterRecording] = useState("all");
  const [filterSeries, setFilterSeries] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  const { data: quizzes = [] } = useQuery({
    queryKey: ['allQuizzes'],
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

  const { data: questions = [] } = useQuery({
    queryKey: ['quizQuestions', selectedQuizId],
    queryFn: () => base44.entities.QuizQuestion.filter({ quiz_id: selectedQuizId }),
    enabled: !!selectedQuizId,
  });

  const createQuizMutation = useMutation({
    mutationFn: (data) => base44.entities.Quiz.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });
      setShowDialog(false);
      resetForm();
      alert('✅ تم إنشاء الاختبار بنجاح');
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quiz.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });
      setShowDialog(false);
      resetForm();
      alert('✅ تم تحديث الاختبار بنجاح');
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id) => base44.entities.Quiz.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });
      alert('✅ تم حذف الاختبار بنجاح');
    },
  });

  // New mutations for questions
  const createQuestionMutation = useMutation({
    mutationFn: (data) => base44.entities.QuizQuestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizQuestions', selectedQuizId] });
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] }); // Invalidate all quizzes to update total_questions count
      setShowQuestionDialog(false);
      alert('✅ تم إضافة السؤال');
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuizQuestion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizQuestions', selectedQuizId] });
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] }); // Invalidate all quizzes to update total_questions count
      setShowQuestionDialog(false);
      alert('✅ تم تحديث السؤال');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => base44.entities.QuizQuestion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizQuestions', selectedQuizId] });
      queryClient.invalidateQueries({ queryKey: ['allQuizzes'] }); // Invalidate all quizzes to update total_questions count
      alert('✅ تم حذف السؤال');
    },
  });

  const handleGenerateQuiz = async (recording) => {
    if (!confirm(`هل تريد توليد اختبار تلقائياً لـ "${recording.title}"؟`)) return;

    setGeneratingQuiz(recording.id);
    try {
      const response = await base44.functions.invoke('generateQuiz', {
        recording_id: recording.id,
        series_id: recording.series_id,
        num_questions: 10,
        difficulty: "متوسط"
      });

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        queryClient.invalidateQueries({ queryKey: ['allQuizzes'] });
      }
    } catch (error) {
      alert('فشل توليد الاختبار: ' + error.message);
    } finally {
      setGeneratingQuiz(null);
    }
  };

  // Filtered quizzes logic
  const filteredQuizzes = quizzes.filter(quiz => {
    const recordingMatch = filterRecording === "all" || quiz.recording_id === filterRecording;
    const seriesMatch = filterSeries === "all" || quiz.series_id === filterSeries;
    const difficultyMatch = filterDifficulty === "all" || quiz.difficulty === filterDifficulty;
    return recordingMatch && seriesMatch && difficultyMatch;
  });

  const resetForm = () => {
    setQuizData({
      title: "",
      description: "",
      series_id: "",
      difficulty: "متوسط",
      time_limit_minutes: 10,
      passing_score: 60
    });
    setEditingQuiz(null);
  };

  const handleSave = () => {
    if (!quizData.title.trim()) {
      alert('يرجى إدخال عنوان الاختبار');
      return;
    }

    if (editingQuiz) {
      updateQuizMutation.mutate({ id: editingQuiz.id, data: quizData });
    } else {
      createQuizMutation.mutate({ ...quizData, is_active: true, is_ai_generated: false });
    }
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setQuizData({
      title: quiz.title,
      description: quiz.description || "",
      series_id: quiz.series_id || "",
      difficulty: quiz.difficulty,
      time_limit_minutes: quiz.time_limit_minutes || 10,
      passing_score: quiz.passing_score || 60
    });
    setShowDialog(true);
  };

  const handleViewQuestions = (quizId) => {
    setSelectedQuizId(quizId);
    setShowQuestionsDialog(true);
  };

  // New question handlers
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionData({ question_text: "", options: ["", "", "", ""], correct_answer: "", explanation: "" });
    setShowQuestionDialog(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionData({
      question_text: question.question_text,
      options: question.options && question.options.length === 4 ? question.options : ["", "", "", ""],
      correct_answer: question.correct_answer,
      explanation: question.explanation || ""
    });
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = () => {
    if (!questionData.question_text.trim()) {
      alert('يرجى إدخال نص السؤال');
      return;
    }
    const filteredOptions = questionData.options.filter(opt => opt.trim() !== '');
    if (filteredOptions.length < 2) {
      alert('يرجى إدخال خيارين على الأقل');
      return;
    }
    if (!questionData.correct_answer.trim()) {
      alert('يرجى تحديد الإجابة الصحيحة');
      return;
    }
    if (!questionData.options.includes(questionData.correct_answer)) {
      alert('الإجابة الصحيحة يجب أن تكون أحد الخيارات المدخلة.');
      return;
    }


    const data = {
      quiz_id: selectedQuizId,
      ...questionData,
      options: filteredOptions, // Save only non-empty options
      // order_number logic: if editing, keep existing. if new, calculate based on current questions length.
      order_number: editingQuestion ? editingQuestion.order_number : questions.length + 1
    };

    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createQuestionMutation.mutate(data);
    }
  };


  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">إدارة الاختبارات</h1>
          <Button
            onClick={() => { setShowDialog(true); resetForm(); }} // Added resetForm here
            className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
          >
            <Plus className="w-5 h-5" />
            اختبار جديد
          </Button>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select value={filterRecording} onValueChange={setFilterRecording}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية حسب التسجيل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التسجيلات</SelectItem>
              {recordings.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSeries} onValueChange={setFilterSeries}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية حسب السلسلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع السلاسل</SelectItem>
              {series.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية حسب الصعوبة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستويات</SelectItem>
              <SelectItem value="سهل">سهل</SelectItem>
              <SelectItem value="متوسط">متوسط</SelectItem>
              <SelectItem value="صعب">صعب</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="mb-8 border-2 border-blue-100">
          <CardHeader>
            <CardTitle>توليد اختبار تلقائي من التسجيلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recordings.slice(0, 6).map(recording => (
                <div key={recording.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{recording.title}</p>
                    <p className="text-sm text-gray-600">{recording.broadcaster_name}</p>
                  </div>
                  <Button
                    onClick={() => handleGenerateQuiz(recording)}
                    disabled={generatingQuiz === recording.id}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {generatingQuiz === recording.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    توليد
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                    {quiz.is_ai_generated && (
                      <Badge className="bg-purple-100 text-purple-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">الأسئلة</p>
                      <p className="font-bold">{quiz.total_questions}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-600">المحاولات</p>
                      <p className="font-bold">{quiz.total_attempts || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewQuestions(quiz.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      الأسئلة
                    </Button>
                    <Button
                      onClick={() => handleEdit(quiz)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 ml-1" />
                      تعديل
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف الاختبار "${quiz.title}"؟`)) {
                          deleteQuizMutation.mutate(quiz.id);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quiz Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuiz ? "تعديل الاختبار" : "اختبار جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الاختبار *</Label>
                <Input
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>السلسلة</Label>
                  <Select value={quizData.series_id} onValueChange={(value) => setQuizData({ ...quizData, series_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر سلسلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الصعوبة</Label>
                  <Select value={quizData.difficulty} onValueChange={(value) => setQuizData({ ...quizData, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="سهل">سهل</SelectItem>
                      <SelectItem value="متوسط">متوسط</SelectItem>
                      <SelectItem value="صعب">صعب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الوقت (دقائق)</Label>
                  <Input
                    type="number"
                    value={quizData.time_limit_minutes}
                    onChange={(e) => setQuizData({ ...quizData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>درجة النجاح (%)</Label>
                  <Input
                    type="number"
                    value={quizData.passing_score}
                    onChange={(e) => setQuizData({ ...quizData, passing_score: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-purple-500 to-pink-500">
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quiz Questions List Dialog */}
        <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
          <DialogContent dir="rtl" className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>أسئلة الاختبار</DialogTitle>
                <Button onClick={handleAddQuestion} size="sm" className="gap-2">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة سؤال
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {questions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لا توجد أسئلة لهذا الاختبار بعد. استخدم زر "إضافة سؤال" لإضافة أسئلة.</p>
              ) : (
                questions.map((q, index) => (
                  <Card key={q.id} className="border-2 border-gray-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="font-bold flex-1">
                          {index + 1}. {q.question_text}
                        </p>
                        <div className="flex gap-1">
                          <Button onClick={() => handleEditQuestion(q)} variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                                deleteQuestionMutation.mutate(q.id);
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 mb-3">
                        {q.options?.map((option, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded ${
                              option === q.correct_answer
                                ? 'bg-green-100 border-2 border-green-400'
                                : 'bg-gray-50'
                            }`}
                          >
                            {option}
                            {option === q.correct_answer && (
                              <span className="text-green-700 font-semibold mr-2">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          💡 {q.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Question Create/Edit Dialog */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>نص السؤال *</Label>
                <Input
                  value={questionData.question_text}
                  onChange={(e) => setQuestionData({ ...questionData, question_text: e.target.value })}
                  placeholder="اكتب السؤال هنا..."
                />
              </div>

              <div className="space-y-2">
                <Label>الخيارات (حدد الإجابة الصحيحة)</Label>
                {questionData.options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Checkbox
                      checked={questionData.correct_answer === option}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setQuestionData({ ...questionData, correct_answer: option });
                        } else if (questionData.correct_answer === option) {
                          setQuestionData({ ...questionData, correct_answer: "" });
                        }
                      }}
                    />
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionData.options];
                        newOptions[i] = e.target.value;

                        // If the currently edited option was the correct answer, update it too
                        if (questionData.correct_answer === option) {
                          setQuestionData(prev => ({ ...prev, options: newOptions, correct_answer: e.target.value }));
                        } else {
                          setQuestionData(prev => ({ ...prev, options: newOptions }));
                        }
                      }}
                      placeholder={`الخيار ${i + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>شرح الإجابة (اختياري)</Label>
                <Textarea
                  value={questionData.explanation}
                  onChange={(e) => setQuestionData({ ...questionData, explanation: e.target.value })}
                  placeholder="اشرح لماذا هذه الإجابة صحيحة..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>إلغاء</Button>
              <Button onClick={handleSaveQuestion} className="bg-purple-600">حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
