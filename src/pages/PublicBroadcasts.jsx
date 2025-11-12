import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Play, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BroadcastCard from "../components/broadcast/BroadcastCard";
import RecordingCard from "../components/broadcast/RecordingCard";
import SearchBar from "../components/broadcast/SearchBar";
import { Button } from "@/components/ui/button";

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function PublicBroadcasts() {
  const [contentType, setContentType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [sortBy, setSortBy] = useState("date");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: broadcasts = [], isLoading: loadingBroadcasts } = useQuery({
    queryKey: ['publicBroadcasts'],
    queryFn: () => base44.entities.Broadcast.list("-created_date"),
    refetchInterval: 5000,
  });

  const { data: recordings = [], isLoading: loadingRecordings } = useQuery({
    queryKey: ['publicRecordings'],
    queryFn: () => base44.entities.Recording.filter({ is_public: true }, "-created_date"),
    refetchInterval: 10000,
  });

  const filteredContent = useMemo(() => {
    let result = [];

    if (contentType === "all" || contentType === "live") {
      result = [...result, ...broadcasts.map(b => ({ ...b, type: 'broadcast' }))];
    }
    if (contentType === "all" || contentType === "recorded") {
      result = [...result, ...recordings.map(r => ({ ...r, type: 'recording' }))];
    }

    if (selectedCategory !== "الكل") {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      result = result.filter(item => {
        const itemDate = new Date(item.recorded_at || item.started_at || item.created_date).getTime();
        if (isNaN(itemDate)) return false;
        if (dateFilter === "today") return (now - itemDate) < dayMs;
        if (dateFilter === "week") return (now - itemDate) < (7 * dayMs);
        if (dateFilter === "month") return (now - itemDate) < (30 * dayMs);
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.broadcaster_name?.toLowerCase().includes(query) ||
        item.lecturer_name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    if (sortBy === "date") {
      result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === "popularity") {
      result.sort((a, b) => {
        const aCount = a.type === 'broadcast' ? (a.listener_count || 0) : (a.views_count || 0);
        const bCount = b.type === 'broadcast' ? (b.listener_count || 0) : (b.views_count || 0);
        return bCount - aCount;
      });
    }

    return result;
  }, [broadcasts, recordings, contentType, selectedCategory, dateFilter, searchQuery, sortBy]);

  const isLoading = loadingBroadcasts || loadingRecordings;

  const stats = {
    live: broadcasts.filter(b => b.is_live).length,
    recorded: recordings.length,
    total: broadcasts.length + recordings.length
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4"
            >
              <Radio className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              جميع البثوث والتسجيلات
            </h1>
            <p className="text-lg text-gray-600">
              استكشف المحتوى المباشر والمسجل
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">بث مباشر</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.live}</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">تسجيلات</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.recorded}</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">إجمالي المحتوى</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="mb-8 space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث في البثوث والتسجيلات..."
          />

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <Tabs value={contentType} onValueChange={setContentType} className="w-full md:w-auto">
              <TabsList className="grid w-full md:w-[500px] grid-cols-3 h-12 bg-white border-2 border-purple-100">
                <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold">
                  الكل
                </TabsTrigger>
                <TabsTrigger value="live" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold">
                  مباشر
                </TabsTrigger>
                <TabsTrigger value="recorded" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold">
                  مسجل
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 border-2 border-purple-100">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-11 border-2 border-purple-100">
                  <SelectValue placeholder="التاريخ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأوقات</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">آخر أسبوع</SelectItem>
                  <SelectItem value="month">آخر شهر</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 border-2 border-purple-100">
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">الأحدث</SelectItem>
                  <SelectItem value="popularity">الأكثر شعبية</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setSelectedCategory("الكل");
                  setDateFilter("all");
                  setSortBy("date");
                  setSearchQuery("");
                }}
                variant="outline"
                className="h-11 border-2 border-purple-100"
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">لم يتم العثور على محتوى</h3>
            <p className="text-gray-600">جرب تغيير الفلاتر أو البحث</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${contentType}-${selectedCategory}-${searchQuery}-${sortBy}-${dateFilter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredContent.map((item) => (
                item.type === 'broadcast' ? (
                  <BroadcastCard key={`broadcast-${item.id}`} broadcast={item} />
                ) : (
                  <RecordingCard key={`recording-${item.id}`} recording={item} />
                )
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}