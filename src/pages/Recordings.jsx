import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Sparkles, Filter, TrendingUp, Calendar, User as UserIcon, Layers, Radio, Play, Pause, Download, Eye, Clock, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "../components/broadcast/SearchBar";
import RecordingCard from "../components/broadcast/RecordingCard";

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

const CATEGORY_COLORS = {
  "علوم شرعية": "bg-purple-100 text-purple-800",
  "تفسير القرآن": "bg-green-100 text-green-800",
  "الحديث النبوي": "bg-blue-100 text-blue-800",
  "الفقه الإسلامي": "bg-yellow-100 text-yellow-800",
  "السيرة النبوية": "bg-pink-100 text-pink-800",
  "تربية وتزكية": "bg-indigo-100 text-indigo-800",
  "نقاش": "bg-orange-100 text-orange-800",
  "أخرى": "bg-gray-100 text-gray-800"
};

export default function Recordings() {
  const queryClient = useQueryClient();
  const [playingId, setPlayingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [sortBy, setSortBy] = useState("date");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedBroadcaster, setSelectedBroadcaster] = useState("الكل");
  const [editingRecording, setEditingRecording] = useState(null);
  const [editData, setEditData] = useState({ title: "", description: "", category: "", series_id: "" });
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [convertingToVideo, setConvertingToVideo] = useState(null);
  const [categorizingRecording, setCategorizingRecording] = useState(null);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(null);
  const audioRef = useRef(new Audio());

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
    };
  }, []);

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

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['recordings'],
    queryFn: () => base44.entities.Recording.list("-created_date"),
    refetchInterval: 10000,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcastsForRecordings'],
    queryFn: () => base44.entities.Broadcast.list(),
  });

  const updateRecordingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recording.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      setEditingRecording(null);
      alert('✅ تم تحديث التسجيل بنجاح');
    },
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: (id) => base44.entities.Recording.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
      alert('✅ تم حذف التسجيل بنجاح');
    },
  });

  const convertToVideoMutation = useMutation({
    mutationFn: async (recordingId) => {
      const response = await base44.functions.invoke('convertToVideo', { recording_id: recordingId });
      return response.data;
    },
    onSuccess: (data, recordingId) => {
      setConvertingToVideo(null);
      if (data.success) {
        alert('✅ تم تحويل التسجيل إلى فيديو بنجاح!');
        const a = document.createElement('a');
        a.href = data.video_url;
        a.download = 'recording.mp4';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (data.manual_conversion) {
        const instructions = data.manual_conversion.instructions.join('\n');
        alert(`التحويل اليدوي:\n\n${instructions}\n\nأمر FFmpeg:\n${data.manual_conversion.ffmpeg_command}`);
        window.open(data.manual_conversion.audio_url, '_blank');
        window.open(data.manual_conversion.cover_url, '_blank');
      }
    },
    onError: (error) => {
      setConvertingToVideo(null);
      alert('فشل التحويل: ' + error.message);
    }
  });

  const broadcasters = useMemo(() => {
    const uniqueBroadcasters = [...new Set(recordings.map(r => r.broadcaster_name))];
    return ["الكل", ...uniqueBroadcasters.filter(Boolean)];
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    let result = recordings;

    if (selectedCategory !== "الكل") {
      result = result.filter(r => r.category === selectedCategory);
    }

    if (selectedBroadcaster !== "الكل") {
      result = result.filter(r => r.broadcaster_name === selectedBroadcaster);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      result = result.filter(r => {
        const recordDate = new Date(r.recorded_at || r.created_date).getTime();
        if (dateFilter === "today") return (now - recordDate) < dayMs;
        if (dateFilter === "week") return (now - recordDate) < (7 * dayMs);
        if (dateFilter === "month") return (now - recordDate) < (30 * dayMs);
        if (dateFilter === "year") return (now - recordDate) < (365 * dayMs);
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.broadcaster_name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    if (sortBy === "date") {
      result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === "views") {
      result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    } else if (sortBy === "duration") {
      result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    } else if (sortBy === "listeners") {
      result.sort((a, b) => (b.peak_listeners || 0) - (a.peak_listeners || 0));
    } else if (sortBy === "title") {
      result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    return result;
  }, [recordings, selectedCategory, selectedBroadcaster, dateFilter, searchQuery, sortBy]);

  const groupedRecordings = useMemo(() => {
    const grouped = {};
    const withoutSeries = [];

    filteredRecordings.forEach(r => {
      if (r.series_id) {
        if (!grouped[r.series_id]) {
          grouped[r.series_id] = [];
        }
        grouped[r.series_id].push(r);
      } else {
        withoutSeries.push(r);
      }
    });

    return { grouped, withoutSeries };
  }, [filteredRecordings]);

  const handleCategorizeRecording = useCallback(async (recording) => {
    if (!confirm(`هل تريد تصنيف "${recording.title}" تلقائياً باستخدام الذكاء الاصطناعي؟`)) {
      return;
    }

    setCategorizingRecording(recording.id);
    try {
      const response = await base44.functions.invoke('categorizeRecording', {
        recording_id: recording.id
      });

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        queryClient.invalidateQueries({ queryKey: ['recordings'] });
      }
    } catch (error) {
      alert('فشل التصنيف: ' + error.message);
    } finally {
      setCategorizingRecording(null);
    }
  }, [queryClient]);

  const handleGenerateSummary = useCallback(async (recording) => {
    if (!confirm(`هل تريد توليد ملخص AI لـ "${recording.title}"؟`)) {
      return;
    }

    setGeneratingSummary(recording.id);
    try {
      const response = await base44.functions.invoke('generateRecordingSummary', {
        recording_id: recording.id
      });

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        queryClient.invalidateQueries({ queryKey: ['recordings'] });
      }
    } catch (error) {
      alert('فشل توليد الملخص: ' + error.message);
    } finally {
      setGeneratingSummary(null);
    }
  }, [queryClient]);

  const handleShowAnalytics = useCallback(async (recording) => {
    setSelectedRecording(recording);
    setShowAnalyticsDialog(true);
    setLoadingAnalytics(true);
    setAnalyticsData(null);

    try {
      const response = await base44.functions.invoke('getRecordingAnalytics', {
        recording_id: recording.id
      });

      if (response.data.success) {
        setAnalyticsData(response.data.analytics);
      } else {
        alert('فشل تحميل الإحصائيات: ' + (response.data.error || 'خطأ غير معروف'));
      }
    } catch (error) {
      alert('فشل تحميل الإحصائيات: ' + error.message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const playRecording = useCallback(async (recording) => {
    try {
      if (playingId === recording.id && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (playingId !== recording.id) {
        const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: recording.file_uri,
          expires_in: 3600
        });

        if (signedUrlResponse && signedUrlResponse.signed_url) {
          audioRef.current.src = signedUrlResponse.signed_url;
          setPlayingId(recording.id);
          setCurrentTime(0);

          await base44.entities.Recording.update(recording.id, {
            views_count: (recording.views_count || 0) + 1
          });
        }
      }

      audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Error playing recording:", error);
      alert("فشل تشغيل التسجيل");
    }
  }, [playingId, isPlaying]);

  const seekTo = useCallback((value) => {
    const newTime = value[0];
    if (isFinite(newTime) && newTime >= 0 && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, []);

  const skipBackward = useCallback(() => {
    if (audioRef.current) {
      const currentTimeValue = audioRef.current.currentTime;
      if (isFinite(currentTimeValue)) {
        audioRef.current.currentTime = Math.max(0, currentTimeValue - 10);
      }
    }
  }, []);

  const skipForward = useCallback(() => {
    if (audioRef.current) {
      const currentTimeValue = audioRef.current.currentTime;
      const durationValue = duration;
      if (isFinite(currentTimeValue) && isFinite(durationValue)) {
        audioRef.current.currentTime = Math.min(durationValue, currentTimeValue + 10);
      }
    }
  }, [duration]);

  const downloadRecording = useCallback(async (recording) => {
    try {
      const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: recording.file_uri,
        expires_in: 300
      });

      if (signedUrlResponse && signedUrlResponse.signed_url) {
        const a = document.createElement('a');
        a.href = signedUrlResponse.signed_url;
        a.download = `${recording.title}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error("Error downloading recording:", error);
      alert("فشل تحميل التسجيل");
    }
  }, []);

  const handleConvertToVideo = useCallback((recording) => {
    if (confirm(`هل تريد تحويل "${recording.title}" إلى فيديو؟\nهذا قد يستغرق بضع دقائق.`)) {
      setConvertingToVideo(recording.id);
      convertToVideoMutation.mutate(recording.id);
    }
  }, [convertToVideoMutation]);

  const openEditDialog = useCallback((recording) => {
    setEditingRecording(recording);
    setEditData({
      title: recording.title,
      description: recording.description || "",
      category: recording.category || "علوم شرعية",
      series_id: recording.series_id || ""
    });
  }, []);

  const handleDeleteRecording = useCallback((recording) => {
    if (confirm(`هل أنت متأكد من حذف التسجيل "${recording.title}"؟`)) {
      deleteRecordingMutation.mutate(recording.id);
    }
  }, [deleteRecordingMutation]);

  const showStats = useCallback((recording) => {
    setSelectedRecording(recording);
    setShowStatsDialog(true);
  }, []);

  const handleUpdateRecording = useCallback(() => {
    if (!editData.title.trim()) {
      alert('يرجى إدخال عنوان التسجيل');
      return;
    }

    updateRecordingMutation.mutate({
      id: editingRecording.id,
      data: editData
    });
  }, [editData, editingRecording, updateRecordingMutation]);

  const stats = {
    total: recordings.length,
    totalViews: recordings.reduce((sum, r) => sum + (r.views_count || 0), 0),
    totalDuration: recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0)
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            التسجيلات المحفوظة
          </h1>
          <p className="text-lg text-gray-600">
            استمع إلى البثوث السابقة في أي وقت
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-4xl mx-auto">
            <Card className="bg-white border-2 border-purple-100">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">إجمالي التسجيلات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-2 border-purple-100">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">إجمالي المشاهدات</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-2 border-purple-100">
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">إجمالي المدة</p>
                <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.totalDuration / 60)} دقيقة</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <div className="mb-8 space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث في التسجيلات حسب العنوان، المحاضر، أو الوصف..."
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-2 h-11">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedBroadcaster} onValueChange={setSelectedBroadcaster}>
              <SelectTrigger className="border-2 h-11">
                <SelectValue placeholder="المحاضر" />
              </SelectTrigger>
              <SelectContent>
                {broadcasters.map((broadcaster) => (
                  <SelectItem key={broadcaster} value={broadcaster}>
                    {broadcaster}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-2 h-11">
                <SelectValue placeholder="التاريخ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأوقات</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="year">آخر سنة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-2 h-11">
                <SelectValue placeholder="الترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">الأحدث</SelectItem>
                <SelectItem value="title">الاسم (أ-ي)</SelectItem>
                <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                <SelectItem value="listeners">الأكثر استماعاً</SelectItem>
                <SelectItem value="duration">الأطول مدة</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                setSelectedCategory("الكل");
                setSelectedBroadcaster("الكل");
                setDateFilter("all");
                setSortBy("date");
                setSearchQuery("");
              }}
              variant="outline"
              className="border-2 h-11"
            >
              إعادة تعيين
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 bg-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>عرض {filteredRecordings.length} من {recordings.length} تسجيل</span>
            </div>
            {filteredRecordings.length > 0 && (
              <span className="text-purple-600 font-semibold">
                مُرتب حسب: {sortBy === "date" ? "الأحدث" : sortBy === "title" ? "الاسم" : sortBy === "views" ? "المشاهدات" : sortBy === "listeners" ? "المستمعين" : "المدة"}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : filteredRecordings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto border-2 border-purple-100">
              <CardContent className="pt-12 pb-12">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Radio className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  لا توجد تسجيلات
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? "جرب البحث بكلمات مختلفة" : "لم يتم العثور على تسجيلات مطابقة للفلاتر المحددة"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="wait">
            {Object.keys(groupedRecordings.grouped).map(seriesId => {
              const seriesInfo = series.find(s => s.id === seriesId);
              const seriesRecordings = groupedRecordings.grouped[seriesId];
              
              return (
                <div key={seriesId} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {seriesInfo?.title || "سلسلة"}
                    </h2>
                    <Badge className="bg-purple-100 text-purple-700">
                      {seriesRecordings.length} حلقة
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {seriesRecordings.map((recording) => (
                      <RecordingCard
                        key={recording.id}
                        recording={recording}
                        playingId={playingId}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration}
                        playRecording={playRecording}
                        seekTo={seekTo}
                        skipBackward={skipBackward}
                        skipForward={skipForward}
                        downloadRecording={downloadRecording}
                        openEditDialog={openEditDialog}
                        handleDeleteRecording={handleDeleteRecording}
                        showStats={showStats}
                        handleConvertToVideo={handleConvertToVideo}
                        handleCategorizeRecording={handleCategorizeRecording}
                        handleShowAnalytics={handleShowAnalytics}
                        handleGenerateSummary={handleGenerateSummary}
                        convertingToVideo={convertingToVideo}
                        categorizingRecording={categorizingRecording}
                        generatingSummary={generatingSummary}
                        user={user}
                        categoryColors={CATEGORY_COLORS}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {groupedRecordings.withoutSeries.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">تسجيلات أخرى</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedRecordings.withoutSeries.map((recording) => (
                    <RecordingCard
                      key={recording.id}
                      recording={recording}
                      playingId={playingId}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={duration}
                      playRecording={playRecording}
                      seekTo={seekTo}
                      skipBackward={skipBackward}
                      skipForward={skipForward}
                      downloadRecording={downloadRecording}
                      openEditDialog={openEditDialog}
                      handleDeleteRecording={handleDeleteRecording}
                      showStats={showStats}
                      handleConvertToVideo={handleConvertToVideo}
                      handleCategorizeRecording={handleCategorizeRecording}
                      handleShowAnalytics={handleShowAnalytics}
                      handleGenerateSummary={handleGenerateSummary}
                      convertingToVideo={convertingToVideo}
                      categorizingRecording={categorizingRecording}
                      generatingSummary={generatingSummary}
                      user={user}
                      categoryColors={CATEGORY_COLORS}
                    />
                  ))}
                </div>
              </div>
            )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={!!editingRecording} onOpenChange={() => setEditingRecording(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل التسجيل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">عنوان التسجيل</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="عنوان التسجيل..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="وصف التسجيل..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">الفئة</Label>
              <Select value={editData.category} onValueChange={(value) => setEditData({ ...editData, category: value })}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-series">السلسلة (اختياري)</Label>
              <Select value={editData.series_id || ""} onValueChange={(value) => setEditData({ ...editData, series_id: value === "none" ? null : value })}>
                <SelectTrigger id="edit-series">
                  <SelectValue placeholder="بدون سلسلة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون سلسلة</SelectItem>
                  {series && series.length > 0 ? (
                    series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>لا توجد سلاسل متاحة</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecording(null)}>
              إلغاء
            </Button>
            <Button
              onClick={handleUpdateRecording}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={updateRecordingMutation.isPending}
            >
              {updateRecordingMutation.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تحليلات متقدمة للتسجيل</DialogTitle>
          </DialogHeader>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
            </div>
          ) : analyticsData ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">{analyticsData.title}</h3>
                <p className="text-gray-600">المحاضر: {analyticsData.broadcaster_name}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-blue-700">{analyticsData.total_views}</p>
                    <p className="text-sm text-blue-600">إجمالي المشاهدات</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <CardContent className="pt-4 text-center">
                    <UserIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-700">{analyticsData.peak_listeners}</p>
                    <p className="text-sm text-green-600">ذروة المستمعين</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                  <CardContent className="pt-4 text-center">
                    <Loader2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-purple-700">{analyticsData.engagement_rate}%</p>
                    <p className="text-sm text-purple-600">معدل التفاعل</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
                  <CardContent className="pt-4 text-center">
                    <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-orange-700">{analyticsData.avg_views_per_day}</p>
                    <p className="text-sm text-orange-600">مشاهدة يومياً</p>
                  </CardContent>
                </Card>
              </div>

              {analyticsData.peak_hours && analyticsData.peak_hours.length > 0 && (
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-lg">أوقات الذروة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.peak_hours.map((ph, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                          <span className="font-semibold">الساعة {ph.time}</span>
                          <span className="text-indigo-600">{ph.avgListeners} مستمع</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">المدة</p>
                  <p className="font-bold text-lg">{analyticsData.duration_minutes} دقيقة</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">حجم الملف</p>
                  <p className="font-bold text-lg">{analyticsData.file_size_mb.toFixed(2)} ميجا</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">منذ التسجيل</p>
                  <p className="font-bold text-lg">{analyticsData.days_since_recording} يوم</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">متوسط المستمعين</p>
                  <p className="font-bold text-lg">{analyticsData.avg_listeners}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>لا توجد بيانات تحليلية متاحة لهذا التسجيل.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}