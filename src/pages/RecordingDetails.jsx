import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Share2, Eye, Users, Clock, HardDrive, ArrowRight, Youtube, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import EnhancedAudioPlayer from "../components/recording/EnhancedAudioPlayer";
import VideoPlayer from "../components/recording/VideoPlayer";
import LikesAndComments from "../components/recording/LikesAndComments";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import MarkersWithYoutube from "../components/broadcast/MarkersWithYoutube";
import ChapterEditor from "../components/recording/ChapterEditor";
import ChaptersList from "../components/recording/ChaptersList";
import InlineQuiz from "../components/recording/InlineQuiz";
import StarRating from "../components/recording/StarRating";

export default function RecordingDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const recordingId = urlParams.get('id');
  const [user, setUser] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [youtubeSeek, setYoutubeSeek] = useState(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: recording, isLoading } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const recordings = await base44.entities.Recording.filter({ id: recordingId });
      return recordings[0];
    },
    enabled: !!recordingId,
  });

  // Fetch cover data for text display
  const { data: cover } = useQuery({
    queryKey: ['recordingCover', recording?.cover_id],
    queryFn: async () => {
      if (!recording?.cover_id) return null;
      const covers = await base44.entities.BroadcastCover.filter({ id: recording.cover_id });
      return covers[0];
    },
    enabled: !!recording?.cover_id,
  });

  // Get signed URL for audio/video
  useEffect(() => {
    const getMediaUrl = async () => {
      if (!recording) return;
      // إذا كان يوتيوب فقط بدون ملف محلي، نحسب المشاهدة ونخرج
      if (!recording.file_url && !recording.file_uri) {
        if (recording.youtube_url) {
          await base44.entities.Recording.update(recordingId, {
            views_count: (recording.views_count || 0) + 1
          });
        }
        return;
      }
      try {
        const response = await base44.functions.invoke('getR2FileWithCors', {
          file_url: recording.file_url,
          file_uri: recording.file_uri
        });
        if (response?.data?.url) {
          const url = response.data.url;
          const isVideo = recording.has_video || /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
          if (isVideo) {
            setVideoUrl(url);
          } else {
            setAudioUrl(url);
          }
          await base44.entities.Recording.update(recordingId, {
            views_count: (recording.views_count || 0) + 1
          });
        }
      } catch (error) {
        console.error('Error getting media URL:', error);
      }
    };
    getMediaUrl();
  }, [recording]);

  // تتبع وقت يوتيوب عبر postMessage
  useEffect(() => {
    const handler = (e) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "infoDelivery" && data?.info?.currentTime !== undefined) {
          setYtCurrentTime(data.info.currentTime);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const queryClient = useQueryClient();
  const [editingYoutube, setEditingYoutube] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");

  const handleDownload = async () => {
    if (!recording) return;
    try {
      const response = await base44.functions.invoke('getR2FileWithCors', {
        file_url: recording.file_url,
        file_uri: recording.file_uri,
      });
      const url = response?.data?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        alert('فشل الحصول على رابط التحميل');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('فشل تحميل التسجيل: ' + error.message);
    }
  };

  const saveYoutubeUrl = async () => {
    const urlVal = youtubeInput.trim() || null;
    await base44.entities.Recording.update(recordingId, { youtube_url: urlVal });
    // force refetch
    await queryClient.refetchQueries({ queryKey: ['recording', recordingId] });
    setEditingYoutube(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: recording.title,
        text: recording.description || 'استمع لهذا التسجيل المميز',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('✅ تم نسخ الرابط');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">التسجيل غير موجود</h2>
            <Button onClick={() => navigate(createPageUrl("Recordings"))}>
              العودة للتسجيلات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Recordings"))}
          className="mb-6 gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <Card className="border-2 border-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-purple-100 text-purple-700">
                      {recording.category}
                    </Badge>
                    {recording.series_id && (
                      <Badge variant="outline">
                        الحلقة {recording.episode_number}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {recording.title}
                  </h1>
                  <p className="text-gray-600 mb-2">
                    المحاضر: {recording.broadcaster_name}
                  </p>
                  {recording.description && (
                    <p className="text-gray-700 leading-relaxed">
                      {recording.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
                    <Share2 className="w-4 h-4" />
                    مشاركة
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    تحميل
                  </Button>
                  {user?.role === 'admin' && (
                    <Button onClick={() => { setYoutubeInput(recording.youtube_url || ""); setEditingYoutube(true); }} variant="outline" size="sm" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                      <Youtube className="w-4 h-4" />
                      {recording.youtube_url ? "تعديل يوتيوب" : "إضافة يوتيوب"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-sm text-blue-900 font-bold">
                    {Math.floor((recording.duration_seconds || 0) / 60)} دقيقة
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Eye className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-sm text-green-900 font-bold">
                    {recording.views_count || 0} مشاهدة
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-sm text-purple-900 font-bold">
                    {recording.peak_listeners || 0} مستمع
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <HardDrive className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-sm text-orange-900 font-bold">
                    {(recording.file_size_mb || 0).toFixed(1)} ميجا
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
              {(() => {
                try {
                  const d = new Date(recording.recorded_at || recording.created_date);
                  if (isNaN(d)) return 'منذ وقت قصير';
                  return formatDistanceToNow(d, { addSuffix: true, locale: ar });
                } catch { return 'منذ وقت قصير'; }
              })()}
              </p>
            </CardContent>
          </Card>

          {/* YouTube URL Editor */}
          {editingYoutube && (
            <Card className="border-2 border-red-100">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><Youtube className="w-4 h-4 text-red-500" /> رابط يوتيوب للدرس</p>
                <div className="flex gap-2">
                  <Input value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." dir="ltr" />
                  <Button onClick={saveYoutubeUrl} size="sm" className="gap-1 bg-red-600 hover:bg-red-700"><Save className="w-4 h-4" />حفظ</Button>
                  <Button onClick={() => setEditingYoutube(false)} variant="outline" size="sm">إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cover */}
          {recording.cover_id && (
            <BroadcastCover broadcastId={recording.broadcast_id} />
          )}

          {/* YouTube Player - يظهر دائماً إذا وُجد رابط يوتيوب */}
          {recording.youtube_url && (
            <VideoPlayer
              videoUrl={videoUrl || null}
              youtubeUrl={recording.youtube_url}
              title={recording.title}
              seekTime={youtubeSeek}
            />
          )}

          {/* Video Player - للملف المسجل فقط إن لم يكن هناك يوتيوب */}
          {videoUrl && !recording.youtube_url && (
            <VideoPlayer
              videoUrl={videoUrl}
              youtubeUrl={null}
              title={recording.title}
            />
          )}

          {/* Audio Player */}
          {audioUrl && !videoUrl && (
            <EnhancedAudioPlayer
              audioUrl={audioUrl}
              title={recording.title}
              verses={cover?.verses_text}
              hadithText={cover?.hadith_text}
              recordingId={recordingId}
              isAdmin={user?.role === 'admin'}
            />
          )}

          {/* Chapters + Markers */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Video Chapters */}
            <div className="bg-white rounded-2xl border-2 border-purple-100 p-6 space-y-4">
              <ChaptersList
                recordingId={recordingId}
                currentTime={mediaCurrentTime}
                onSeek={(t) => {
                  setMediaCurrentTime(t);
                  const mediaEl = document.querySelector('audio, video');
                  if (mediaEl) { mediaEl.currentTime = t; mediaEl.play(); }
                }}
              />
              {user?.role === 'admin' && (
                <details>
                  <summary className="text-xs text-purple-600 cursor-pointer font-semibold">⚙️ إدارة الفصول</summary>
                  <div className="mt-3">
                    <ChapterEditor recordingId={recordingId} currentTime={mediaCurrentTime} />
                  </div>
                </details>
              )}
            </div>

            {/* Markers with YouTube chapters */}
            <div className="bg-white rounded-2xl border-2 border-purple-100 p-6">
              <MarkersWithYoutube
                recordingId={recordingId}
                broadcastId={recording.broadcast_id}
                youtubeUrl={recording.youtube_url}
                currentTime={recording.youtube_url ? ytCurrentTime : mediaCurrentTime}
                canManage={user?.role === 'admin'}
                onSeek={(t) => {
                  setMediaCurrentTime(t);
                  if (recording.youtube_url) {
                    setYoutubeSeek({ time: t, ts: Date.now() });
                  }
                  const mediaEl = document.querySelector('audio, video');
                  if (mediaEl) { mediaEl.currentTime = t; mediaEl.play(); }
                }}
              />
            </div>
          </div>

          {/* Quiz */}
          <InlineQuiz recordingId={recordingId} broadcastId={recording.broadcast_id} user={user} />

          {/* Star Rating */}
          <StarRating recordingId={recordingId} user={user} />

          {/* Likes and Comments */}
          <LikesAndComments recordingId={recordingId} user={user} />
        </motion.div>
      </div>
    </div>
  );
}