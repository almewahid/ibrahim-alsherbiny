
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Database, Shield, Radio, Users, Settings, VolumeX, Volume2, StopCircle, Edit, Trash2, TrendingUp, Eye, Clock, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to safely format dates
const safeFormatDate = (dateString) => {
  if (!dateString) return 'غير محدد';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'غير محدد';
    return formatDistanceToNow(date, { addSuffix: true, locale: ar });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'غير محدد';
  }
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = useState("settings");
  const [editingItem, setEditingItem] = useState(null);
  const [broadcastMessage, setBroadcastMessage] = useState({ title: "", message: "" });
  const [isSending, setIsSending] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Fetch active broadcasts
  const { data: activeBroadcasts = [], refetch: refetchBroadcasts } = useQuery({
    queryKey: ['activeBroadcasts'],
    queryFn: () => base44.entities.Broadcast.filter({ is_live: true }),
    refetchInterval: 5000,
    enabled: activeTab === "settings",
  });

  // Fetch Hadiths
  const { data: hadiths = [] } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => base44.entities.Hadith.list(),
    enabled: activeTab === "hadiths",
  });

  // Fetch Series
  const { data: series = [] } = useQuery({
    queryKey: ['adminSeries'],
    queryFn: () => base44.entities.Series.list("-created_date"),
    enabled: activeTab === "series",
  });

  // Fetch all users for admin panel
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list("-created_date"),
    enabled: activeTab === "users",
  });

  // Fetch recent recordings for stats
  const { data: recordings = [] } = useQuery({
    queryKey: ['allRecordings'],
    queryFn: () => base44.entities.Recording.list("-created_date", 20), // Fetch last 20 recordings
    enabled: activeTab === "stats",
  });

  // Fetch recent broadcasts for stats
  const { data: broadcasts = [] } = useQuery({
    queryKey: ['allBroadcasts'],
    queryFn: () => base44.entities.Broadcast.list("-created_date", 20), // Fetch last 20 broadcasts
    enabled: activeTab === "stats",
  });

  // Hadith CRUD mutations
  const updateHadithMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Hadith.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      setEditingItem(null);
      alert('✅ تم تحديث الحديث بنجاح');
    },
    onError: (error) => {
      console.error('Error updating hadith:', error);
      alert('❌ فشل تحديث الحديث');
    }
  });

  const deleteHadithMutation = useMutation({
    mutationFn: (id) => base44.entities.Hadith.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      alert('✅ تم حذف الحديث بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting hadith:', error);
      alert('❌ فشل حذف الحديث');
    }
  });

  // Series CRUD mutations
  const deleteSeriesMutation = useMutation({
    mutationFn: (id) => base44.entities.Series.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSeries'] });
      alert('✅ تم حذف السلسلة بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting series:', error);
      alert('❌ فشل حذف السلسلة');
    }
  });

  const sendBroadcastMessage = async () => {
    if (!broadcastMessage.title || !broadcastMessage.message) {
      alert('يرجى إدخال العنوان والرسالة');
      return;
    }

    setIsSending(true);
    try {
      const response = await base44.functions.invoke('sendBroadcastMessage', broadcastMessage);
      
      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        setBroadcastMessage({ title: "", message: "" });
      } else {
        alert(response.data.message || 'فشل إرسال الرسالة');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('فشل إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  const importQuranData = async () => {
    if (!confirm('هل تريد استيراد بيانات القرآن الكريم؟ قد يستغرق هذا بضع دقائق.')) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await base44.functions.invoke('importQuranData');
      
      if (response.data.success) {
        alert(response.data.message);
      } else {
        alert(response.data.message || 'فشل الاستيراد');
      }
    } catch (error) {
      console.error('Error importing Quran:', error);
      alert(`❌ خطأ: ${error.message || 'فشل الاتصال بالخادم'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const goToActiveBroadcast = (broadcastId) => {
    window.location.href = createPageUrl(`CreateBroadcast?active=${broadcastId}`);
  };

  const muteBroadcast = async (broadcast) => {
    try {
      await base44.entities.Broadcast.update(broadcast.id, {
        is_muted_for_all: !broadcast.is_muted_for_all
      });
      refetchBroadcasts();
      alert(broadcast.is_muted_for_all ? '✅ تم إلغاء كتم الجميع' : '✅ تم كتم الجميع');
    } catch (error) {
      console.error('Error muting broadcast:', error);
      alert('❌ فشل تغيير حالة الكتم');
    }
  };

  const stopBroadcast = async (broadcast) => {
    if (!confirm(`هل تريد إيقاف البث "${broadcast.title}"؟`)) {
      return;
    }

    try {
      const duration = Math.floor((Date.now() - new Date(broadcast.started_at).getTime()) / 60000);

      // Mark all listeners as inactive
      const listeners = await base44.entities.Listener.filter({
        broadcast_id: broadcast.id,
        is_active: true
      });

      for (const listener of listeners) {
        await base44.entities.Listener.update(listener.id, { is_active: false });
      }

      await base44.entities.Broadcast.update(broadcast.id, {
        is_live: false,
        ended_at: new Date().toISOString(),
        duration_minutes: duration
      });

      alert('✅ تم إيقاف البث بنجاح');
      refetchBroadcasts();
    } catch (error) {
      console.error('Error stopping broadcast:', error);
      alert('❌ فشل إيقاف البث');
    }
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

  const stats = {
    totalUsers: allUsers.length,
    totalBroadcasts: broadcasts.length, // counts from the 20 most recent
    totalRecordings: recordings.length, // counts from the 20 most recent
    totalSeries: series.length,
    totalViews: recordings.reduce((sum, r) => sum + (r.views_count || 0), 0),
    liveBroadcasts: broadcasts.filter(b => b.is_live).length
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">لوحة التحكم</h1>
            <p className="text-lg text-gray-600">إدارة المنصة والبثوث والإشعارات</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-12 bg-white border-2 border-purple-100">
              <TabsTrigger value="users">المستخدمون</TabsTrigger>
              <TabsTrigger value="hadiths">الأحاديث</TabsTrigger>
              <TabsTrigger value="series">السلاسل</TabsTrigger>
              <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <CardTitle>إدارة المستخدمين ({allUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allUsers.slice(0, 20).map((u) => ( // Display only recent 20 users
                      <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold">{u.full_name}</p>
                            <p className="text-sm text-gray-600">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                            {u.role === 'admin' ? 'مشرف' : u.custom_role === 'broadcaster' ? 'مذيع' : 'مستمع'}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {safeFormatDate(u.created_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hadiths Tab */}
            <TabsContent value="hadiths">
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <CardTitle>إدارة الأحاديث النووية ({hadiths.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hadiths.sort((a, b) => a.number - b.number).map((hadith) => (
                      <Card key={hadith.id} className="border border-purple-100">
                        <CardContent className="pt-4">
                          {editingItem?.id === hadith.id ? (
                            <div className="space-y-3">
                              <Label>عنوان الحديث</Label>
                              <Input
                                value={editingItem.title}
                                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                                placeholder="عنوان الحديث"
                              />
                              <Label>نص الحديث</Label>
                              <Textarea
                                value={editingItem.arabic_text}
                                onChange={(e) => setEditingItem({ ...editingItem, arabic_text: e.target.value })}
                                placeholder="نص الحديث"
                                className="min-h-32"
                              />
                              <Label>الراوي</Label>
                              <Input
                                value={editingItem.narrator}
                                onChange={(e) => setEditingItem({ ...editingItem, narrator: e.target.value })}
                                placeholder="الراوي"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateHadithMutation.mutate({ id: hadith.id, data: editingItem })}
                                  className="bg-green-600"
                                >
                                  {updateHadithMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                  حفظ
                                </Button>
                                <Button onClick={() => setEditingItem(null)} variant="outline">
                                  إلغاء
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-purple-100 text-purple-700">
                                    الحديث {hadith.number}
                                  </Badge>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{hadith.title}</h3>
                                <p className="text-gray-700 leading-relaxed mb-2 line-clamp-2">{hadith.arabic_text}</p>
                                <p className="text-sm text-gray-600">الراوي: {hadith.narrator}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setEditingItem(hadith)}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من حذف الحديث رقم ${hadith.number} "${hadith.title}"؟`)) {
                                      deleteHadithMutation.mutate(hadith.id);
                                    }
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  {deleteHadithMutation.isPending && deleteHadithMutation.variables === hadith.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Series Tab */}
            <TabsContent value="series">
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>إدارة السلاسل ({series.length})</CardTitle>
                    <Button onClick={() => navigate(createPageUrl("SeriesManager"))} className="bg-purple-600">
                      إضافة سلسلة جديدة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {series.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{s.title}</h3>
                            <Badge className="bg-purple-100 text-purple-700">
                              {s.episodes_count || 0} حلقة
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-1">{s.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            المذيع: {s.broadcaster_name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(createPageUrl(`SeriesManager?id=${s.id}`))}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف السلسلة "${s.title}"؟`)) {
                                deleteSeriesMutation.mutate(s.id);
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                          >
                            {deleteSeriesMutation.isPending && deleteSeriesMutation.variables === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="border-2 border-purple-100">
                    <CardContent className="pt-6 text-center">
                      <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                      <p className="text-sm text-gray-600">مستخدم مسجل</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-100">
                    <CardContent className="pt-6 text-center">
                      <Radio className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.totalBroadcasts}</p>
                      <p className="text-sm text-gray-600">إجمالي البثوث (آخر 20)</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-green-100">
                    <CardContent className="pt-6 text-center">
                      <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.totalRecordings}</p>
                      <p className="text-sm text-gray-600">إجمالي التسجيلات (آخر 20)</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-yellow-100">
                    <CardContent className="pt-6 text-center">
                      <BarChart3 className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.totalSeries}</p>
                      <p className="text-sm text-gray-600">إجمالي السلاسل</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-red-100">
                    <CardContent className="pt-6 text-center">
                      <Eye className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.totalViews}</p>
                      <p className="text-sm text-gray-600">مشاهدات التسجيلات (آخر 20)</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-pink-100">
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">{stats.liveBroadcasts}</p>
                      <p className="text-sm text-gray-600">بث مباشر الآن</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-purple-100">
                  <CardHeader>
                    <CardTitle>آخر البثوث</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {broadcasts.slice(0, 10).map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{b.title}</p>
                            <p className="text-sm text-gray-600">{b.broadcaster_name}</p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge className={b.is_live ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                              {b.is_live ? '🔴 مباشر' : '⏸️ منتهي'}
                            </Badge>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {safeFormatDate(b.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab - Contains existing functionality */}
            <TabsContent value="settings">
              <div className="space-y-6">
                {/* Active Broadcasts */}
                {activeBroadcasts.length > 0 && (
                  <Card className="border-2 border-red-100 bg-red-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-900">
                        <Radio className="w-5 h-5 animate-pulse" />
                        البثوث النشطة الآن ({activeBroadcasts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeBroadcasts.map((broadcast) => (
                        <Card key={broadcast.id} className="border-2 border-purple-100 bg-white">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-red-100 text-red-700 border-red-200">
                                    🔴 مباشر
                                  </Badge>
                                  <Badge className="bg-purple-100 text-purple-700">
                                    {broadcast.category}
                                  </Badge>
                                  {broadcast.is_muted_for_all && (
                                    <Badge className="bg-orange-100 text-orange-700">
                                      🔇 الكل مكتوم
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                  {broadcast.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  المذيع: {broadcast.broadcaster_name}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{broadcast.listener_count || 0} مستمع</span>
                                  </div>
                                  <span>
                                    بدأ {safeFormatDate(broadcast.started_at)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => goToActiveBroadcast(broadcast.id)}
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                                >
                                  <Settings className="w-4 h-4" />
                                  إدارة البث
                                </Button>
                                <Button
                                  onClick={() => muteBroadcast(broadcast)}
                                  variant="outline"
                                  className="gap-2 border-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                                >
                                  {broadcast.is_muted_for_all ? (
                                    <>
                                      <Volume2 className="w-4 h-4" />
                                      إلغاء كتم الجميع
                                    </>
                                  ) : (
                                    <>
                                      <VolumeX className="w-4 h-4" />
                                      كتم الجميع
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => stopBroadcast(broadcast)}
                                  variant="destructive"
                                  className="gap-2"
                                >
                                  <StopCircle className="w-4 h-4" />
                                  إيقاف البث
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Broadcast Message */}
                <Card className="border-2 border-purple-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-purple-600" />
                      إرسال رسالة لجميع المستخدمين
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>عنوان الرسالة</Label>
                      <Input
                        value={broadcastMessage.title}
                        onChange={(e) => setBroadcastMessage({ ...broadcastMessage, title: e.target.value })}
                        placeholder="عنوان الإشعار..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>محتوى الرسالة</Label>
                      <Textarea
                        value={broadcastMessage.message}
                        onChange={(e) => setBroadcastMessage({ ...broadcastMessage, message: e.target.value })}
                        placeholder="نص الرسالة..."
                        className="min-h-32"
                      />
                    </div>

                    <Button
                      onClick={sendBroadcastMessage}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                      disabled={isSending}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جارٍ الإرسال...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          إرسال لجميع المستخدمين
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quran Import */}
                <Card className="border-2 border-blue-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      استيراد بيانات القرآن الكريم
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">
                      استيراد جميع آيات القرآن الكريم (6236 آية) لاستخدامها في أغلفة الدروس
                    </p>
                    <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                      💡 <strong>ملاحظة:</strong> سيتم تخطي الآيات الموجودة بالفعل. العملية قد تستغرق 2-3 دقائق.
                    </div>
                    <Button
                      onClick={importQuranData}
                      variant="outline"
                      className="w-full gap-2 border-2"
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          جارٍ الاستيراد... يرجى الانتظار
                        </>
                      ) : (
                        <>
                          <Database className="w-5 h-5" />
                          بدء استيراد القرآن الكريم
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
