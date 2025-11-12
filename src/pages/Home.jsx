
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, TrendingUp, Clock, Award, Calendar, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import BroadcastCard from "../components/broadcast/BroadcastCard";
import SearchBar from "../components/broadcast/SearchBar";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import { useNavigate } from "react-router-dom";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // Added import for Select components

const categories = ["الكل", "علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function Home() {
  const [filter, setFilter] = useState("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [sortBy, setSortBy] = useState("date"); // New state for sorting
  const [dateFilter, setDateFilter] = useState("all"); // New state for date filtering
  const [currentTime, setCurrentTime] = useState(Date.now());

  const navigate = useNavigate();

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => base44.entities.Broadcast.list("-created_date"),
    refetchInterval: 5000,
  });

  // Fetch scheduled broadcasts
  const { data: scheduledBroadcasts = [] } = useQuery({
    queryKey: ['scheduledBroadcastsHome'],
    queryFn: () => base44.entities.Broadcast.filter({ is_scheduled: true, is_live: false }),
    refetchInterval: 10000,
  });

  const filteredBroadcasts = useMemo(() => {
    let result = broadcasts;

    // Filter by live status
    if (filter === "live") {
      result = result.filter(b => b.is_live);
    }

    // Filter by category
    if (selectedCategory !== "الكل") {
      result = result.filter(b => b.category === selectedCategory);
    }

    // NEW: Date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000; // Milliseconds in a day
      result = result.filter(b => {
        // Use started_at if available, otherwise created_date
        const broadcastDateTime = b.started_at ? new Date(b.started_at).getTime() : new Date(b.created_date).getTime();
        
        if (dateFilter === "today") return (now - broadcastDateTime) < dayMs;
        if (dateFilter === "week") return (now - broadcastDateTime) < (7 * dayMs);
        if (dateFilter === "month") return (now - broadcastDateTime) < (30 * dayMs); // Approximation for a month
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title?.toLowerCase().includes(query) ||
        b.broadcaster_name?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query)
      );
    }

    // Create a copy of the result before sorting to avoid mutating the original array
    let sortableResult = [...result];

    // NEW: Sort
    if (sortBy === "date") {
      sortableResult.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    } else if (sortBy === "listeners") {
      sortableResult.sort((a, b) => (b.listener_count || 0) - (a.listener_count || 0));
    }

    return sortableResult;
  }, [broadcasts, filter, selectedCategory, dateFilter, searchQuery, sortBy]);

  const trendingBroadcasts = useMemo(() => {
    return [...broadcasts]
      .filter(b => b.is_live)
      .sort((a, b) => (b.listener_count || 0) - (a.listener_count || 0))
      .slice(0, 3);
  }, [broadcasts]);

  const upcomingBroadcasts = useMemo(() => {
    return scheduledBroadcasts
      .filter(b => new Date(b.scheduled_at) > new Date(currentTime))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3);
  }, [scheduledBroadcasts, currentTime]);

  const getTimeRemaining = (scheduledAt) => {
    const now = new Date(currentTime);
    const scheduled = new Date(scheduledAt);
    const diff = scheduled - now;
    
    if (diff < 0) return "الآن";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `بعد ${days} يوم و ${hours} ساعة`;
    if (hours > 0) return `بعد ${hours} ساعة و ${minutes} دقيقة`;
    if (minutes > 0) return `بعد ${minutes} دقيقة و ${seconds} ثانية`;
    return `بعد ${seconds} ثانية`;
  };

  const stats = {
    live: broadcasts.filter(b => b.is_live).length,
    total: broadcasts.length,
    listeners: broadcasts.reduce((sum, b) => sum + (b.listener_count || 0), 0),
    scheduled: scheduledBroadcasts.length
  };

  // Handler for scheduled broadcast click
  const handleScheduledBroadcastClick = (broadcast) => {
    navigate(`/WaitingRoom?id=${broadcast.id}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
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
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4 live-pulse"
            >
              <Radio className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              مرحباً بك في بث حي
            </h1>
            <p className="text-lg text-gray-600">
              استمع وشارك البث الصوتي المباشر من أي مكان
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">بث مباشر الآن</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.live}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">مستمع نشط</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.listeners}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">إجمالي البثوث</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">بثوث مجدولة</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.scheduled}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Upcoming Scheduled Broadcasts */}
        {upcomingBroadcasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-green-500 animate-pulse" />
              <h2 className="text-2xl font-bold text-gray-900">البثوث القادمة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingBroadcasts.map((broadcast, index) => (
                <motion.div
                  key={broadcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleScheduledBroadcastClick(broadcast)}
                  className="cursor-pointer"
                >
                  <Card className="border-2 border-green-100 hover:shadow-xl transition-all hover:scale-105 overflow-hidden">
                    <BroadcastCover broadcastId={broadcast.id} className="w-full" />
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Calendar className="w-3 h-3 mr-1" />
                          مجدول
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700">
                          {broadcast.category}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {broadcast.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        المحاضر: {broadcast.lecturer_name}
                      </p>
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <p className="text-sm font-bold text-green-700">
                          ⏰ يبدأ {getTimeRemaining(broadcast.scheduled_at)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {new Date(broadcast.scheduled_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trending Broadcasts */}
        {trendingBroadcasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">البثوث الشائعة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingBroadcasts.map((broadcast, index) => (
                <motion.div
                  key={broadcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <BroadcastCard broadcast={broadcast} autoStartListening={true} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث عن البثوث حسب العنوان، المذيع، أو الوصف..."
          />

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-[400px]">
              <TabsList className="grid w-full md:w-[400px] grid-cols-2 h-12 bg-white border-2 border-purple-100">
                <TabsTrigger 
                  value="live" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold text-base"
                >
                  مباشر الآن
                </TabsTrigger>
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold text-base"
                >
                  جميع البثوث
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* NEW: Advanced dropdown filters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
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
                  <SelectItem value="listeners">الأكثر استماعاً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Broadcasts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Radio className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {searchQuery ? "لم يتم العثور على نتائج" : filter === "live" ? "لا يوجد بث مباشر الآن" : "لا توجد بثوث بعد"}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? "جرب البحث بكلمات مختلفة" : filter === "live" ? "كن أول من يبدأ بث مباشر!" : "ابدأ أول بث لك الآن"}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${filter}-${selectedCategory}-${searchQuery}-${dateFilter}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredBroadcasts.map((broadcast) => (
                <BroadcastCard key={broadcast.id} broadcast={broadcast} autoStartListening={filter === "live"} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
