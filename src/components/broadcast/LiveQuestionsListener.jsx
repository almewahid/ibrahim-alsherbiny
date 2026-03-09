import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Send, CheckCircle, Star, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveQuestionsListener({ broadcastId, user }) {
  const queryClient = useQueryClient();
  const [questionText, setQuestionText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ["live-questions", broadcastId],
    queryFn: () => base44.entities.LiveQuestion.filter({ broadcast_id: broadcastId }),
    refetchInterval: 3000,
    enabled: !!broadcastId,
  });

  const highlighted = questions.find(q => q.is_highlighted);

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.LiveQuestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-questions", broadcastId] });
      setQuestionText("");
      setShowForm(false);
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, votes }) => base44.entities.LiveQuestion.update(id, { votes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-questions", broadcastId] }),
  });

  const handleSubmit = () => {
    if (!questionText.trim() || !user) return;
    submitMutation.mutate({
      broadcast_id: broadcastId,
      user_id: user.id,
      user_name: user.full_name || user.email,
      question_text: questionText.trim(),
      status: "pending",
      is_highlighted: false,
      votes: 0,
    });
  };

  const myQuestions = questions.filter(q => q.user_id === user?.id);

  return (
    <div className="space-y-4">
      {/* Highlighted Question Banner */}
      <AnimatePresence>
        {highlighted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4" />
              <span className="font-bold text-sm">السؤال المُبرز الآن</span>
            </div>
            <p className="font-semibold">{highlighted.question_text}</p>
            <p className="text-xs opacity-80 mt-1">من: {highlighted.user_name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Question */}
      <div className="bg-white border-2 border-purple-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-purple-600" />
            أسئلة المستمعين
          </h4>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-1"
          >
            <MessageSquarePlus className="w-4 h-4" />
            سؤال جديد
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                className="resize-none text-sm"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>إلغاء</Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!questionText.trim() || submitMutation.isPending}
                  className="gap-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-3 h-3" />
                  {submitMutation.isPending ? "جارٍ الإرسال..." : "إرسال"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Questions */}
        {myQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold">أسئلتي:</p>
            {myQuestions.map(q => (
              <div key={q.id} className="bg-purple-50 rounded-lg px-3 py-2 text-sm flex items-start justify-between gap-2">
                <p className="text-gray-800 flex-1">{q.question_text}</p>
                <Badge className={
                  q.status === "answered" ? "bg-green-100 text-green-700 shrink-0" :
                  q.status === "highlighted" ? "bg-yellow-100 text-yellow-700 shrink-0" :
                  "bg-gray-100 text-gray-600 shrink-0"
                }>
                  {q.status === "answered" ? "✅ تمت الإجابة" :
                   q.status === "highlighted" ? "🔆 مُبرز" : "⏳ بانتظار"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Pending questions with voting */}
        {questions.filter(q => q.status === "pending" && q.user_id !== user?.id).length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs text-gray-500 font-semibold">أسئلة أخرى - صوّت لأهمها:</p>
            {questions
              .filter(q => q.status === "pending" && q.user_id !== user?.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0))
              .slice(0, 5)
              .map(q => (
                <div key={q.id} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-700 flex-1">{q.question_text}</p>
                  <button
                    onClick={() => voteMutation.mutate({ id: q.id, votes: (q.votes || 0) + 1 })}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 shrink-0"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    {q.votes || 0}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}