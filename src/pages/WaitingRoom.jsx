
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, User, Radio, ArrowRight, Bell, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BroadcastCover from "../components/broadcast/BroadcastCover";

export default function WaitingRoom() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const broadcastId = urlParams.get('id');
  
  const [timeRemaining, setTimeRemaining] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: broadcast } = useQuery({
    queryKey: ['broadcast', broadcastId],
    queryFn: async () => {
      const broadcasts = await base44.entities.Broadcast.list();
      return broadcasts.find(b => b.id === broadcastId);
    },
    refetchInterval: 3000,
  });

  const { data: cover } = useQuery({
    queryKey: ['broadcastCover', broadcastId],
    queryFn: async () => {
      const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastId });
      return covers[0];
    },
  });

  useEffect(() => {
    if (broadcast?.is_live) {
      navigate(createPageUrl(`ListenBroadcast?id=${broadcastId}&autoplay=true`));
    }
  }, [broadcast, broadcastId, navigate]);

  useEffect(() => {
    if (!broadcast?.scheduled_at) return;

    const updateTime = () => {
      const now = new Date();
      const scheduled = new Date(broadcast.scheduled_at);
      const diff = scheduled - now;

      if (diff < 0) {
        setTimeRemaining("البث سيبدأ قريباً...");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeStr = "";
      if (days > 0) timeStr += `${days} يوم `;
      if (hours > 0) timeStr += `${hours} ساعة `;
      if (minutes > 0) timeStr += `${minutes} دقيقة `;
      if (days === 0 && hours === 0) timeStr += `${seconds} ثانية`;

      setTimeRemaining(timeStr.trim());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [broadcast]);

  if (!broadcast) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Home"))}
          className="mb-6 gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          {/* Broadcast Cover */}
          <Card className="border-2 border-green-100 overflow-hidden">
            <BroadcastCover broadcastId={broadcastId} />
            
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Calendar className="w-3 h-3 mr-1" />
                    مجدول
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700">
                    {broadcast.category}
                  </Badge>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {broadcast.title}
                </h1>
                
                {broadcast.lecturer_name && (
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
                    <User className="w-4 h-4" />
                    <p className="text-lg">المحاضر: {broadcast.lecturer_name}</p>
                  </div>
                )}

                {broadcast.description && (
                  <p className="text-gray-600 mb-6">{broadcast.description}</p>
                )}
              </div>

              {/* Countdown Timer */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200">
                <div className="text-center">
                  <Bell className="w-12 h-12 text-green-600 mx-auto mb-4 animate-pulse" />
                  <h2 className="text-2xl font-bold text-green-900 mb-2">البث سيبدأ بعد</h2>
                  <div className="text-5xl md:text-6xl font-bold text-green-700 mb-4 font-mono">
                    {timeRemaining}
                  </div>
                  <p className="text-gray-600">
                    {new Date(broadcast.scheduled_at).toLocaleString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Notification Info */}
              <Card className="bg-blue-50 border-2 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900 mb-1">سنخبرك عند بدء البث</h3>
                      <p className="text-sm text-blue-700">
                        ستصلك إشعار تلقائي عند بدء البث المباشر. تأكد من تفعيل الإشعارات.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info from Cover */}
              {cover && (cover.morning_adhkar || cover.previous_summary) && (
                <div className="space-y-4">
                  {/* Link to Morning Adhkar */}
                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900 mb-2">أذكار الصباح والمساء</h3>
                          <p className="text-sm text-amber-700 mb-3">
                            لا تنسَ أذكار الصباح والمساء للحفظ والبركة
                          </p>
                          <Button
                            onClick={() => window.open(createPageUrl("MorningAdhkar"), '_blank')}
                            className="bg-amber-600 hover:bg-amber-700 gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            افتح صفحة الأذكار
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {cover.morning_adhkar && (
                    <Card className="bg-purple-50 border-2 border-purple-200">
                      <CardContent className="pt-4">
                        <h3 className="font-bold text-purple-900 mb-2">📝 ملاحظات إضافية</h3>
                        <p className="text-sm text-purple-700 leading-relaxed whitespace-pre-wrap">
                          {cover.morning_adhkar}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {cover.previous_summary && (
                    <Card className="bg-amber-50 border-2 border-amber-200">
                      <CardContent className="pt-4">
                        <h3 className="font-bold text-amber-900 mb-2">📚 ملخص الدرس السابق</h3>
                        <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-wrap">
                          {cover.previous_summary}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Ready to Listen Button (appears when live) */}
              {broadcast.is_live && (
                <Button
                  onClick={() => navigate(createPageUrl(`ListenBroadcast?id=${broadcastId}&autoplay=true`))}
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 gap-3 animate-pulse"
                >
                  <Radio className="w-6 h-6" />
                  البث مباشر الآن - استمع الآن!
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
