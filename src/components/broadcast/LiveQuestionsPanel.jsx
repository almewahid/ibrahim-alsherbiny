import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, CheckCircle, Trash2, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveQuestionsPanel({ broadcastId }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");

  const { data: questions = [] } = useQuery({
    queryKey: ["live-questions", broadcastId],
    queryFn: () => base44.entities.LiveQuestion.filter({ broadcast_id: broadcastId }),
    refetchInterval: 3000,
    enabled: !!broadcastId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LiveQuestion.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-questions", broadcastId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LiveQuestion.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["live-questions", broadcastId] }),
  });

  const highlightQuestion = (question) => {
    // Remove highlight from all others first
    questions.filter(q => q.is_highlighted).forEach(q => {
      updateMutation.mutate({ id: q.id, data: { is_highlighted: false, status: "pending" } });
    });
    // Highlight this one
    updateMutation.mutate({ id: question.id, data: { is_highlighted: true, status: "highlighted" } });
  };

  const unhighlightQuestion = (id) => {
    updateMutation.mutate({ id, data: { is_highlighted: false, status: "pending" } });
  };

  const markAnswered = (id) => {
    updateMutation.mutate({ id, data: { status: "answered", is_highlighted: false } });
  };

  const filtered = questions
    .filter(q => filter === "all" ? true : q.status === filter)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const counts = {
    pending: questions.filter(q => q.status === "pending").length,
    highlighted: questions.filter(q => q.status === "highlighted").length,
    answered: questions.filter(q => q.status === "answered").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-gray-900">أسئلة المستمعين ({questions.length})</h3>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {[
          { key: "pending", label: "بانتظار", count: counts.pending },
          { key: "highlighted", label: "مُبرز", count: counts.highlighted },
          { key: "answered", label: "أُجيب عليه", count: counts.answered },
          { key: "all", label: "الكل", count: questions.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === tab.key
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label} {tab.count > 0 && <span className="mr-1">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد أسئلة
            </div>
          ) : filtered.map(q => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-xl p-3 border-2 transition-all ${
                q.is_highlighted
                  ? "bg-yellow-50 border-yellow-300"
                  : q.status === "answered"
                  ? "bg-green-50 border-green-200 opacity-70"
                  : "bg-white border-purple-100"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-purple-700">{q.user_name}</span>
                    {q.votes > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-500">
                        <ThumbsUp className="w-3 h-3" />{q.votes}
                      </span>
                    )}
                    {q.is_highlighted && (
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs px-1 py-0">مُبرز</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{q.question_text}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {q.status !== "answered" && !q.is_highlighted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={() => highlightQuestion(q)}
                    >
                      <Star className="w-3 h-3" />
                      إبراز
                    </Button>
                  )}
                  {q.is_highlighted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => unhighlightQuestion(q.id)}
                    >
                      إلغاء الإبراز
                    </Button>
                  )}
                  {q.status !== "answered" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => markAnswered(q.id)}
                    >
                      <CheckCircle className="w-3 h-3" />
                      تمت
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(q.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}