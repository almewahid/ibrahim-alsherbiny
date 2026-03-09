import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Clock, Youtube, Copy, CheckCircle, Trash2, Plus, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const markerTypeColors = {
  topic_change: "bg-blue-100 text-blue-700",
  important_point: "bg-red-100 text-red-700",
  question: "bg-green-100 text-green-700",
  reference: "bg-purple-100 text-purple-700",
  related_point: "bg-teal-100 text-teal-700",
  other: "bg-gray-100 text-gray-700",
};

const markerTypeLabels = {
  topic_change: "تغيير موضوع",
  important_point: "وقفة مهمة",
  question: "سؤال",
  reference: "مرجع",
  related_point: "نقطة تابعة",
  other: "أخرى",
};

export default function MarkersWithYoutube({ recordingId, broadcastId, youtubeUrl, currentTime = 0, canManage = false, onSeek }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("important_point");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("important_point");

  const { data: markersByRecording = [] } = useQuery({
    queryKey: ["markers-rec", recordingId],
    queryFn: () => base44.entities.BroadcastMarker.filter({ recording_id: recordingId }),
    enabled: !!recordingId,
  });

  const { data: markersByBroadcast = [] } = useQuery({
    queryKey: ["markers-bc", broadcastId],
    queryFn: () => base44.entities.BroadcastMarker.filter({ broadcast_id: broadcastId }),
    enabled: !!broadcastId,
  });

  const markers = useMemo(() => {
    const all = [...markersByRecording, ...markersByBroadcast];
    const seen = new Set();
    return all.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  }, [markersByRecording, markersByBroadcast]);

  const invalidateMarkers = () => {
    queryClient.invalidateQueries({ queryKey: ["markers-rec", recordingId] });
    queryClient.invalidateQueries({ queryKey: ["markers-bc", broadcastId] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BroadcastMarker.create(data),
    onSuccess: () => { invalidateMarkers(); setNewTitle(""); setShowAddForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BroadcastMarker.update(id, data),
    onSuccess: () => { invalidateMarkers(); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BroadcastMarker.delete(id),
    onSuccess: invalidateMarkers,
  });

  const sortedMarkers = [...markers].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  // Keyboard shortcut: Ctrl+W (و) to toggle add marker form
  React.useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && (e.key === 'w' || e.key === 'و') && canManage) {
        e.preventDefault();
        setShowAddForm(f => !f);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canManage]);

  const generateYoutubeChapters = () => {
    if (sortedMarkers.length === 0) return "";
    let chapters = "";
    if (sortedMarkers[0].timestamp_seconds > 0) chapters += "0:00 مقدمة\n";
    sortedMarkers.forEach(m => { chapters += `${formatTime(m.timestamp_seconds)} ${m.title}\n`; });
    return chapters.trim();
  };

  const copyChapters = () => {
    const text = generateYoutubeChapters();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openYoutubeDescription = () => {
    if (!youtubeUrl) return;
    const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    if (match) window.open(`https://studio.youtube.com/video/${match[1]}/edit`, "_blank");
    else window.open("https://studio.youtube.com", "_blank");
  };

  const handleAddMarker = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      recording_id: recordingId,
      broadcast_id: broadcastId,
      title: newTitle.trim(),
      marker_type: newType,
      timestamp_seconds: Math.floor(currentTime),
    });
  };

  const startEdit = (marker) => {
    setEditingId(marker.id);
    setEditTitle(marker.title);
    setEditType(marker.marker_type || "important_point");
  };

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, data: { title: editTitle.trim(), marker_type: editType } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">العلامات المرجعية ({markers.length})</h3>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-1"
            title="Ctrl+W"
          >
            <Plus className="w-4 h-4" />
            علامة عند {formatTime(currentTime)}
          </Button>
        )}
      </div>

      {/* Add Marker Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-purple-50 rounded-xl p-3 space-y-2 border border-purple-200">
              <div className="flex gap-2">
                <input
                  value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="عنوان العلامة..."
                  className="flex-1 border border-purple-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                  onKeyDown={e => e.key === "Enter" && handleAddMarker()}
                  autoFocus
                />
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="border border-purple-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none">
                  {Object.entries(markerTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                <Button size="sm" onClick={handleAddMarker} disabled={!newTitle.trim() || createMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700">حفظ</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Chapters Export - admin only */}
      {canManage && markers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">رفع الفصول لليوتيوب</span>
          </div>
          <p className="text-xs text-red-700">انسخ النص أدناه وضعه في وصف الفيديو على يوتيوب ليصبح فصولاً قابلة للنقر</p>
          <div className="bg-white rounded-lg p-2 text-xs font-mono text-gray-700 border max-h-32 overflow-y-auto whitespace-pre-line border-red-100">
            {generateYoutubeChapters()}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyChapters} className="gap-1 text-xs border-red-200 text-red-700 hover:bg-red-50">
              {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "تم النسخ!" : "نسخ النص"}
            </Button>
            {youtubeUrl && (
              <Button size="sm" variant="outline" onClick={openYoutubeDescription} className="gap-1 text-xs border-red-200 text-red-700 hover:bg-red-50">
                <Youtube className="w-3 h-3" /> فتح YouTube Studio
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Markers List */}
      {sortedMarkers.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-400 text-sm">
          <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
          لا توجد علامات بعد
        </div>
      ) : (
        <div className="space-y-2">
          {sortedMarkers.map(marker => (
            <motion.div key={marker.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              {editingId === marker.id ? (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 border border-purple-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400 bg-white"
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                    />
                    <select value={editType} onChange={e => setEditType(e.target.value)}
                      className="border border-purple-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none">
                      {Object.entries(markerTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                    <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim() || updateMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700">حفظ</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-purple-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
                  <button onClick={() => onSeek && onSeek(marker.timestamp_seconds)}
                    className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-mono text-sm shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(marker.timestamp_seconds)}
                  </button>
                  <Badge className={`text-xs shrink-0 ${markerTypeColors[marker.marker_type] || markerTypeColors.other}`}>
                    {markerTypeLabels[marker.marker_type] || "أخرى"}
                  </Badge>
                  <p className="flex-1 text-sm text-gray-800">{marker.title}</p>
                  {canManage && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => startEdit(marker)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(marker.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}