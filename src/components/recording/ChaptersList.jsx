import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function ChaptersList({ recordingId, currentTime = 0, onSeek }) {
  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", recordingId],
    queryFn: () => base44.entities.VideoChapter.filter({ recording_id: recordingId }),
    enabled: !!recordingId,
  });

  const sorted = [...chapters].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  if (sorted.length === 0) return null;

  // Find current active chapter
  const activeIndex = sorted.reduce((active, ch, i) => {
    return ch.timestamp_seconds <= currentTime ? i : active;
  }, 0);

  return (
    <div className="space-y-2" dir="rtl">
      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-purple-600" />
        الفصول
      </h4>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {sorted.map((ch, i) => {
          const isActive = i === activeIndex;
          const nextTs = sorted[i + 1]?.timestamp_seconds;
          const duration = nextTs ? nextTs - ch.timestamp_seconds : null;

          return (
            <motion.button
              key={ch.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSeek?.(ch.timestamp_seconds)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-right transition-all ${
                isActive
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-transparent hover:border-purple-200"
              }`}
            >
              <span className={`font-mono text-xs shrink-0 px-1.5 py-0.5 rounded ${
                isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-600"
              }`}>
                {formatTime(ch.timestamp_seconds)}
              </span>
              <span className="flex-1 text-sm font-medium truncate">{ch.title}</span>
              {duration && (
                <span className={`text-xs shrink-0 ${isActive ? "text-white/70" : "text-gray-400"}`}>
                  {Math.ceil(duration / 60)} د
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}