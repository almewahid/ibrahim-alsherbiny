
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Radio, Trash2, Edit, Shield, Plus, Play, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const categories = ["علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function ScheduleBroadcast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [broadcastData, setBroadcastData] = useState({
    title: "",
    description: "",
    category: "علوم شرعية",
    lecturer_name: "د.إبراهيم الشربيني",
    series_id: "", // Added
    episode_number: null, // Added
    scheduled_at: "",
    scheduled_time: "",
    is_recurring: false, // Added
    recurrence_pattern: "weekly", // Added
    recurrence_end_date: "", // Added
    // NEW: Rebroadcast options
    rebroadcast_from_recording_id: "",
    rebroadcast_from_url: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: scheduledBroadcasts = [] } = useQuery({
    queryKey: ['scheduledBroadcasts'],
    queryFn: () => base44.entities.Broadcast.filter({ is_scheduled: true, is_live: false }),
    refetchInterval: 5000,
  });

  const { data: allCovers = [] } = useQuery({
    queryKey: ['allCovers'],
    queryFn: () => base44.entities.BroadcastCover.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  // NEW: Fetch recordings for re-broadcast scheduling
  const { data: recordings = [] } = useQuery({
    queryKey: ['recordingsForSchedule'],
    queryFn: () => base44.entities.Recording.list("-created_date"),
  });

  const getCoverStatus = (broadcastId) => {
    return allCovers.some(c => c.broadcast_id === broadcastId);
  };

  const createScheduledBroadcastMutation = useMutation({
    mutationFn: (data) => base44.entities.Broadcast.create(data),
    onSuccess: (newBroadcast) => {
      queryClient.invalidateQueries({ queryKey: ['scheduledBroadcasts'] });
      setBroadcastData({
        title: "",
        description: "",
        category: "علوم شرعية",
        lecturer_name: "د.إبراهيم الشربيني",
        series_id: "", // Reset
        episode_number: null, // Reset
        scheduled_at: "",
        scheduled_time: "",
        is_recurring: false, // Reset
        recurrence_pattern: "weekly", // Reset
        recurrence_end_date: "", // Reset
        rebroadcast_from_recording_id: "", // Reset
        rebroadcast_from_url: "" // Reset
      });
      
      // Show alert with broadcast ID
      alert(`✅ تم جدولة البث بنجاح!\n\n📋 معرف البث: ${newBroadcast.id}\n\n💡 يمكنك الآن استخدام هذا المعرف في صفحة "تصميم الغلاف"`);
    },
  });

  const deleteScheduledBroadcastMutation = useMutation({
    mutationFn: (id) => base44.entities.Broadcast.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledBroadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['allCovers'] }); // Invalidate covers as well
      alert('✅ تم حذف البث المجدول');
    },
  });

  const handleScheduleBroadcast = () => {
    if (!broadcastData.title.trim()) {
      alert('يرجى إدخال عنوان البث');
      return;
    }

    if (!broadcastData.scheduled_at || !broadcastData.scheduled_time) {
      alert('يرجى تحديد تاريخ ووقت البث');
      return;
    }

    const scheduledDateTime = new Date(`${broadcastData.scheduled_at}T${broadcastData.scheduled_time}`);

    if (scheduledDateTime < new Date()) {
      alert('لا يمكن جدولة بث في الماضي');
      return;
    }

    const broadcastPayload = {
      title: broadcastData.title,
      description: broadcastData.description,
      category: broadcastData.category,
      lecturer_name: broadcastData.lecturer_name,
      broadcaster_name: user.full_name || user.email,
      broadcaster_id: user.id,
      is_scheduled: true,
      is_live: false,
      scheduled_at: scheduledDateTime.toISOString(),
      series_id: broadcastData.series_id || null, // Added
      episode_number: broadcastData.episode_number || null, // Added
      is_recurring: broadcastData.is_recurring, // Added
      recurrence_pattern: broadcastData.is_recurring ? broadcastData.recurrence_pattern : null, // Added
      recurrence_end_date: broadcastData.is_recurring && broadcastData.recurrence_end_date 
        ? new Date(broadcastData.recurrence_end_date).toISOString() 
        : null, // Added
      // NEW: Rebroadcast fields
      rebroadcast_from_recording_id: broadcastData.rebroadcast_from_recording_id || null,
      rebroadcast_from_url: broadcastData.rebroadcast_from_url || null
    };

    createScheduledBroadcastMutation.mutate(broadcastPayload);
  };

  const handleDelete = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا البث المجدول؟')) {
      deleteScheduledBroadcastMutation.mutate(id);
    }
  };

  const goToCreateCover = (broadcastId) => {
    navigate(createPageUrl(`BroadcastCoverEditor?broadcast_id=${broadcastId}`));
  };

  const copyBroadcastId = (broadcastId) => {
    navigator.clipboard.writeText(broadcastId);
    alert('✅ تم نسخ معرف البث');
  };

  const getTimeRemaining = (scheduledAt) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled - now;
    
    if (diff < 0) return { text: "الآن", canStart: true, color: "green" };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const canStart = diff < 300000; // Can start 5 minutes before
    
    if (days > 0) return { text: `بعد ${days} يوم`, canStart: false, color: "blue" };
    if (hours > 0) return { text: `بعد ${hours} ساعة`, canStart: false, color: "yellow" };
    if (minutes > 5) return { text: `بعد ${minutes} دقيقة`, canStart: false, color: "orange" };
    return { text: `بعد ${minutes} دقيقة`, canStart: true, color: "green" };
  };

  const startScheduledBroadcast = (broadcast) => {
    navigate(createPageUrl(`CreateBroadcast?scheduled=${broadcast.id}`));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-purple-600" />
            </div>
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
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">جدولة البثوث</h1>
          <p className="text-lg text-gray-600">خطط للبثوث القادمة وأنشئ أغلفة مخصصة</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Schedule Form */}
          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                جدولة بث جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان البث</Label>
                <Input
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  placeholder="عنوان البث..."
                />
              </div>

              <div className="space-y-2">
                <Label>اسم المحاضر</Label>
                <Input
                  value={broadcastData.lecturer_name}
                  onChange={(e) => setBroadcastData({ ...broadcastData, lecturer_name: e.target.value })}
                  placeholder="د.إبراهيم الشربيني"
                />
              </div>

              {/* NEW: Series Selection */}
              <div className="space-y-2">
                <Label>السلسلة (اختياري)</Label>
                <Select
                  value={broadcastData.series_id || "none"}
                  onValueChange={(value) => setBroadcastData({ ...broadcastData, series_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون سلسلة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون سلسلة</SelectItem>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NEW: Episode Number (shown only if series selected) */}
              {broadcastData.series_id && (
                <div className="space-y-2">
                  <Label>رقم الحلقة</Label>
                  <Input
                    type="number"
                    value={broadcastData.episode_number === null ? "" : broadcastData.episode_number}
                    onChange={(e) => setBroadcastData({ ...broadcastData, episode_number: parseInt(e.target.value) || null })}
                    placeholder="1"
                    min="1"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={broadcastData.description}
                  onChange={(e) => setBroadcastData({ ...broadcastData, description: e.target.value })}
                  placeholder="وصف البث..."
                  className="min-h-24"
                />
              </div>

              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={broadcastData.category}
                  onValueChange={(value) => setBroadcastData({ ...broadcastData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={broadcastData.scheduled_at}
                    onChange={(e) => setBroadcastData({ ...broadcastData, scheduled_at: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={broadcastData.scheduled_time}
                    onChange={(e) => setBroadcastData({ ...broadcastData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              {/* NEW: Recurring Schedule Options */}
              <div className="space-y-4 bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={broadcastData.is_recurring}
                    onChange={(e) => setBroadcastData({ ...broadcastData, is_recurring: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_recurring" className="font-bold text-blue-700">
                    بث متكرر (سلسلة أسبوعية / يومية)
                  </Label>
                </div>

                {broadcastData.is_recurring && (
                  <>
                    <div className="space-y-2">
                      <Label>نمط التكرار</Label>
                      <Select
                        value={broadcastData.recurrence_pattern}
                        onValueChange={(value) => setBroadcastData({ ...broadcastData, recurrence_pattern: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">يومي</SelectItem>
                          <SelectItem value="weekly">أسبوعي</SelectItem>
                          <SelectItem value="monthly">شهري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>تاريخ انتهاء التكرار (اختياري)</Label>
                      <Input
                        type="date"
                        value={broadcastData.recurrence_end_date}
                        onChange={(e) => setBroadcastData({ ...broadcastData, recurrence_end_date: e.target.value })}
                      />
                      <p className="text-xs text-blue-600">
                        💡 اتركه فارغاً للتكرار بدون نهاية
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* NEW: Rebroadcast Options in Scheduling */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-100">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-600" />
                  جدولة إعادة بث (اختياري)
                </Label>

                <div className="space-y-2">
                  <Label className="text-sm">اختر تسجيل لإعادة بثه</Label>
                  <Select
                    value={broadcastData.rebroadcast_from_recording_id || "none"}
                    onValueChange={(value) => setBroadcastData({ 
                      ...broadcastData, 
                      rebroadcast_from_recording_id: value === "none" ? "" : value,
                      rebroadcast_from_url: ""
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="بث جديد (بدون إعادة)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بث جديد (بدون إعادة)</SelectItem>
                      {recordings.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title} - {Math.floor((r.duration_seconds || 0) / 60)} دقيقة
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-orange-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-orange-50 px-2 text-orange-600">أو</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">رابط خارجي لإعادة البث</Label>
                  <Input
                    placeholder="https://example.com/audio.mp3"
                    value={broadcastData.rebroadcast_from_url}
                    onChange={(e) => setBroadcastData({ 
                      ...broadcastData, 
                      rebroadcast_from_url: e.target.value,
                      rebroadcast_from_recording_id: ""
                    })}
                    disabled={!!broadcastData.rebroadcast_from_recording_id}
                  />
                  <p className="text-xs text-orange-600">
                    💡 أدخل رابط ملف صوتي مباشر (mp3, webm, ogg)
                  </p>
                </div>
              </div>

              <Button
                onClick={handleScheduleBroadcast}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                disabled={createScheduledBroadcastMutation.isPending}
              >
                <Calendar className="w-5 h-5" />
                جدولة البث
              </Button>
            </CardContent>
          </Card>

          {/* Scheduled Broadcasts List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">البثوث المجدولة ({scheduledBroadcasts.length})</h2>
            
            {scheduledBroadcasts.length === 0 ? (
              <Card className="border-2 border-purple-100">
                <CardContent className="pt-12 pb-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد بثوث مجدولة</h3>
                  <p className="text-gray-600">ابدأ بجدولة بث جديد من النموذج</p>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {scheduledBroadcasts.map((broadcast) => {
                  const timeInfo = getTimeRemaining(broadcast.scheduled_at);
                  const hasCover = getCoverStatus(broadcast.id);
                  const relatedSeries = broadcast.series_id ? series.find(s => s.id === broadcast.series_id) : null;
                  
                  return (
                    <motion.div
                      key={broadcast.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="border-2 border-purple-100 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-blue-100 text-blue-700">
                                  مجدول
                                </Badge>
                                <Badge className="bg-purple-100 text-purple-700">
                                  {broadcast.category}
                                </Badge>
                                {hasCover && (
                                  <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    له غلاف
                                  </Badge>
                                )}
                                {timeInfo.canStart && (
                                  <Badge className="bg-green-100 text-green-700 animate-pulse">
                                    🔴 جاهز للبدء
                                  </Badge>
                                )}
                                {(broadcast.rebroadcast_from_recording_id || broadcast.rebroadcast_from_url) && (
                                  <Badge className="bg-orange-100 text-orange-700">
                                    <Radio className="w-3 h-3 mr-1" />
                                    إعادة بث
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {broadcast.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                المحاضر: {broadcast.lecturer_name}
                              </p>

                              {relatedSeries && (
                                <p className="text-sm text-gray-600 mb-2">
                                  السلسلة: {relatedSeries.title} {broadcast.episode_number ? ` (الحلقة ${broadcast.episode_number})` : ''}
                                </p>
                              )}
                              
                              {broadcast.is_recurring && (
                                <Badge className="bg-indigo-100 text-indigo-700 mb-2">
                                  متكرر: {broadcast.recurrence_pattern === 'daily' ? 'يومي' : broadcast.recurrence_pattern === 'weekly' ? 'أسبوعي' : 'شهري'}
                                  {broadcast.recurrence_end_date && ` حتى ${new Date(broadcast.recurrence_end_date).toLocaleDateString('ar-EG')}`}
                                </Badge>
                              )}
                              
                              {/* Time Remaining Display */}
                              <div className={`bg-${timeInfo.color}-50 rounded-lg p-3 mb-3 border border-${timeInfo.color}-200`}>
                                <p className={`text-sm font-bold text-${timeInfo.color}-700`}>
                                  ⏰ {timeInfo.text}
                                </p>
                                <p className={`text-xs text-${timeInfo.color}-600 mt-1`}>
                                  {new Date(broadcast.scheduled_at).toLocaleString('ar-EG')}
                                </p>
                              </div>

                              {/* Broadcast ID Display */}
                              <div className="bg-purple-50 rounded-lg p-3 mb-3 border border-purple-200">
                                <p className="text-xs text-purple-700 mb-1 font-bold">📋 معرف البث:</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-sm text-purple-900 font-mono bg-white px-2 py-1 rounded flex-1 truncate">
                                    {broadcast.id}
                                  </code>
                                  <Button
                                    onClick={() => copyBroadcastId(broadcast.id)}
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                  >
                                    نسخ
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {/* Step-by-step buttons */}
                              {!hasCover ? (
                                <Button
                                  onClick={() => goToCreateCover(broadcast.id)}
                                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  1️⃣ صمم الغلاف
                                </Button>
                              ) : timeInfo.canStart ? (
                                <Button
                                  onClick={() => startScheduledBroadcast(broadcast)}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 gap-2 animate-pulse"
                                >
                                  <Play className="w-4 h-4" />
                                  2️⃣ ابدأ البث
                                </Button>
                              ) : (
                                <Button
                                  disabled
                                  variant="outline"
                                  className="gap-2"
                                >
                                  <Clock className="w-4 h-4" />
                                  انتظر الموعد
                                </Button>
                              )}
                              
                              {hasCover && (
                                <Button
                                  onClick={() => goToCreateCover(broadcast.id)}
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 border-blue-200"
                                >
                                  <Edit className="w-4 h-4" />
                                  تعديل الغلاف
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => handleDelete(broadcast.id)}
                                size="sm"
                                variant="destructive"
                                className="gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                حذف
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
