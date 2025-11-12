import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Film, Clock, Eye, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SearchBar from "../components/broadcast/SearchBar";
import BroadcastCover from "../components/broadcast/BroadcastCover";

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function SeriesPublic() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [selectedSeries, setSelectedSeries] = useState(null);

  const { data: series = [], isLoading: seriesLoading } = useQuery({
    queryKey: ['publicSeries'],
    queryFn: () => base44.entities.Series.filter({ is_active: true }),
  });

  const { data: allRecordings = [] } = useQuery({
    queryKey: ['allRecordings'],
    queryFn: () => base44.entities.Recording.filter({ is_public: true }),
  });

  const filteredSeries = React.useMemo(() => {
    let result = series;

    if (selectedCategory !== "الكل") {
      result = result.filter(s => s.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(query) ||
        s.broadcaster_name?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [series, selectedCategory, searchQuery]);

  const getSeriesRecordings = (seriesId) => {
    return allRecordings
      .filter(r => r.series_id === seriesId)
      .sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
  };

  const getSeriesStats = (seriesId) => {
    const recordings = getSeriesRecordings(seriesId);
    return {
      count: recordings.length,
      duration: recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 60,
      views: recordings.reduce((sum, r) => sum + (r.views_count || 0), 0)
    };
  };

  const categoryColors = {
    "علوم شرعية": "bg-purple-100 text-purple-800",
    "تفسير القرآن": "bg-green-100 text-green-800",
    "الحديث النبوي": "bg-blue-100 text-blue-800",
    "الفقه الإسلامي": "bg-yellow-100 text-yellow-800",
    "السيرة النبوية": "bg-pink-100 text-pink-800",
    "تربية وتزكية": "bg-indigo-100 text-indigo-800",
    "نقاش": "bg-orange-100 text-orange-800",
    "أخرى": "bg-gray-100 text-gray-800"
  };

  if (selectedSeries) {
    const recordings = getSeriesRecordings(selectedSeries.id);

    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedSeries(null)}
            className="mb-6"
          >
            ← العودة للسلاسل
          </Button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2">{selectedSeries.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={categoryColors[selectedSeries.category]}>
                        {selectedSeries.category}
                      </Badge>
                      <span className="text-gray-600">🎙️ {selectedSeries.broadcaster_name}</span>
                    </div>
                    {selectedSeries.description && (
                      <p className="text-gray-600">{selectedSeries.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Film className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-blue-700">{recordings.length}</p>
                    <p className="text-sm text-blue-600">حلقة</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-700">{Math.floor(getSeriesStats(selectedSeries.id).duration)}</p>
                    <p className="text-sm text-green-600">دقيقة</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <Eye className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-purple-700">{getSeriesStats(selectedSeries.id).views}</p>
                    <p className="text-sm text-purple-600">مشاهدة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">حلقات السلسلة</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map((recording, index) => (
              <motion.div
                key={recording.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-2 border-purple-100 hover:shadow-xl transition-all overflow-hidden cursor-pointer group">
                  <BroadcastCover broadcastId={recording.broadcast_id} className="w-full" />
                  
                  <CardContent className="pt-4 space-y-3">
                    {recording.episode_number && (
                      <Badge className="bg-purple-100 text-purple-700">
                        الحلقة {recording.episode_number}
                      </Badge>
                    )}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                      {recording.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{Math.floor((recording.duration_seconds || 0) / 60)} دقيقة</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{recording.views_count || 0}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(createPageUrl(`ListenBroadcast?id=${recording.broadcast_id}`))}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                    >
                      <Play className="w-4 h-4" />
                      استمع الآن
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4">
            <Layers className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            السلاسل العلمية
          </h1>
          <p className="text-lg text-gray-600">
            تصفح مكتبة السلاسل المتكاملة في العلوم الشرعية
          </p>
        </motion.div>

        <div className="mb-8 space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث عن السلاسل..."
          />

          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-purple-100 hover:border-purple-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {seriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filteredSeries.length === 0 ? (
          <Card className="border-2 border-purple-100">
            <CardContent className="pt-12 pb-12 text-center">
              <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد سلاسل</h3>
              <p className="text-gray-600">
                {searchQuery ? "جرب البحث بكلمات مختلفة" : "لم يتم إضافة سلاسل بعد"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((s, index) => {
                const stats = getSeriesStats(s.id);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedSeries(s)}
                    className="cursor-pointer"
                  >
                    <Card className="border-2 border-purple-100 hover:shadow-xl transition-all h-full">
                      <CardHeader>
                        <CardTitle className="text-xl mb-2">{s.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={categoryColors[s.category]}>
                            {s.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">🎙️ {s.broadcaster_name}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {s.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{s.description}</p>
                        )}
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-700">{stats.count}</p>
                            <p className="text-xs text-blue-600">حلقة</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-700">{Math.floor(stats.duration)}</p>
                            <p className="text-xs text-green-600">دقيقة</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-700">{stats.views}</p>
                            <p className="text-xs text-purple-600">👁️</p>
                          </div>
                        </div>

                        <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                          عرض الحلقات
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}