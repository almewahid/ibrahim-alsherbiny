import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Film, Clock, Eye, Play, Search, ArrowRight, User, ChevronLeft, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BroadcastCover from "../components/broadcast/BroadcastCover";

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

const categoryColors = {
  "علوم شرعية": "bg-purple-100 text-purple-800",
  "تفسير القرآن": "bg-green-100 text-green-800",
  "الحديث النبوي": "bg-blue-100 text-blue-800",
  "الفقه الإسلامي": "bg-yellow-100 text-yellow-800",
  "السيرة النبوية": "bg-pink-100 text-pink-800",
  "تربية وتزكية": "bg-indigo-100 text-indigo-800",
  "نقاش": "bg-orange-100 text-orange-800",
  "أخرى": "bg-gray-100 text-gray-800",
};

const formatDuration = (seconds) => {
  if (!seconds) return "0 د";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} س ${m} د`;
  return `${m} د`;
};

function SeriesCard({ series, stats, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="bg-white rounded-2xl border-2 border-purple-100 group-hover:border-purple-300 group-hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-purple-600 to-pink-600 overflow-hidden">
          {series.thumbnail_url ? (
            <img src={series.thumbnail_url} alt={series.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Layers className="w-12 h-12 text-white/60" />
              <p className="text-white/80 text-sm font-semibold text-center px-4 line-clamp-2">{series.title}</p>
            </div>
          )}
          {series.category && (
            <div className="absolute top-2 right-2">
              <Badge className={`text-xs ${categoryColors[series.category] || categoryColors["أخرى"]}`}>
                {series.category}
              </Badge>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            <Film className="w-3 h-3" />
            {stats.count} حلقة
          </div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div>
            <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-purple-700 transition-colors mb-1">
              {series.title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <User className="w-3.5 h-3.5" />
              <span>{series.broadcaster_name}</span>
            </div>
          </div>
          {series.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{series.description}</p>
          )}

          <div className="grid grid-cols-3 gap-2 text-center mt-auto">
            <div className="bg-blue-50 rounded-xl py-2">
              <p className="font-bold text-blue-700 text-lg">{stats.count}</p>
              <p className="text-xs text-blue-500">حلقة</p>
            </div>
            <div className="bg-green-50 rounded-xl py-2">
              <p className="font-bold text-green-700 text-sm">{formatDuration(stats.totalSeconds)}</p>
              <p className="text-xs text-green-500">المدة</p>
            </div>
            <div className="bg-purple-50 rounded-xl py-2">
              <p className="font-bold text-purple-700 text-lg">{stats.views}</p>
              <p className="text-xs text-purple-500">مشاهدة</p>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2 rounded-xl">
            عرض الحلقات
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EpisodeRow({ recording, index, onPlay }) {
  const hasCover = !!recording.cover_id;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-4 bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 hover:shadow-md transition-all p-3 group"
    >
      {/* Thumbnail / Episode number */}
      <div className="w-20 h-14 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center relative">
        {hasCover ? (
          <BroadcastCover broadcastId={recording.broadcast_id} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-bold text-xl">
            {recording.episode_number || index + 1}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start gap-2 mb-1">
          {recording.episode_number && (
            <Badge className="bg-purple-100 text-purple-700 shrink-0 text-xs">الحلقة {recording.episode_number}</Badge>
          )}
        </div>
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-purple-700 transition-colors">
          {recording.title}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(recording.duration_seconds)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{recording.views_count || 0}</span>
        </div>
      </div>

      {/* Play button */}
      <Button
        onClick={() => onPlay(recording)}
        size="sm"
        className="shrink-0 self-center bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl gap-1"
      >
        <Play className="w-4 h-4" />
        <span className="hidden sm:inline">استمع</span>
      </Button>
    </motion.div>
  );
}

export default function SeriesPublic() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedSeries, setSelectedSeries] = useState(null);

  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ["publicSeries"],
    queryFn: () => base44.entities.Series.filter({ is_active: true }),
  });

  const { data: allRecordings = [] } = useQuery({
    queryKey: ["allRecordingsForSeries"],
    queryFn: () => base44.entities.Recording.list('-created_date', 200),
  });

  const getSeriesRecordings = (seriesId) =>
    allRecordings
      .filter(r => r.series_id === seriesId)
      .sort((a, b) => (a.episode_number || 999) - (b.episode_number || 999));

  const getSeriesStats = (seriesId) => {
    const recs = getSeriesRecordings(seriesId);
    return {
      count: recs.length,
      totalSeconds: recs.reduce((s, r) => s + (r.duration_seconds || 0), 0),
      views: recs.reduce((s, r) => s + (r.views_count || 0), 0),
    };
  };

  const filteredSeries = useMemo(() => {
    let result = series;
    if (selectedCategory !== "الكل") result = result.filter(s => s.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.broadcaster_name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [series, selectedCategory, searchQuery]);

  const handlePlayEpisode = (recording) => {
    navigate(createPageUrl(`RecordingDetails?id=${recording.id}`));
  };

  // Series detail view
  if (selectedSeries) {
    const recordings = getSeriesRecordings(selectedSeries.id);
    const stats = getSeriesStats(selectedSeries.id);

    return (
      <div className="min-h-screen p-4 md:p-8" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" onClick={() => setSelectedSeries(null)} className="mb-6 gap-2 rounded-xl">
            <ArrowRight className="w-4 h-4" />
            العودة للسلاسل
          </Button>

          {/* Series Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden">
              {selectedSeries.thumbnail_url && (
                <img src={selectedSeries.thumbnail_url} alt={selectedSeries.title} className="w-full h-48 object-cover" />
              )}
              {!selectedSeries.thumbnail_url && (
                <div className="w-full h-32 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Layers className="w-16 h-16 text-white/40" />
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {selectedSeries.category && (
                    <Badge className={categoryColors[selectedSeries.category] || categoryColors["أخرى"]}>
                      {selectedSeries.category}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{selectedSeries.title}</h1>
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                  <User className="w-4 h-4" />
                  <span>{selectedSeries.broadcaster_name}</span>
                </div>
                {selectedSeries.description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{selectedSeries.description}</p>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <Film className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-700">{stats.count}</p>
                    <p className="text-xs text-blue-500">حلقة</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-green-700">{formatDuration(stats.totalSeconds)}</p>
                    <p className="text-xs text-green-500">المدة</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <Eye className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-purple-700">{stats.views}</p>
                    <p className="text-xs text-purple-500">مشاهدة</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Episodes */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-600" />
              حلقات السلسلة
              <Badge className="bg-purple-100 text-purple-700">{recordings.length}</Badge>
            </h2>
            {recordings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-purple-100">
                <Radio className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد حلقات في هذه السلسلة بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((recording, index) => (
                  <EpisodeRow
                    key={recording.id}
                    recording={recording}
                    index={index}
                    onPlay={handlePlayEpisode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Series list view
  return (
    <div className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">سلاسل الدروس</h1>
          <p className="text-gray-500">تصفح المكتبة الكاملة من السلاسل العلمية المتكاملة</p>
        </motion.div>

        {/* Search */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن سلسلة..."
              className="pr-9 h-11 border-2 rounded-xl"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                  selectedCategory === cat
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md"
                    : "bg-white text-gray-600 border-purple-100 hover:border-purple-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500">
            <span className="font-bold text-purple-700">{filteredSeries.length}</span> سلسلة
          </p>
        </div>

        {/* Grid */}
        {seriesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
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
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-purple-100">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد سلاسل</h3>
            <p className="text-gray-400">{searchQuery ? "جرب كلمات بحث مختلفة" : "لم يتم إضافة سلاسل بعد"}</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map(s => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  stats={getSeriesStats(s.id)}
                  onClick={() => setSelectedSeries(s)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}