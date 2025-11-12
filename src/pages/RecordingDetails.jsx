import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Share2, Eye, Users, Clock, HardDrive, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import EnhancedAudioPlayer from "../components/recording/EnhancedAudioPlayer";
import LikesAndComments from "../components/recording/LikesAndComments";
import BroadcastCover from "../components/broadcast/BroadcastCover";

export default function RecordingDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const recordingId = urlParams.get('id');
  const [user, setUser] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

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

  // Get signed URL for audio
  useEffect(() => {
    const getAudioUrl = async () => {
      if (!recording?.file_uri) return;

      try {
        const response = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: recording.file_uri,
          expires_in: 3600
        });

        if (response?.signed_url) {
          setAudioUrl(response.signed_url);
          
          // Increment view count
          await base44.entities.Recording.update(recordingId, {
            views_count: (recording.views_count || 0) + 1
          });
        }
      } catch (error) {
        console.error('Error getting audio URL:', error);
      }
    };

    getAudioUrl();
  }, [recording]);

  const handleDownload = async () => {
    if (!recording) return;
    
    try {
      const response = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: recording.file_uri,
        expires_in: 300
      });

      if (response?.signed_url) {
        const a = document.createElement('a');
        a.href = response.signed_url;
        a.download = `${recording.title}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('فشل تحميل التسجيل');
    }
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
                {formatDistanceToNow(new Date(recording.recorded_at || recording.created_date), {
                  addSuffix: true,
                  locale: ar
                })}
              </p>
            </CardContent>
          </Card>

          {/* Cover */}
          {recording.cover_id && (
            <BroadcastCover broadcastId={recording.broadcast_id} />
          )}

          {/* Audio Player */}
          {audioUrl && (
            <EnhancedAudioPlayer
              audioUrl={audioUrl}
              title={recording.title}
              verses={cover?.verses_text}
              hadithText={cover?.hadith_text}
            />
          )}

          {/* Likes and Comments */}
          <LikesAndComments recordingId={recordingId} user={user} />
        </motion.div>
      </div>
    </div>
  );
}