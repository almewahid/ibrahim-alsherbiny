import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Plus, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const markerTypes = [
  { value: "topic_change", label: "تغيير الموضوع", color: "bg-blue-100 text-blue-700" },
  { value: "important_point", label: "نقطة مهمة", color: "bg-red-100 text-red-700" },
  { value: "question", label: "سؤال", color: "bg-green-100 text-green-700" },
  { value: "reference", label: "مرجع", color: "bg-purple-100 text-purple-700" },
  { value: "other", label: "أخرى", color: "bg-gray-100 text-gray-700" }
];

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function MarkerManager({ broadcastId, recordingId, currentTimestamp = 0, canManage = false, onSeek }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [markerData, setMarkerData] = useState({
    title: "",
    description: "",
    marker_type: "other",
    timestamp_seconds: 0
  });

  const { data: markers = [] } = useQuery({
    queryKey: ['markers', broadcastId || recordingId],
    queryFn: () => {
      if (broadcastId) {
        return base44.entities.BroadcastMarker.filter({ broadcast_id: broadcastId });
      } else if (recordingId) {
        return base44.entities.BroadcastMarker.filter({ recording_id: recordingId });
      }
      return [];
    },
    enabled: !!(broadcastId || recordingId),
    refetchInterval: broadcastId ? 5000 : false, // Only refetch for live broadcasts
  });

  const createMarkerMutation = useMutation({
    mutationFn: (data) => base44.entities.BroadcastMarker.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markers'] });
      setShowDialog(false);
      setMarkerData({ title: "", description: "", marker_type: "other", timestamp_seconds: 0 });
    },
  });

  const deleteMarkerMutation = useMutation({
    mutationFn: (id) => base44.entities.BroadcastMarker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markers'] });
    },
  });

  const handleAddMarker = () => {
    setMarkerData(prev => ({
      ...prev,
      timestamp_seconds: Math.floor(currentTimestamp)
    }));
    setShowDialog(true);
  };

  const handleSaveMarker = async () => {
    if (!markerData.title.trim()) {
      alert("يرجى إدخال عنوان العلامة");
      return;
    }

    const data = {
      ...markerData,
      broadcast_id: broadcastId || undefined,
      recording_id: recordingId || undefined,
    };

    createMarkerMutation.mutate(data);
  };

  const handleDeleteMarker = (markerId) => {
    if (confirm("هل تريد حذف هذه العلامة؟")) {
      deleteMarkerMutation.mutate(markerId);
    }
  };

  const handleSeekToMarker = (timestamp) => {
    if (onSeek) {
      onSeek(timestamp);
    }
  };

  const getMarkerTypeInfo = (type) => {
    return markerTypes.find(t => t.value === type) || markerTypes[markerTypes.length - 1];
  };

  const sortedMarkers = [...markers].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">العلامات ({markers.length})</h3>
        </div>
        {canManage && (
          <Button
            onClick={handleAddMarker}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة علامة
          </Button>
        )}
      </div>

      {markers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا توجد علامات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedMarkers.map((marker) => {
              const typeInfo = getMarkerTypeInfo(marker.marker_type);
              return (
                <motion.div
                  key={marker.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border-2 border-purple-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        <button
                          onClick={() => handleSeekToMarker(marker.timestamp_seconds)}
                          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Clock className="w-3 h-3" />
                          {formatTime(marker.timestamp_seconds)}
                        </button>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{marker.title}</h4>
                      {marker.description && (
                        <p className="text-sm text-gray-600">{marker.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <Button
                        onClick={() => handleDeleteMarker(marker.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة علامة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الوقت</Label>
              <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-purple-900">
                  {formatTime(markerData.timestamp_seconds)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marker-title">عنوان العلامة *</Label>
              <Input
                id="marker-title"
                value={markerData.title}
                onChange={(e) => setMarkerData({ ...markerData, title: e.target.value })}
                placeholder="مثال: بداية تفسير الآية الخامسة"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marker-type">نوع العلامة</Label>
              <Select
                value={markerData.marker_type}
                onValueChange={(value) => setMarkerData({ ...markerData, marker_type: value })}
              >
                <SelectTrigger id="marker-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {markerTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marker-description">وصف (اختياري)</Label>
              <Input
                id="marker-description"
                value={markerData.description}
                onChange={(e) => setMarkerData({ ...markerData, description: e.target.value })}
                placeholder="تفاصيل إضافية..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveMarker}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={createMarkerMutation.isPending}
            >
              {createMarkerMutation.isPending ? "جارٍ الحفظ..." : "حفظ العلامة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}