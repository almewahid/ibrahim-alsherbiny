
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart as BarChartIcon, LineChart, PieChart, TrendingUp, Users, Radio, Eye, Clock, Calendar, Award, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Analytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin' && currentUser.custom_role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['analyticsBroadcasts'], // Corrected queryKey from 'analyticsB roadcasts'
    queryFn: () => base44.entities.Broadcast.list("-created_date"),
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['analyticsRecordings'],
    queryFn: () => base44.entities.Recording.list("-created_date"),
  });

  const { data: listenerStats = [] } = useQuery({
    queryKey: ['analyticsListenerStats'],
    queryFn: () => base44.entities.ListenerStats.list("-timestamp"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['analyticsUsers'],
    queryFn: () => base44.asServiceRole.entities.User.list(),
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const getTimeFilter = () => {
      if (timeRange === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (timeRange === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000);
      return new Date(now - 365 * 24 * 60 * 60 * 1000);
    };
    const timeFilter = getTimeFilter();

    const recentBroadcasts = broadcasts.filter(b => 
      new Date(b.created_date) >= timeFilter
    );

    const recentRecordings = recordings.filter(r => 
      new Date(r.created_date) >= timeFilter
    );

    return {
      totalBroadcasts: broadcasts.length,
      recentBroadcasts: recentBroadcasts.length,
      totalRecordings: recordings.length,
      recentRecordings: recentRecordings.length,
      totalViews: recordings.reduce((sum, r) => sum + (r.views_count || 0), 0),
      totalListeners: broadcasts.reduce((sum, b) => sum + (b.total_listeners || 0), 0),
      totalDuration: recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 3600,
      activeUsers: users.length,
      avgBroadcastDuration: broadcasts.length > 0 
        ? broadcasts.reduce((sum, b) => sum + (b.duration_minutes || 0), 0) / broadcasts.length 
        : 0,
      peakListeners: Math.max(...broadcasts.map(b => b.total_listeners || 0), 0)
    };
  }, [broadcasts, recordings, users, timeRange]);

  // Most popular broadcasts
  const topBroadcasts = useMemo(() => {
    return [...broadcasts]
      .sort((a, b) => (b.total_listeners || 0) - (a.total_listeners || 0))
      .slice(0, 10);
  }, [broadcasts]);

  // Most popular recordings
  const topRecordings = useMemo(() => {
    return [...recordings]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 10);
  }, [recordings]);

  // Category distribution
  const categoryStats = useMemo(() => {
    const categories = {};
    recordings.forEach(r => {
      const cat = r.category || "أخرى";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [recordings]);

  // Peak listening times (by hour)
  const peakTimes = useMemo(() => {
    const hours = Array(24).fill(0);
    listenerStats.forEach(stat => {
      const hour = new Date(stat.timestamp).getHours();
      hours[hour] += stat.active_listeners || 0;
    });
    return hours.map((count, hour) => ({ 
      hour: `${hour}:00`, 
      listeners: count 
    })).sort((a, b) => b.listeners - a.listeners).slice(0, 5);
  }, [listenerStats]);

  // Top broadcasters
  const topBroadcasters = useMemo(() => {
    const broadcasters = {};
    broadcasts.forEach(b => {
      if (!broadcasters[b.broadcaster_id]) {
        broadcasters[b.broadcaster_id] = {
          name: b.broadcaster_name,
          broadcasts: 0,
          totalListeners: 0
        };
      }
      broadcasters[b.broadcaster_id].broadcasts += 1;
      broadcasters[b.broadcaster_id].totalListeners += b.total_listeners || 0;
    });
    return Object.values(broadcasters)
      .sort((a, b) => b.totalListeners - a.totalListeners)
      .slice(0, 5);
  }, [broadcasts]);

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

  if (!user || (user.role !== 'admin' && user.custom_role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <Shield className="w-10 h-10 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
            <p className="text-gray-600">هذه الصفحة متاحة للمشرفين فقط</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">لوحة الإحصائيات</h1>
              <p className="text-gray-600">تحليل شامل لأداء المنصة</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">آخر أسبوع</SelectItem>
                <SelectItem value="month">آخر شهر</SelectItem>
                <SelectItem value="year">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Radio className="w-12 h-12 text-purple-600" />
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-purple-700 mb-1">إجمالي البثوث</p>
                  <p className="text-4xl font-bold text-purple-900">{stats.totalBroadcasts}</p>
                  <p className="text-xs text-purple-600 mt-2">+{stats.recentBroadcasts} هذا الشهر</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-12 h-12 text-blue-600" />
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-700 mb-1">إجمالي المستمعين</p>
                  <p className="text-4xl font-bold text-blue-900">{stats.totalListeners.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-2">ذروة: {stats.peakListeners}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Eye className="w-12 h-12 text-green-600" />
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-green-700 mb-1">إجمالي المشاهدات</p>
                  <p className="text-4xl font-bold text-green-900">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-2">{stats.totalRecordings} تسجيل</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Clock className="w-12 h-12 text-orange-600" />
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-orange-700 mb-1">إجمالي المدة</p>
                  <p className="text-4xl font-bold text-orange-900">{Math.floor(stats.totalDuration)}</p>
                  <p className="text-xs text-orange-600 mt-2">ساعة محتوى</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Broadcasts */}
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  أكثر البثوث استماعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topBroadcasts.slice(0, 5).map((broadcast, index) => (
                    <div key={broadcast.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{broadcast.title}</p>
                        <p className="text-xs text-gray-600">{broadcast.broadcaster_name}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge className="bg-blue-100 text-blue-700">
                          {broadcast.total_listeners || 0} 👤
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Recordings */}
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-500" />
                  أكثر التسجيلات مشاهدة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topRecordings.slice(0, 5).map((recording, index) => (
                    <div key={recording.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{recording.title}</p>
                        <p className="text-xs text-gray-600">{recording.broadcaster_name}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge className="bg-green-100 text-green-700">
                          {recording.views_count || 0} 👁️
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Distribution */}
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  توزيع الفئات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryStats.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <Badge className={categoryColors[cat.name]}>{cat.name}</Badge>
                      <span className="font-bold text-gray-900">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Peak Times */}
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  أوقات الذروة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {peakTimes.map((time, index) => (
                    <div key={time.hour} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{time.hour}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                            style={{ width: `${(time.listeners / peakTimes[0].listeners) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{time.listeners}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Broadcasters */}
            <Card className="border-2 border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  أفضل المذيعين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topBroadcasters.map((broadcaster, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {broadcaster.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{broadcaster.name}</p>
                        <p className="text-xs text-gray-600">{broadcaster.broadcasts} بث</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700">
                        {broadcaster.totalListeners}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
