import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Volume2, VolumeX, Users, Clock, AlertCircle, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AudioVisualizer from "../components/broadcast/AudioVisualizer";
import LiveIndicator from "../components/broadcast/LiveIndicator";
import ChatBox from "../components/broadcast/ChatBox";
import ListenersList from "../components/broadcast/ListenersList";
import ShareButton from "../components/broadcast/ShareButton";
import AgoraAudioListener from "../components/broadcast/AgoraAudioListener";
import AgoraVideoListener from "../components/video/AgoraVideoListener";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import BroadcastMarkers from "../components/broadcast/BroadcastMarkers";

export default function ListenBroadcast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const broadcastId = urlParams.get('id');
  const autoplay = urlParams.get('autoplay') === 'true';
  
  const [user, setUser] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentListener, setCurrentListener] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const autoplayTriggeredRef = useRef(false);

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

  useEffect(() => {
    if (autoplay && user && !isListening && !isConnecting && !autoplayTriggeredRef.current) {
      autoplayTriggeredRef.current = true;
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [autoplay, user, isListening, isConnecting]);

  const { data: broadcast, isLoading } = useQuery({
    queryKey: ['broadcast', broadcastId],
    queryFn: async () => {
      const broadcasts = await base44.entities.Broadcast.list();
      return broadcasts.find(b => b.id === broadcastId);
    },
    refetchInterval: 3000,
    enabled: !!broadcastId,
  });

  useEffect(() => {
    if (!broadcast?.started_at) return;
    
    const updateTime = () => {
      const started = new Date(broadcast.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - started) / 1000);
      setElapsedTime(elapsed);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [broadcast?.started_at]);

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const updateBroadcastMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Broadcast.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast', broadcastId] });
    },
  });

  const createListenerMutation = useMutation({
    mutationFn: (data) => base44.entities.Listener.create(data),
    onSuccess: (data) => {
      setCurrentListener(data);
      queryClient.invalidateQueries({ queryKey: ['listeners', broadcastId] });
    },
  });

  const updateListenerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Listener.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listeners', broadcastId] });
    },
  });

  const startListening = async () => {
    if (!user || !broadcastId || isListening || isConnecting) return;
    
    setIsConnecting(true);
    
    try {
      const existingListeners = await base44.entities.Listener.filter({
        broadcast_id: broadcastId,
        user_id: user.id,
        is_active: true
      });

      let listener;
      let incrementListenerCount = false;

      if (existingListeners.length > 0) {
        listener = existingListeners[0];
        setCurrentListener(listener);
      } else {
        listener = await createListenerMutation.mutateAsync({
          broadcast_id: broadcastId,
          user_id: user.id,
          user_name: user.full_name || user.email,
          joined_at: new Date().toISOString(),
          is_active: true,
          is_muted: false
        });
        incrementListenerCount = true;
      }

      if (incrementListenerCount && broadcast) {
        await updateBroadcastMutation.mutateAsync({
          id: broadcast.id,
          data: {
            listener_count: (broadcast.listener_count || 0) + 1,
            total_listeners: Math.max(
              (broadcast.total_listeners || 0),
              (broadcast.listener_count || 0) + 1
            )
          }
        });
      }

      setIsListening(true);
    } catch (error) {
      console.error('Error starting listening:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const stopListening = async () => {
    if (currentListener) {
      await updateListenerMutation.mutateAsync({
        id: currentListener.id,
        data: { is_active: false }
      });
    }

    if (broadcast) {
      await updateBroadcastMutation.mutateAsync({
        id: broadcast.id,
        data: {
          listener_count: Math.max(0, (broadcast.listener_count || 0) - 1)
        }
      });
    }

    setIsListening(false);
    setCurrentListener(null);
    navigate(createPageUrl("Home"));
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isListening) {
        console.log('Page hidden, continuing playback...');
      }
    };

    const handleBeforeUnload = async (e) => {
      if (isListening && currentListener) {
        e.preventDefault(); 
        e.returnValue = '';
        
        try {
          await updateListenerMutation.mutateAsync({
            id: currentListener.id,
            data: { is_active: false }
          });
          if (broadcast) {
            await updateBroadcastMutation.mutateAsync({
              id: broadcast.id,
              data: {
                listener_count: Math.max(0, (broadcast.listener_count || 0) - 1)
              }
            });
          }
        } catch (error) {
          console.error("Error cleaning up listener on beforeunload:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (currentListener && isListening) {
        updateListenerMutation.mutate({
          id: currentListener.id,
          data: { is_active: false }
        });
      }
    };
  }, [isListening, currentListener, updateListenerMutation, updateBroadcastMutation, broadcast]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleRemoteUserJoined = (user) => {
    console.log('Remote user joined:', user.uid);
  };

  const handleRemoteUserLeft = (user) => {
    console.log('Remote user left:', user.uid);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">البث غير موجود</h2>
            <p className="text-gray-600 mb-6">لم نتمكن من العثور على هذا البث</p>
            <Button onClick={() => navigate(createPageUrl("Home"))}>
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!broadcast.is_live) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">البث انتهى</h2>
            <p className="text-gray-600 mb-6">هذا البث لم يعد مباشراً</p>
            <Button onClick={() => navigate(createPageUrl("Home"))}>
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Home"))}
          className="mb-6 gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Card className="border-2 border-purple-300 bg-gradient-to-br from-white to-purple-50 shadow-2xl">
                <CardHeader className="border-b border-purple-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <LiveIndicator isLive={true} size="lg" />
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          {broadcast.category}
                        </Badge>
                        <ShareButton 
                          broadcastId={broadcastId} 
                          title={broadcast.title}
                        />
                      </div>
                      <CardTitle className="text-2xl md:text-3xl mb-2">
                        {broadcast.title}
                      </CardTitle>
                      {broadcast.description && (
                        <p className="text-gray-600">{broadcast.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4 text-sm text-gray-600 flex-wrap">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-lg">{broadcast.listener_count || 0}</span>
                      <span>مستمع</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-4 py-2 border border-green-200">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-green-900">{formatElapsedTime(elapsedTime)}</span>
                      <span className="text-green-700">منذ البداية</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <p className="text-sm text-gray-600">
                      المذيع: <span className="font-bold text-gray-900">{broadcast.broadcaster_name}</span>
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {!isListening ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Volume2 className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        جاهز للاستماع؟
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {autoplay ? "جارٍ بدء الاستماع تلقائياً..." : "انقر على الزر للبدء في الاستماع للبث المباشر"}
                      </p>
                      <Button
                        onClick={startListening}
                        size="lg"
                        disabled={isConnecting || !user}
                        className="h-14 px-8 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-3"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            جارٍ الاتصال...
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-6 h-6" />
                            ابدأ الاستماع
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <BroadcastCover broadcastId={broadcastId} />

                      {broadcast.has_video ? (
                        <AgoraVideoListener
                          channelName={broadcastId}
                          isActive={isListening}
                        />
                      ) : (
                        <>
                          <AgoraAudioListener
                            channelName={broadcastId}
                            isActive={isListening}
                            onRemoteUserJoined={handleRemoteUserJoined}
                            onRemoteUserLeft={handleRemoteUserLeft}
                          />
                          <AudioVisualizer isActive={!isMuted} />
                        </>
                      )}

                      <div className="flex gap-4 justify-center">
                        <Button
                          onClick={toggleMute}
                          variant="outline"
                          size="lg"
                          className="gap-2 hover:bg-purple-50 border-2 min-w-[140px]"
                        >
                          {isMuted ? (
                            <>
                              <VolumeX className="w-5 h-5" />
                              تشغيل الصوت
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-5 h-5" />
                              كتم الصوت
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={stopListening}
                          size="lg"
                          variant="destructive"
                          className="gap-2 min-w-[140px]"
                        >
                          إيقاف الاستماع
                        </Button>
                      </div>

                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900">
                          ✅ أنت الآن تستمع للبث المباشر
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {isListening && (
              <BroadcastMarkers 
                broadcastId={broadcastId}
                currentTime={elapsedTime}
                canManage={false}
              />
            )}

            {user && isListening && (
              <div className="h-[500px]">
                <ChatBox 
                  broadcastId={broadcastId} 
                  currentUser={user}
                  isBroadcaster={false}
                />
              </div>
            )}
          </div>

          {isListening && (
            <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-8">
              <ListenersList 
                broadcastId={broadcastId}
                isBroadcaster={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}