import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Play, Pause, Heart, Clock, Eye, Layers, User,
  BookOpen, Radio, SlidersHorizontal, X, ChevronLeft, ArrowRight, Film, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import { useFloatingPlayer } from "../components/recording/FloatingPlayer";

const CATEGORIES = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];
const CATEGORY_COLORS = {
  "علوم شرعية":    "bg-purple-100 text-purple-800 border-purple-200",
  "تفسير القرآن":  "bg-green-100 text-green-800 border-green-200",
  "الحديث النبوي": "bg-blue-100 text-blue-800 border-blue-200",
  "الفقه الإسلامي":"bg-yellow-100 text-yellow-800 border-yellow-200",
  "السيرة النبوية":"bg-pink-100 text-pink-800 border-pink-200",
  "تربية وتزكية":  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "نقاش":          "bg-orange-100 text-orange-800 border-orange-200",
  "أخرى":          "bg-gray-100 text-gray-800 border-gray-200",
};
const FAVORITES_KEY = "digital_library_favorites";

const formatDuration = (s) => {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")} س`;
  if (m > 0) return `${m} د`;
  return `${s} ث`;
};
const safeDate = (d) => {
  try {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return formatDistanceToNow(dt, { addSuffix: true, locale: ar });
  } catch { return ""; }
};
function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function toggleFavorite(id) {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

// ── Recording Card ────────────────────────────────────────────────────────────
function RatingStars({ ratings }) {
  if (!ratings || ratings.length === 0) return null;
  const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= Math.round(avg) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
      ))}
      <span className="text-xs text-gray-400">({ratings.length})</span>
    </div>
  );
}

function RecordingCard({ recording, isFavorite, onToggleFavorite, seriesTitle, ratings }) {
  const navigate = useNavigate();
  const player = useFloatingPlayer();
  const isActive = player?.track?.id === recording.id;
  const isPlaying = isActive && player?.isPlaying;

  const handlePlay = async (e) => {
    e.stopPropagation();
    try {
      const response = await base44.functions.invoke("getR2FileWithCors", {
        file_url: recording.file_url,
        file_uri: recording.file_uri,
      });
      if (response.data?.url) {
        await player.play({ id: recording.id, title: recording.title, url: response.data.url });
        base44.entities.Recording.update(recording.id, { views_count: (recording.views_count || 0) + 1 }).catch(() => {});
      }
    } catch (err) {
      alert("فشل تشغيل التسجيل: " + err.message);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => navigate(createPageUrl(`RecordingDetails?id=${recording.id}`))}
      className={`cursor-pointer bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col group ${
        isActive ? "border-purple-400 shadow-lg shadow-purple-100" : "border-purple-100 hover:border-purple-300 hover:shadow-md"
      }`}
    >
      {/* Cover */}
      <div className="relative">
        <div className="w-full aspect-video bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
          {recording.broadcast_id ? (
            <BroadcastCover broadcastId={recording.broadcast_id} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Radio className="w-10 h-10 text-white/40" />
              <p className="text-white/80 font-bold text-sm text-center px-3 line-clamp-2">{recording.broadcaster_name}</p>
            </div>
          )}
        </div>
        {recording.category && (
          <div className="absolute top-2 right-2">
            <Badge className={`text-xs border ${CATEGORY_COLORS[recording.category] || CATEGORY_COLORS["أخرى"]}`}>
              {recording.category}
            </Badge>
          </div>
        )}
        {recording.duration_seconds > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md font-mono">
            {formatDuration(recording.duration_seconds)}
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-purple-900/20 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              {isPlaying ? <Pause className="w-5 h-5 text-purple-600" /> : <Play className="w-5 h-5 text-purple-600 ml-0.5" />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-purple-700 transition-colors">
            {recording.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{recording.broadcaster_name}</span>
          </div>
          {seriesTitle && (
            <div className="flex items-center gap-1 text-xs text-purple-600 mt-0.5">
              <Layers className="w-3 h-3" />
              <span>{seriesTitle}{recording.episode_number ? ` · الحلقة ${recording.episode_number}` : ""}</span>
            </div>
          )}
          {safeDate(recording.recorded_at || recording.created_date) && (
            <p className="text-xs text-gray-400 mt-0.5">{safeDate(recording.recorded_at || recording.created_date)}</p>
          )}
          <RatingStars ratings={ratings} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{recording.views_count || 0}</span>
        </div>
        <div className="flex gap-2 mt-auto">
          <Button
            onClick={handlePlay}
            size="sm"
            className={`flex-1 gap-1.5 rounded-xl ${isActive ? "bg-purple-600 hover:bg-purple-700" : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"}`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? "إيقاف" : "استمع"}
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recording.id); }}
            variant="outline" size="sm"
            className={`w-9 h-9 p-0 rounded-xl border-2 ${isFavorite ? "border-red-300 text-red-500 bg-red-50" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Series Card ───────────────────────────────────────────────────────────────
function SeriesCard({ series, stats, onClick }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} onClick={onClick} className="cursor-pointer group">
      <div className="bg-white rounded-2xl border-2 border-purple-100 group-hover:border-purple-300 group-hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
        <div className="relative aspect-video bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
          {series.thumbnail_url
            ? <img src={series.thumbnail_url} alt={series.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Layers className="w-12 h-12 text-white/50" />
                <p className="text-white/80 text-sm font-semibold px-4 text-center line-clamp-2">{series.title}</p>
              </div>
          }
          {series.category && (
            <div className="absolute top-2 right-2">
              <Badge className={`text-xs ${CATEGORY_COLORS[series.category] || CATEGORY_COLORS["أخرى"]}`}>{series.category}</Badge>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            <Film className="w-3 h-3" />{stats.count} حلقة
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div>
            <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-purple-700 transition-colors mb-1">{series.title}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500"><User className="w-3.5 h-3.5" /><span>{series.broadcaster_name}</span></div>
          </div>
          {series.description && <p className="text-sm text-gray-500 line-clamp-2">{series.description}</p>}
          <div className="grid grid-cols-3 gap-2 text-center mt-auto">
            <div className="bg-blue-50 rounded-xl py-2"><p className="font-bold text-blue-700 text-lg">{stats.count}</p><p className="text-xs text-blue-500">حلقة</p></div>
            <div className="bg-green-50 rounded-xl py-2"><p className="font-bold text-green-700 text-sm">{formatDuration(stats.totalSeconds) || "—"}</p><p className="text-xs text-green-500">المدة</p></div>
            <div className="bg-purple-50 rounded-xl py-2"><p className="font-bold text-purple-700 text-lg">{stats.views}</p><p className="text-xs text-purple-500">مشاهدة</p></div>
          </div>
          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2 rounded-xl">
            عرض الحلقات <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Library() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedBroadcaster, setSelectedBroadcaster] = useState("الكل");
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(getFavorites);

  const { data: recordings = [], isLoading: recLoading } = useQuery({
    queryKey: ["lib-recordings"],
    queryFn: () => base44.entities.Recording.list("-created_date", 300),
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ["lib-ratings"],
    queryFn: () => base44.entities.Rating.list(),
  });

  const ratingsMap = useMemo(() => {
    const map = {};
    allRatings.forEach(r => {
      if (!map[r.recording_id]) map[r.recording_id] = [];
      map[r.recording_id].push(r);
    });
    return map;
  }, [allRatings]);
  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ["lib-series"],
    queryFn: () => base44.entities.Series.filter({ is_active: true }),
  });

  const broadcasters = useMemo(() => {
    const unique = [...new Set(recordings.map(r => r.broadcaster_name).filter(Boolean))];
    return ["الكل", ...unique];
  }, [recordings]);

  const seriesMap = useMemo(() => Object.fromEntries(series.map(s => [s.id, s])), [series]);

  const getSeriesStats = (seriesId) => {
    const recs = recordings.filter(r => r.series_id === seriesId);
    return {
      count: recs.length,
      totalSeconds: recs.reduce((s, r) => s + (r.duration_seconds || 0), 0),
      views: recs.reduce((s, r) => s + (r.views_count || 0), 0),
    };
  };

  const filteredRecordings = useMemo(() => {
    let result = [...recordings];
    if (tab === "favorites") result = result.filter(r => favorites.includes(r.id));
    if (selectedCategory !== "الكل") result = result.filter(r => r.category === selectedCategory);
    if (selectedBroadcaster !== "الكل") result = result.filter(r => r.broadcaster_name === selectedBroadcaster);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.broadcaster_name?.toLowerCase().includes(q) ||
        seriesMap[r.series_id]?.title?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "date")     result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortBy === "views")    result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    else if (sortBy === "duration") result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    else if (sortBy === "title")    result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return result;
  }, [recordings, tab, favorites, selectedCategory, selectedBroadcaster, searchQuery, sortBy, seriesMap]);

  const filteredSeries = useMemo(() => {
    let result = [...series];
    if (selectedCategory !== "الكل") result = result.filter(s => s.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(q) || s.broadcaster_name?.toLowerCase().includes(q));
    }
    return result;
  }, [series, selectedCategory, searchQuery]);

  const handleToggleFavorite = (id) => setFavorites(toggleFavorite(id));
  const hasFilters = selectedCategory !== "الكل" || selectedBroadcaster !== "الكل" || sortBy !== "date";
  const resetFilters = () => { setSelectedCategory("الكل"); setSelectedBroadcaster("الكل"); setSortBy("date"); setSearchQuery(""); };

  const stats = {
    total: recordings.length,
    totalViews: recordings.reduce((s, r) => s + (r.views_count || 0), 0),
    totalMinutes: Math.floor(recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 60),
    totalSeries: series.length,
  };

  // Series detail view
  if (selectedSeries) {
    const seriesRecordings = recordings
      .filter(r => r.series_id === selectedSeries.id)
      .sort((a, b) => (a.episode_number || 999) - (b.episode_number || 999));
    const sStats = getSeriesStats(selectedSeries.id);
    return (
      <div className="min-h-screen p-4 md:p-8 pb-28" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedSeries(null)} className="mb-6 gap-2 rounded-xl">
            <ArrowRight className="w-4 h-4" />العودة للمكتبة
          </Button>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden">
              {selectedSeries.thumbnail_url
                ? <img src={selectedSeries.thumbnail_url} alt={selectedSeries.title} className="w-full h-48 object-cover" />
                : <div className="w-full h-32 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Layers className="w-16 h-16 text-white/40" />
                  </div>
              }
              <div className="p-6">
                {selectedSeries.category && <Badge className={`mb-2 ${CATEGORY_COLORS[selectedSeries.category] || CATEGORY_COLORS["أخرى"]}`}>{selectedSeries.category}</Badge>}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{selectedSeries.title}</h1>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-3"><User className="w-4 h-4" /><span>{selectedSeries.broadcaster_name}</span></div>
                {selectedSeries.description && <p className="text-gray-600 text-sm leading-relaxed">{selectedSeries.description}</p>}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center"><Film className="w-5 h-5 text-blue-500 mx-auto mb-1" /><p className="text-xl font-bold text-blue-700">{sStats.count}</p><p className="text-xs text-blue-500">حلقة</p></div>
                  <div className="bg-green-50 rounded-xl p-3 text-center"><Clock className="w-5 h-5 text-green-500 mx-auto mb-1" /><p className="text-sm font-bold text-green-700">{formatDuration(sStats.totalSeconds) || "—"}</p><p className="text-xs text-green-500">المدة</p></div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center"><Eye className="w-5 h-5 text-purple-500 mx-auto mb-1" /><p className="text-xl font-bold text-purple-700">{sStats.views}</p><p className="text-xs text-purple-500">مشاهدة</p></div>
                </div>
              </div>
            </div>
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-600" />حلقات السلسلة
            <Badge className="bg-purple-100 text-purple-700">{seriesRecordings.length}</Badge>
          </h2>
          {seriesRecordings.length === 0
            ? <div className="text-center py-16 bg-white rounded-2xl border-2 border-purple-100"><Radio className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">لا توجد حلقات في هذه السلسلة بعد</p></div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {seriesRecordings.map(r => (
                  <RecordingCard key={r.id} recording={r} isFavorite={favorites.includes(r.id)} onToggleFavorite={handleToggleFavorite} seriesTitle={null} ratings={ratingsMap[r.id]} />
                ))}
              </div>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-28" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">المكتبة</h1>
          <p className="text-gray-500">مكتبة شاملة للدروس والمحاضرات المسجلة</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto mt-6">
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 text-center"><Radio className="w-4 h-4 text-purple-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{stats.total.toLocaleString()}</p><p className="text-xs text-gray-500">تسجيل</p></div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center"><Layers className="w-4 h-4 text-blue-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{stats.totalSeries.toLocaleString()}</p><p className="text-xs text-gray-500">سلسلة</p></div>
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 text-center"><Eye className="w-4 h-4 text-pink-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p><p className="text-xs text-gray-500">مشاهدة</p></div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center"><Clock className="w-4 h-4 text-green-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{stats.totalMinutes.toLocaleString()}</p><p className="text-xs text-gray-500">دقيقة</p></div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          {[
            { id: "all", label: "جميع التسجيلات", icon: Radio },
            { id: "series", label: "السلاسل", icon: Layers },
            { id: "favorites", label: `المفضلة (${favorites.length})`, icon: Heart },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${tab === t.id ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md" : "bg-white text-gray-600 border-purple-100 hover:border-purple-300"}`}
            >
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tab === "series" ? "ابحث عن سلسلة..." : "ابحث بالعنوان أو اسم المحاضر..."}
                className="pr-9 h-11 border-2 rounded-xl"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}
              className={`h-11 gap-2 border-2 rounded-xl ${showFilters ? "bg-purple-50 border-purple-300 text-purple-700" : ""}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">فلترة</span>
              {hasFilters && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
            </Button>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-purple-50/60 rounded-2xl p-4 border border-purple-100">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-2 h-10 bg-white rounded-xl"><SelectValue placeholder="التصنيف" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  {tab !== "series" && (
                    <Select value={selectedBroadcaster} onValueChange={setSelectedBroadcaster}>
                      <SelectTrigger className="border-2 h-10 bg-white rounded-xl"><SelectValue placeholder="المحاضر" /></SelectTrigger>
                      <SelectContent>{broadcasters.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {tab !== "series" && (
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="border-2 h-10 bg-white rounded-xl"><SelectValue placeholder="الترتيب" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">الأحدث</SelectItem>
                        <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                        <SelectItem value="duration">الأطول مدة</SelectItem>
                        <SelectItem value="title">الاسم (أ-ي)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {hasFilters && <div className="flex justify-end mt-2"><Button onClick={resetFilters} variant="ghost" size="sm" className="text-xs text-gray-500 gap-1"><X className="w-3 h-3" /> إعادة تعيين</Button></div>}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-sm text-gray-500 px-1">
            عرض <span className="font-bold text-purple-700">{tab === "series" ? filteredSeries.length : filteredRecordings.length}</span>{" "}
            {tab === "series" ? `من ${series.length} سلسلة` : `من ${recordings.length} تسجيل`}
          </p>
        </div>

        {/* Content */}
        {(recLoading || seriesLoading) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border-2 border-purple-100">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-9 w-full mt-3" /></div>
              </div>
            ))}
          </div>
        ) : tab === "series" ? (
          filteredSeries.length === 0
            ? <div className="text-center py-24 bg-white rounded-2xl border-2 border-purple-100"><Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد سلاسل</h3><p className="text-gray-400">{searchQuery ? "جرب كلمات بحث مختلفة" : "لم تُضَف سلاسل بعد"}</p></div>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSeries.map(s => <SeriesCard key={s.id} series={s} stats={getSeriesStats(s.id)} onClick={() => setSelectedSeries(s)} />)}
              </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-purple-100">
            {tab === "favorites" ? <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" /> : <Radio className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
            <h3 className="text-xl font-bold text-gray-700 mb-2">{tab === "favorites" ? "لا توجد دروس في المفضلة" : "لا توجد تسجيلات"}</h3>
            <p className="text-gray-400">{tab === "favorites" ? "اضغط على أيقونة القلب ❤️ لحفظ الدروس المفضلة" : searchQuery ? "جرب كلمات بحث مختلفة" : "لم يتم العثور على نتائج"}</p>
            {hasFilters && tab !== "favorites" && <Button onClick={resetFilters} variant="outline" className="gap-2 mt-4"><X className="w-4 h-4" /> إزالة الفلاتر</Button>}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredRecordings.map(r => (
                <RecordingCard key={r.id} recording={r} isFavorite={favorites.includes(r.id)} onToggleFavorite={handleToggleFavorite} seriesTitle={r.series_id ? seriesMap[r.series_id]?.title : null} ratings={ratingsMap[r.id]} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}