import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Search, Filter, Play, Pause, SkipBack, SkipForward,
  Download, Clock, Eye, Users, Radio, X, Calendar, User, Layers, SlidersHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import BroadcastCover from "../components/broadcast/BroadcastCover";

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const safeFormatDate = (dateString) => {
  try {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
};

const categoryColors = {
  "علوم شرعية": "bg-purple-100 text-purple-800 border-purple-200",
  "تفسير القرآن": "bg-green-100 text-green-800 border-green-200",
  "الحديث النبوي": "bg-blue-100 text-blue-800 border-blue-200",
  "الفقه الإسلامي": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "السيرة النبوية": "bg-pink-100 text-pink-800 border-pink-200",
  "تربية وتزكية": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "نقاش": "bg-orange-100 text-orange-800 border-orange-200",
  "أخرى": "bg-gray-100 text-gray-800 border-gray-200",
};

function ArchiveCard({ recording, isActive, isPlaying, currentTime, duration, onPlay, onSeek, onSkipBack, onSkipForward, onDownload }) {
  const hasCover = !!recording.cover_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Cover or Fallback */}
      <div className="relative">
        {hasCover ? (
          <div className="w-full aspect-video bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
            <BroadcastCover broadcastId={recording.broadcast_id} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-purple-600 to-pink-600 flex flex-col items-center justify-center gap-2">
            <Radio className="w-10 h-10 text-white/60" />
            <p className="text-white font-bold text-lg text-center px-4 line-clamp-2">
              {recording.broadcaster_name || "المحاضر"}
            </p>
          </div>
        )}

        {/* Category badge overlay */}
        {recording.category && (
          <div className="absolute top-2 right-2">
            <Badge className={`text-xs border ${categoryColors[recording.category] || categoryColors["أخرى"]}`}>
              {recording.category}
            </Badge>
          </div>
        )}

        {/* Duration overlay */}
        {recording.duration_seconds > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-mono">
            {formatTime(recording.duration_seconds)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1">{recording.title}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span>{recording.broadcaster_name}</span>
          </div>
          {recording.series_id && recording.episode_number && (
            <Badge variant="outline" className="mt-1 text-xs">الحلقة {recording.episode_number}</Badge>
          )}
          {safeFormatDate(recording.recorded_at || recording.created_date) && (
            <p className="text-xs text-gray-400 mt-1">{safeFormatDate(recording.recorded_at || recording.created_date)}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{recording.views_count || 0}</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{recording.peak_listeners || 0}</span>
          {recording.file_size_mb > 0 && (
            <span className="text-gray-400">{recording.file_size_mb.toFixed(1)} م</span>
          )}
        </div>

        {/* Player - shown when active */}
        {isActive ? (
          <div className="space-y-2 bg-purple-50 rounded-xl p-3 mt-auto">
            <div className="flex justify-between text-xs text-gray-600 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={onSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-center items-center gap-2">
              <Button onClick={onSkipBack} variant="outline" size="sm" className="h-8 w-8 p-0">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => onPlay(recording)}
                size="sm"
                className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button onClick={onSkipForward} variant="outline" size="sm" className="h-8 w-8 p-0">
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button onClick={() => onDownload(recording)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => onPlay(recording)}
            className="w-full mt-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2 rounded-xl"
          >
            <Play className="w-4 h-4" />
            تشغيل
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function BroadcastArchive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedBroadcaster, setSelectedBroadcaster] = useState("الكل");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showFilters, setShowFilters] = useState(false);

  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.pause();
    };
  }, []);

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["recordings-archive"],
    queryFn: () => base44.entities.Recording.list("-created_date"),
  });

  const { data: series = [] } = useQuery({
    queryKey: ["series-archive"],
    queryFn: () => base44.entities.Series.list(),
  });

  const broadcasters = useMemo(() => {
    const unique = [...new Set(recordings.map(r => r.broadcaster_name).filter(Boolean))];
    return ["الكل", ...unique];
  }, [recordings]);

  const filteredRecordings = useMemo(() => {
    let result = [...recordings];
    if (selectedCategory !== "الكل") result = result.filter(r => r.category === selectedCategory);
    if (selectedBroadcaster !== "الكل") result = result.filter(r => r.broadcaster_name === selectedBroadcaster);
    if (dateFilter !== "all") {
      const now = Date.now();
      const dayMs = 86400000;
      const limits = { today: dayMs, week: 7 * dayMs, month: 30 * dayMs, year: 365 * dayMs };
      result = result.filter(r => (now - new Date(r.recorded_at || r.created_date).getTime()) < limits[dateFilter]);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.broadcaster_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "date") result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === "views") result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    else if (sortBy === "duration") result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    else if (sortBy === "title") result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return result;
  }, [recordings, selectedCategory, selectedBroadcaster, dateFilter, searchQuery, sortBy]);

  // Group by series
  const grouped = useMemo(() => {
    const bySeries = {};
    const standalone = [];
    filteredRecordings.forEach(r => {
      if (r.series_id) {
        if (!bySeries[r.series_id]) bySeries[r.series_id] = [];
        bySeries[r.series_id].push(r);
      } else {
        standalone.push(r);
      }
    });
    return { bySeries, standalone };
  }, [filteredRecordings]);

  const playRecording = async (recording) => {
    if (playingId === recording.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (playingId === recording.id && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }
    try {
      const response = await base44.functions.invoke("getR2FileWithCors", {
        file_url: recording.file_url,
        file_uri: recording.file_uri,
      });
      if (response.data?.url) {
        audioRef.current.src = response.data.url;
        setPlayingId(recording.id);
        setCurrentTime(0);
        await base44.entities.Recording.update(recording.id, { views_count: (recording.views_count || 0) + 1 });
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      alert("فشل تشغيل التسجيل: " + err.message);
    }
  };

  const downloadRecording = async (recording) => {
    try {
      const response = await base44.functions.invoke("getR2FileWithCors", {
        file_url: recording.file_url,
        file_uri: recording.file_uri,
      });
      if (response.data?.url) {
        const a = document.createElement("a");
        a.href = response.data.url;
        a.download = `${recording.title}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert("فشل تحميل التسجيل: " + err.message);
    }
  };

  const resetFilters = () => {
    setSelectedCategory("الكل");
    setSelectedBroadcaster("الكل");
    setDateFilter("all");
    setSortBy("date");
    setSearchQuery("");
  };

  const hasActiveFilters = selectedCategory !== "الكل" || selectedBroadcaster !== "الكل" || dateFilter !== "all" || sortBy !== "date" || searchQuery;

  const stats = {
    total: recordings.length,
    totalViews: recordings.reduce((s, r) => s + (r.views_count || 0), 0),
    totalMinutes: Math.floor(recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60),
  };

  const cardProps = { isPlaying, currentTime, duration, onPlay: playRecording, onSeek: (v) => { audioRef.current.currentTime = v[0]; setCurrentTime(v[0]); }, onSkipBack: () => { audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }, onSkipForward: () => { audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10); }, onDownload: downloadRecording };

  return (
    <div className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
              <Radio className="w-4 h-4" />
              أرشيف البثوث
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">أرشيف البثوث السابقة</h1>
            <p className="text-gray-500">استمع إلى جميع التسجيلات في أي وقت ومكان</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center">
              <Radio className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              <p className="text-xs text-gray-500">تسجيل</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
              <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs text-gray-500">مشاهدة</p>
            </div>
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 text-center">
              <Clock className="w-5 h-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{stats.totalMinutes.toLocaleString()}</p>
              <p className="text-xs text-gray-500">دقيقة</p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالعنوان أو اسم المحاضر..."
                className="pr-9 h-11 border-2 rounded-xl"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 gap-2 border-2 rounded-xl ${showFilters ? "bg-purple-50 border-purple-300 text-purple-700" : ""}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">تصفية</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-purple-50/60 rounded-2xl p-4 border border-purple-100">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-2 h-10 bg-white rounded-xl">
                      <Filter className="w-4 h-4 ml-1 text-gray-400" />
                      <SelectValue placeholder="التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedBroadcaster} onValueChange={setSelectedBroadcaster}>
                    <SelectTrigger className="border-2 h-10 bg-white rounded-xl">
                      <User className="w-4 h-4 ml-1 text-gray-400" />
                      <SelectValue placeholder="المحاضر" />
                    </SelectTrigger>
                    <SelectContent>
                      {broadcasters.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="border-2 h-10 bg-white rounded-xl">
                      <Calendar className="w-4 h-4 ml-1 text-gray-400" />
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
                    <SelectTrigger className="border-2 h-10 bg-white rounded-xl">
                      <SelectValue placeholder="الترتيب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">الأحدث</SelectItem>
                      <SelectItem value="title">الاسم (أ-ي)</SelectItem>
                      <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                      <SelectItem value="duration">الأطول مدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <div className="flex justify-end mt-2">
                    <Button onClick={resetFilters} variant="ghost" size="sm" className="text-xs text-gray-500 gap-1">
                      <X className="w-3 h-3" /> إعادة تعيين الفلاتر
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between text-sm text-gray-500 px-1">
            <span>عرض <span className="font-bold text-purple-700">{filteredRecordings.length}</span> من {recordings.length} تسجيل</span>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border-2 border-purple-100">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد تسجيلات</h3>
            <p className="text-gray-400 mb-4">{searchQuery ? "جرب كلمات بحث مختلفة" : "لم يتم العثور على نتائج مطابقة"}</p>
            {hasActiveFilters && (
              <Button onClick={resetFilters} variant="outline" className="gap-2">
                <X className="w-4 h-4" /> إزالة الفلاتر
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-10">
              {/* Series groups */}
              {Object.keys(grouped.bySeries).map(seriesId => {
                const seriesInfo = series.find(s => s.id === seriesId);
                return (
                  <div key={seriesId}>
                    <div className="flex items-center gap-3 mb-4">
                      <Layers className="w-5 h-5 text-purple-600" />
                      <h2 className="text-xl font-bold text-gray-900">{seriesInfo?.title || "سلسلة"}</h2>
                      <Badge className="bg-purple-100 text-purple-700">{grouped.bySeries[seriesId].length} حلقة</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {grouped.bySeries[seriesId].map(r => (
                        <ArchiveCard key={r.id} recording={r} isActive={playingId === r.id} {...cardProps} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Standalone */}
              {grouped.standalone.length > 0 && (
                <div>
                  {Object.keys(grouped.bySeries).length > 0 && (
                    <h2 className="text-xl font-bold text-gray-900 mb-4">تسجيلات أخرى</h2>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {grouped.standalone.map(r => (
                      <ArchiveCard key={r.id} recording={r} isActive={playingId === r.id} {...cardProps} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}