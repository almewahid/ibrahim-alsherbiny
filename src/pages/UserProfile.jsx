import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Radio, Clock, Users, Bell, Upload, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

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

export default function UserProfile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    bio: "",
    avatar_url: ""
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    new_broadcast: true,
    new_recording: true,
    broadcast_reminder: true,
    new_follower: true
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setProfileData({
          full_name: currentUser.full_name || "",
          bio: currentUser.bio || "",
          avatar_url: currentUser.avatar_url || ""
        });
        setNotificationPrefs(currentUser.notification_preferences || notificationPrefs);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: following = [] } = useQuery({
    queryKey: ['userFollowing', user?.id],
    queryFn: () => base44.entities.Follow.filter({ follower_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: listeningHistory = [] } = useQuery({
    queryKey: ['userListeningHistory', user?.id],
    queryFn: async () => {
      const listeners = await base44.entities.Listener.filter({ user_id: user?.id }, "-created_date", 10);
      const broadcastIds = [...new Set(listeners.map(l => l.broadcast_id))];
      const broadcasts = await Promise.all(
        broadcastIds.map(id => base44.entities.Broadcast.filter({ id }).then(b => b[0]))
      );
      return broadcasts.filter(Boolean);
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async () => {
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      setIsEditing(false);
      alert('✅ تم تحديث الملف الشخصي بنجاح');
    },
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, avatar_url: result.file_url });
      alert('✅ تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('❌ فشل رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      full_name: profileData.full_name,
      bio: profileData.bio,
      avatar_url: profileData.avatar_url
    });
  };

  const handleSaveNotifications = () => {
    updateProfileMutation.mutate({
      notification_preferences: notificationPrefs
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  const stats = {
    following: following.length,
    broadcasts_attended: listeningHistory.length,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-purple-100 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer hover:bg-purple-700">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 text-center md:text-right">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {user.full_name}
                  </h1>
                  <p className="text-gray-600 mb-4">{user.email}</p>
                  <div className="flex gap-2 justify-center md:justify-start">
                    <Badge className="bg-purple-100 text-purple-700">
                      {user.custom_role === 'admin' ? 'مشرف' : user.custom_role === 'broadcaster' ? 'مذيع' : 'مستمع'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <Users className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{stats.following}</p>
                    <p className="text-sm text-gray-600">متابَع</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <Radio className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{stats.broadcasts_attended}</p>
                    <p className="text-sm text-gray-600">بث</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-white border-2 border-purple-100">
              <TabsTrigger value="info">المعلومات</TabsTrigger>
              <TabsTrigger value="activity">النشاط</TabsTrigger>
              <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>معلومات الحساب</CardTitle>
                    <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant="outline"
                    >
                      {isEditing ? 'إلغاء' : 'تعديل'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>النبذة التعريفية</Label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="أخبرنا عن نفسك..."
                      className="min-h-24"
                      disabled={!isEditing}
                    />
                  </div>

                  {isEditing && (
                    <Button
                      onClick={handleSaveProfile}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      حفظ التغييرات
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <div className="space-y-6">
                <Card className="border-2 border-purple-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      المتابَعون ({following.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {following.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">لم تتابع أي مذيعين بعد</p>
                    ) : (
                      <div className="space-y-3">
                        {following.map((follow) => (
                          <div key={follow.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div>
                              <p className="font-semibold">{follow.following_name}</p>
                              <p className="text-xs text-gray-600">
                                متابَع منذ {safeFormatDate(follow.created_date)}
                              </p>
                            </div>
                            <Badge className={follow.notify_on_broadcast ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                              {follow.notify_on_broadcast ? '🔔 نشط' : '🔕 صامت'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      آخر البثوث التي استمعت إليها
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {listeningHistory.length === 0 ? (
                      <p className="text-gray-600 text-center py-8">لم تستمع لأي بثوث بعد</p>
                    ) : (
                      <div className="space-y-3">
                        {listeningHistory.map((broadcast) => (
                          <div key={broadcast.id} className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold">{broadcast.title}</h4>
                                <p className="text-sm text-gray-600">👨‍🏫 {broadcast.broadcaster_name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {safeFormatDate(broadcast.created_date)}
                                </p>
                              </div>
                              <Badge className={broadcast.is_live ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                                {broadcast.is_live ? '🔴 مباشر' : '⏸️ منتهي'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="border-2 border-purple-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    تفضيلات الإشعارات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-semibold">بث جديد</p>
                        <p className="text-sm text-gray-600">إشعار عند بدء بث جديد من المذيعين الذين تتابعهم</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.new_broadcast}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, new_broadcast: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-semibold">تسجيل جديد</p>
                        <p className="text-sm text-gray-600">إشعار عند نشر تسجيل جديد</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.new_recording}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, new_recording: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-semibold">تذكير البثوث</p>
                        <p className="text-sm text-gray-600">تذكير قبل البث المجدول بـ 15 دقيقة</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.broadcast_reminder}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, broadcast_reminder: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
                      <div>
                        <p className="font-semibold">متابع جديد</p>
                        <p className="text-sm text-gray-600">إشعار عند متابعة شخص جديد لك</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.new_follower}
                        onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, new_follower: checked })}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveNotifications}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    حفظ التغييرات
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}