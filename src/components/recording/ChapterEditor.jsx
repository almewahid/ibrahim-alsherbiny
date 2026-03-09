import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Clock, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (str) => {
  const parts = str.trim().split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(str) || 0;
};

export default function ChapterEditor({ recordingId, currentTime = 0 }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newTimeStr, setNewTimeStr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTimeStr, setEditTimeStr] = useState("");

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", recordingId],
    queryFn: () => base44.entities.VideoChapter.filter({ recording_id: recordingId }),
    enabled: !!recordingId,
  });

  const sorted = [...chapters].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VideoChapter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", recordingId] });
      setNewTitle("");
      setNewTimeStr("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VideoChapter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters", recordingId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VideoChapter.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chapters", recordingId] }),
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const ts = newTimeStr ? parseTime(newTimeStr) : Math.floor(currentTime);
    createMutation.mutate({
      recording_id: recordingId,
      title: newTitle.trim(),
      timestamp_seconds: ts,
      order: sorted.length,
    });
  };

  const handleSaveEdit = (id) => {
    updateMutation.mutate({
      id,
      data: {
        title: editTitle.trim(),
        timestamp_seconds: parseTime(editTimeStr),
      },
    });
  };

  const startEdit = (ch) => {
    setEditingId(ch.id);
    setEditTitle(ch.title);
    setEditTimeStr(formatTime(ch.timestamp_seconds));
  };

  // Export as YouTube chapters
  const exportYoutube = () => {
    if (sorted.length === 0) return;
    const text = sorted.map(ch => `${formatTime(ch.timestamp_seconds)} ${ch.title}`).join("\n");
    navigator.clipboard.writeText(text);
    alert("✅ تم نسخ فصول YouTube إلى الحافظة!");
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          الفصول ({sorted.length})
        </h3>
        {sorted.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportYoutube} className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50">
            نسخ فصول YouTube
          </Button>
        )}
      </div>

      {/* Add New Chapter */}
      <div className="bg-purple-50 rounded-xl p-3 space-y-2 border border-purple-100">
        <p className="text-xs font-semibold text-purple-700">إضافة فصل جديد</p>
        <div className="flex gap-2">
          <Input
            placeholder="عنوان الفصل..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 text-sm h-8"
          />
          <div className="relative w-24">
            <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <Input
              placeholder={formatTime(Math.floor(currentTime))}
              value={newTimeStr}
              onChange={(e) => setNewTimeStr(e.target.value)}
              className="h-8 text-sm pr-6 text-left font-mono"
              dir="ltr"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newTitle.trim() || createMutation.isPending}
            size="sm"
            className="h-8 bg-purple-600 hover:bg-purple-700 gap-1 shrink-0"
          >
            <Plus className="w-3 h-3" />
            إضافة
          </Button>
        </div>
        <p className="text-xs text-gray-500">الوقت الحالي: {formatTime(Math.floor(currentTime))} — اتركه فارغاً لاستخدام الوقت الحالي</p>
      </div>

      {/* Chapters List */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">لا توجد فصول — أضف أول فصل أعلاه</p>
          ) : sorted.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 bg-white rounded-lg border border-purple-100 px-3 py-2 group hover:border-purple-300 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="font-mono text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded shrink-0 min-w-[48px] text-center">
                {formatTime(ch.timestamp_seconds)}
              </span>

              {editingId === ch.id ? (
                <>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 h-7 text-sm"
                    autoFocus
                  />
                  <Input
                    value={editTimeStr}
                    onChange={(e) => setEditTimeStr(e.target.value)}
                    className="w-20 h-7 text-sm font-mono"
                    dir="ltr"
                  />
                  <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleSaveEdit(ch.id)}>حفظ</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>إلغاء</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800 truncate">{ch.title}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600" onClick={() => startEdit(ch)}>تعديل</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(ch.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}