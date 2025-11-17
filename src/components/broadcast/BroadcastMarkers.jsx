import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Flag, Plus, Edit, Trash2, Clock, Play } from "lucide-react";
import { motion } from "framer-motion";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MARKER_COLORS = [
  { value: "#8b5cf6", label: "بنفسجي" },
  { value: "#ef4444", label: "أحمر" },
  { value: "#10b981", label: "أخضر" },
  { value: "#f59e0b", label: "برتقالي" },
  { value: "#3b82f6", label: "أزرق" },
  { value: "#ec4899", label: "وردي" }
];

export default function BroadcastMarkers({ broadcastId, currentTime, onSeek, canManage = false }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingMarker, setEditingMarker] = useState(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8b5cf6");

  const { data: markers = [] } = useQuery({
    queryKey: ['broadcastMarkers', broadcastId],
    queryFn: () => base44.entities.BroadcastMarker.filter({ broadcast_id: broadcastId }),
    enabled: !!broadcastId,
    refetchInterval: 5000,
  });

  const createMarkerMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.BroadcastMarker.create({ ...data, created_by: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcastMarkers', broadcastId] });
      resetForm();
    },
  });

  const updateMarkerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BroadcastMarker.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcastMarkers', broadcastId] });
      resetForm();
    },
  });

  const deleteMarkerMutation = useMutation({
    mutationFn: (id) => base44.entities.BroadcastMarker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcastMarkers', broadcastId] });
    },
  });

  const resetForm = () => {
    setLabel("");
    setDescription("");
    setColor("#8b5cf6");
    setEditingMarker(null);
    setShowDialog(false);
  };

  const handleAddMarker = () => {
    if (!label.trim()) return;

    if (editingMarker) {
      updateMarkerMutation.mutate({
        id: editingMarker.id,
        data: { label, description, color }
      });
    } else {
      createMarkerMutation.mutate({
        broadcast_id: broadcastId,
        timestamp_seconds: Math.floor(currentTime),
        label,
        description,
        color
      });
    }
  };

  const openEditDialog = (marker) => {
    setEditingMarker(marker);
    setLabel(marker.label);
    setDescription(marker.description || "");
    setColor(marker.color);
    setShowDialog(true);
  };

  const handleMarkerClick = (timestamp) => {
    if (onSeek) {
      onSeek(timestamp);
    }
  };

  const sortedMarkers = [...markers].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  if (sortedMarkers.length === 0 && !canManage) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-purple-600" />
            علامات البث ({markers.length})
          </CardTitle>
          {canManage && (
            <Button
              onClick={() => setShowDialog(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة علامة
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedMarkers.length === 0 ? (
          <p className="text-gray-600 text-center py-4">لا توجد علامات بعد</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedMarkers.map((marker) => (
              <motion.div
                key={marker.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => handleMarkerClick(marker.timestamp_seconds)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: marker.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{marker.label}</p>
                    {marker.description && (
                      <p className="text-sm text-gray-600 truncate">{marker.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="gap-1 flex-shrink-0">
                    <Play className="w-3 h-3" />
                    {formatTime(marker.timestamp_seconds)}
                  </Badge>
                </div>
                {canManage && (
                  <div className="flex gap-1 mr-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => openEditDialog(marker)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('هل تريد حذف هذه العلامة؟')) {
                          deleteMarkerMutation.mutate(marker.id);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingMarker ? "تعديل العلامة" : `إضافة علامة عند ${formatTime(currentTime)}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم العلامة *</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: بداية شرح الآية 25"
              />
            </div>

            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل إضافية..."
              />
            </div>

            <div className="space-y-2">
              <Label>اللون</Label>
              <div className="flex gap-2 flex-wrap">
                {MARKER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-10 h-10 rounded-full border-4 transition-transform ${
                      color === c.value ? 'border-gray-900 scale-110' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddMarker}
              disabled={!label.trim() || createMarkerMutation.isPending || updateMarkerMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {editingMarker ? 'حفظ التعديلات' : 'إضافة العلامة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}