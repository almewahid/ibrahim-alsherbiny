import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, TrendingUp, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BroadcastCard from "../components/broadcast/BroadcastCard";

export default function MyBroadcasts() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ['myBroadcasts', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      const allBroadcasts = await base44.entities.Broadcast.filter(
        { broadcaster_id: user.id },
        "-created_date"
      );
      if (filter === "live") {
        return allBroadcasts.filter(b => b.is_live);
      }
      return allBroadcasts;
    },
    enabled: !!user,
    refetchInterval: 5000,
    initialData: [],
  });

  const stats = {
    total: broadcasts.length,
    live: broadcasts.filter(b => b.is_live).length,
    totalListeners: broadcasts.reduce((sum, b) => sum + (b.total_listeners || 0), 0),
    totalDuration: broadcasts.reduce((sum, b) => sum + (b.duration_minutes || 0), 0)
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              بثوثي
            </h1>
            <p className="text-lg text-gray-600">
              إحصائيات وسجل بثوثك المباشرة
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="text-center">
                <Radio className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">إجمالي البثوث</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">بث نشط</p>
                <p className="text-3xl font-bold text-gray-900">{stats.live}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">إجمالي المستمعين</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalListeners}</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-lg"
            >
              <div className="text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">إجمالي الوقت</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalDuration}</p>
                <p className="text-xs text-gray-500">دقيقة</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2 h-12 bg-white border-2 border-purple-100">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold text-base"
              >
                جميع البثوث
              </TabsTrigger>
              <TabsTrigger 
                value="live" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold text-base"
              >
                المباشر الآن
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
        ) : broadcasts.length === 0 ? (
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
                  {filter === "live" ? "لا يوجد بث مباشر" : "لم تبدأ أي بث بعد"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === "live" ? "ليس لديك بثوث نشطة حالياً" : "ابدأ أول بث مباشر لك الآن!"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {broadcasts.map((broadcast) => (
                <BroadcastCard key={broadcast.id} broadcast={broadcast} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}