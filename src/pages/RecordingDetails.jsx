import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Download, Clock, Eye, Users, Bookmark, FileQuestion, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import MarkerManager from "../components/broadcast/MarkerManager";
import LikesAndComments from "../components/recording/LikesAndComments";
import ContentLinker from "../components/content/ContentLinker";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function RecordingDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const recordingId = urlParams.get('id');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [user, setUser] = useState(null);
  const audioRef = useRef(new Audio());

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

  const { data: quizzes = [] } = useQuery({
    queryKey: ['quizzesForRecording', recordingId],
    queryFn: () => base44.entities.Quiz.filter({ recording_id: recordingId, is_active: true }),
    enabled: !!recordingId,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['quizAttemptsForRecording', user?.id, recordingId],
    queryFn: () => base44.entities.QuizAttempt.filter({ user_id: user.id }),
    enabled: !!user?.id && !!recordingId,
  });

  const updateViewsMutation = useMutation({
    mutationFn: (id) => base44.entities.Recording.update(id, {
      views_count: (recording.views_count || 0) + 1
    }),
  });

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (recording && !audioRef.current.src) {
      loadAudio();
    }
  }, [recording]);

  const loadAudio = async () => {
    if (!recording) return;

    try {
      if (recording.file_url) {
        audioRef.current.src = recording.file_url;
      } else if (recording.file_uri) {
        const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: recording.file_uri,
          expires_in: 3600
        });

        if (signedUrlResponse && signedUrlResponse.signed_url) {
          audioRef.current.src = signedUrlResponse.signed_url;
        }
      }

      updateViewsMutation.mutate(recording.id);
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (value) => {
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skipBackward = () => {
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const skipForward = () => {
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const downloadRecording = async () => {
    try {
      let downloadUrl;
      
      if (recording.file_url) {
        downloadUrl = recording.file_url;
      } else if (recording.file_uri) {
        const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: recording.file_uri,
          expires_in: 300
        });
        downloadUrl = signedUrlResponse?.signed_url;
      }

      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${recording.title}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error("Error downloading recording:", error);
      alert("فشل تحميل التسجيل");
    }
  };

  const handleMarkerClick = (timestamp) => {
    audioRef.current.currentTime = timestamp;
    setCurrentTime(timestamp);
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              تسجيل غير موجود
            </h2>
            <p className="text-gray-600 mb-6">
              لم يتم العثور على التسجيل المطلوب
            </p>
            <Button onClick={() => navigate(createPageUrl("Recordings"))}>
              العودة للتسجيلات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getQuizAttempt = (quizId) => {
    return attempts.find(a => a.quiz_id === quizId);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            onClick={() => navigate(createPageUrl("Recordings"))}
            variant="ghost"
            className="mb-4"
          >
            <ChevronRight className="w-5 h-5 ml-2" />
            العودة للتسجيلات
          </Button>

          <Card className="border-2 border-purple-100">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3">{recording.title}</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>👨‍🏫 {recording.broadcaster_name}</span>
                    {recording.category && (
                      <Badge className="bg-purple-100 text-purple-700">
                        {recording.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {recording.cover_id && (
                <BroadcastCover broadcastId={recording.broadcast_id} className="rounded-xl" />
              )}

              {recording.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <p className="font-semibold text-gray-900">الوصف</p>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{recording.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">المدة</p>
                  <p className="text-xl font-bold text-blue-900">
                    {Math.floor((recording.duration_seconds || 0) / 60)} دقيقة
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <Eye className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">المشاهدات</p>
                  <p className="text-xl font-bold text-green-900">{recording.views_count || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">ذروة المستمعين</p>
                  <p className="text-xl font-bold text-purple-900">{recording.peak_listeners || 0}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-100">
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="font-semibold">{formatDuration(currentTime)}</span>
                  <span className="font-semibold">{formatDuration(duration)}</span>
                </div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={seekTo}
                  className="cursor-pointer mb-6"
                />
                <div className="flex justify-center gap-4">
                  <Button onClick={skipBackward} variant="outline" size="lg">
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={togglePlay}
                    size="lg"
                    className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </Button>
                  <Button onClick={skipForward} variant="outline" size="lg">
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={downloadRecording}
                variant="outline"
                className="w-full gap-2 border-2 border-purple-200"
              >
                <Download className="w-5 h-5" />
                تحميل التسجيل
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <MarkerManager
            broadcastId={recording.broadcast_id}
            recordingId={recording.id}
            currentTimestamp={currentTime}
            canManage={user?.role === 'admin'}
            onMarkerClick={handleMarkerClick}
          />

          <ContentLinker
            sourceType="recording"
            sourceId={recording.id}
            sourceTitle={recording.title}
            canManage={user?.role === 'admin'}
          />
        </div>

        {quizzes.length > 0 && (
          <Card className="mb-6 border-2 border-yellow-100 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileQuestion className="w-6 h-6 text-yellow-600" />
                <CardTitle className="text-2xl">اختبارات متعلقة</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {quizzes.map(quiz => {
                  const attempt = getQuizAttempt(quiz.id);
                  return (
                    <Card key={quiz.id} className="border-2 border-yellow-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-bold text-lg mb-1">{quiz.title}</h3>
                            <p className="text-sm text-gray-600">{quiz.questions.length} سؤال</p>
                          </div>
                          {attempt && (
                            <Badge className={attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                              {attempt.score}%
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => navigate(createPageUrl(`TakeQuiz?quiz_id=${quiz.id}`))}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500"
                        >
                          {attempt ? "إعادة الاختبار" : "بدء الاختبار"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <LikesAndComments recordingId={recording.id} currentUser={user} />
      </div>
    </div>
  );
}