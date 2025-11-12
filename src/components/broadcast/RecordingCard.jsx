
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Download, Edit, Trash2, Eye, Video, Clock, HardDrive, Users, Sparkles, BarChart3, Copy, Share2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import BroadcastCover from "./BroadcastCover";
import { useNavigate } from "react-router-dom"; // Import useNavigate

// Placeholder for createPageUrl - replace with actual import path if available
const createPageUrl = (path) => `/dashboard/${path}`;

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function RecordingCard({
  recording,
  playingId,
  isPlaying,
  currentTime,
  duration,
  playRecording,
  seekTo,
  skipBackward,
  skipForward,
  downloadRecording,
  openEditDialog,
  handleDeleteRecording,
  showStats,
  handleConvertToVideo,
  handleCategorizeRecording,
  handleShowAnalytics,
  handleGenerateSummary,
  convertingToVideo,
  categorizingRecording,
  generatingSummary,
  user,
  categoryColors
}) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (!recording) {
    return null;
  }

  const getCategoryColor = (category) => {
    if (!categoryColors || typeof categoryColors !== 'object') {
      return "bg-gray-100 text-gray-800";
    }
    return categoryColors[category] || categoryColors["أخرى"] || "bg-gray-100 text-gray-800";
  };

  const handleCopySummary = () => {
    if (recording.description) {
      navigator.clipboard.writeText(recording.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareSummary = () => {
    if (recording.description && navigator.share) {
      navigator.share({
        title: recording.title,
        text: recording.description,
      });
    }
  };

  // NEW: Download video function
  const handleDownloadVideo = async () => {
    if (convertingToVideo === recording.id) return;
    
    if (confirm(`هل تريد تحويل "${recording.title}" إلى فيديو وتحميله؟\nهذا قد يستغرق بضع دقائق.`)) {
      handleConvertToVideo(recording);
    }
  };

  const handleCardClick = () => {
    // Navigate to recording details page
    navigate(createPageUrl(`RecordingDetails?id=${recording.id}`));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card 
        className="border-2 border-purple-100 hover:shadow-xl transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                {recording.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>👨‍🏫 {recording.broadcaster_name}</span>
              </div>
              {recording.series_id && recording.episode_number && (
                <Badge variant="outline" className="mt-2">
                  الحلقة {recording.episode_number}
                </Badge>
              )}
            </div>
            <Badge className={getCategoryColor(recording.category)}>
              {recording.category || "أخرى"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Cover */}
          {recording.cover_id && (
            <BroadcastCover broadcastId={recording.broadcast_id} className="rounded-xl" />
          )}

          {/* Description with AI Summary Actions */}
          {recording.description && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  مختصر AI
                </p>
                <div className="flex gap-1">
                  <Button
                    onClick={handleCopySummary}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    {copied ? '✓' : <Copy className="w-3 h-3" />}
                  </Button>
                  {navigator.share && (
                    <Button
                      onClick={handleShareSummary}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      <Share2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                {recording.description}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-blue-900 font-bold">{Math.floor((recording.duration_seconds || 0) / 60)} د</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <Eye className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <p className="text-green-900 font-bold">{recording.views_count || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <Users className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-purple-900 font-bold">{recording.peak_listeners || 0}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <HardDrive className="w-4 h-4 text-orange-600 mx-auto mb-1" />
              <p className="text-orange-900 font-bold">{(recording.file_size_mb || 0).toFixed(1)} م</p>
            </div>
          </div>

          {/* Player Controls - Only show if this card is playing */}
          {playingId === recording.id && (
            <div className="space-y-3 bg-purple-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={seekTo}
                className="cursor-pointer"
              />
              <div className="flex justify-center gap-3">
                <Button onClick={skipBackward} variant="outline" size="sm">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => playRecording(recording)}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button onClick={skipForward} variant="outline" size="sm">
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Play Button (if not playing) */}
          {playingId !== recording.id && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                playRecording(recording);
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
            >
              <Play className="w-4 h-4" />
              تشغيل سريع
            </Button>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => downloadRecording(recording)}
              variant="outline"
              size="sm"
              className="border-2 border-purple-200 gap-1 text-xs"
            >
              <Download className="w-3 h-3" />
              صوت
            </Button>

            {/* NEW: Download Video Button */}
            <Button
              onClick={handleDownloadVideo}
              variant="outline"
              size="sm"
              className="border-2 border-pink-200 text-pink-600 hover:bg-pink-50 gap-1 text-xs"
              disabled={convertingToVideo === recording.id}
            >
              {convertingToVideo === recording.id ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  تحويل...
                </>
              ) : (
                <>
                  <Video className="w-3 h-3" />
                  فيديو
                </>
              )}
            </Button>

            <Button
              onClick={() => handleShowAnalytics(recording)}
              variant="outline"
              size="sm"
              className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 gap-1 text-xs"
            >
              <BarChart3 className="w-3 h-3" />
              تحليلات
            </Button>
            
            {user?.role === 'admin' && (
              <>
                <Button
                  onClick={() => handleGenerateSummary(recording)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-200 text-green-600 hover:bg-green-50 gap-1 text-xs"
                  disabled={generatingSummary === recording.id}
                >
                  {generatingSummary === recording.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جارٍ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      ملخص AI
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleCategorizeRecording(recording)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-yellow-200 text-yellow-600 hover:bg-yellow-50 gap-1 text-xs"
                  disabled={categorizingRecording === recording.id}
                >
                  {categorizingRecording === recording.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جارٍ...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      تصنيف AI
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => openEditDialog(recording)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-200 text-blue-600 hover:bg-blue-50 gap-1 text-xs"
                >
                  <Edit className="w-3 h-3" />
                  تعديل
                </Button>
                <Button
                  onClick={() => handleDeleteRecording(recording)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-red-200 text-red-600 hover:bg-red-50 gap-1 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                  حذف
                </Button>
              </>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500 text-center">
            {recording.recorded_at 
              ? formatDistanceToNow(new Date(recording.recorded_at), { addSuffix: true, locale: ar })
              : formatDistanceToNow(new Date(recording.created_date), { addSuffix: true, locale: ar })
            }
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
