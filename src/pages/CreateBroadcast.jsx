import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, MicOff, Radio, Users, AlertCircle, Loader2, CheckCircle, Shield, Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AudioVisualizer from "../components/broadcast/AudioVisualizer";
import LiveIndicator from "../components/broadcast/LiveIndicator";
import ChatBox from "../components/broadcast/ChatBox";
import ListenersList from "../components/broadcast/ListenersList";
import ShareButton from "../components/broadcast/ShareButton";
import AudioSettings from "../components/broadcast/AudioSettings";
import AgoraAudioBroadcaster from "../components/broadcast/AgoraAudioBroadcaster";
import ListenerStatsChart from "../components/broadcast/ListenerStatsChart";
import MuteAllControl from "../components/broadcast/MuteAllControl";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import MarkerManager from "../components/broadcast/MarkerManager";
import UnifiedRecordingButton from "../components/broadcast/UnifiedRecordingButton";
// import LiveQuestionsPanel from "../components/broadcast/LiveQuestionsPanel";
import ScreenOrCoverDisplay from "../components/broadcast/ScreenOrCoverDisplay"; // ← جديد

const categories = ["علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function CreateBroadcast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const activeBroadcastId = urlParams.get('active');
  const scheduledBroadcastId = urlParams.get('scheduled');

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: "",
    description: "",
    category: "علوم شرعية",
    lecturer_name: "د.إبراهيم الشربيني",
    series_id: "",
    episode_number: null,
    has_video: false,
    youtube_url: "",
    facebook_url: "",
    rebroadcast_from_recording_id: "",
    rebroadcast_from_url: ""
  });
  const [currentBroadcast, setCurrentBroadcast] = useState(null);
  const [error, setError] = useState(null);
  const [listenerCount, setListenerCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioSettings, setAudioSettings] = useState({ gain: 1.0, compression: 0.5, bass: 0, treble: 0 });
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [agoraTrack, setAgoraTrack] = useState(null);
  const [agoraScreenStream, setAgoraScreenStream] = useState(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const startAgoraScreenShareRef = useRef(null);
  const [listenerStats, setListenerStats] = useState([]);
  const [peakListeners, setPeakListeners] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [useCloudflareR2, setUseCloudflareR2] = useState(false);

  const statsIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const compressorRef = useRef(null);
  const bassEQRef = useRef(null);
  const trebleEQRef = useRef(null);

  const [selectedScheduledBroadcast, setSelectedScheduledBroadcast] = useState(scheduledBroadcastId || "");
  const [showCoverPreview, setShowCoverPreview] = useState(false);
  const [availableCovers, setAvailableCovers] = useState([]);
  const [selectedCoverId, setSelectedCoverId] = useState("");

  const MAX_DURATION_HOURS = 3;
  const MAX_DURATION_SECONDS = MAX_DURATION_HOURS * 60 * 60;

  useEffect(() => {
    base44.functions.invoke('checkR2Configuration', {})
      .then(r => { if (r.data?.configured) setUseCloudflareR2(true); })
      .catch(() => {});
  }, []);

  const { data: broadcastCover } = useQuery({
    queryKey: ['broadcastCover', currentBroadcast?.id],
    queryFn: async () => {
      if (!currentBroadcast?.id) return null;
      const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: currentBroadcast.id });
      return covers.length > 0 ? covers[0] : null;
    },
    enabled: !!currentBroadcast?.id && isLive,
  });

  const { data: liveBroadcastData } = useQuery({
    queryKey: ['liveBroadcastMuteState', currentBroadcast?.id],
    queryFn: async () => {
      if (!currentBroadcast?.id) return null;
      const results = await base44.entities.Broadcast.filter({ id: currentBroadcast.id });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!currentBroadcast?.id && isLive,
    refetchInterval: 3000,
  });

  const isMutedForAll = liveBroadcastData?.is_muted_for_all ?? currentBroadcast?.is_muted_for_all ?? false;

  const { data: scheduledBroadcasts = [] } = useQuery({
    queryKey: ['scheduledBroadcastsCreate'],
    queryFn: () => base44.entities.Broadcast.filter({ is_scheduled: true, is_live: false, broadcaster_id: user?.id }),
    enabled: !isLive && !!user?.id,
  });

  const { data: allCovers = [] } = useQuery({
    queryKey: ['allCovers'],
    queryFn: () => base44.entities.BroadcastCover.list("-created_date"),
    enabled: !isLive,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !isLive,
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['recordingsForRebroadcast'],
    queryFn: () => base44.entities.Recording.list("-created_date"),
    enabled: !isLive,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === 'admin' || currentUser.custom_role === 'admin' || currentUser.custom_role === 'broadcaster' || currentUser.custom_role === 'content_manager');
        if (currentUser.role !== 'admin' && currentUser.custom_role !== 'admin' && currentUser.custom_role !== 'broadcaster' && currentUser.custom_role !== 'content_manager') {
          setError("عذراً، البث المباشر متاح للمشرفين والمذيعين فقط");
          return;
        }
        if (activeBroadcastId) loadActiveBroadcast(activeBroadcastId);
        else if (scheduledBroadcastId) { loadScheduledBroadcast(scheduledBroadcastId); setSelectedScheduledBroadcast(scheduledBroadcastId); }
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, [activeBroadcastId, scheduledBroadcastId]);

  useEffect(() => {
    if (isLive && startTimeRef.current) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
        setElapsedSeconds(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
      setElapsedSeconds(0);
    }
  }, [isLive, startTimeRef.current]);

  useEffect(() => {
    if (isLive && startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed >= MAX_DURATION_SECONDS) {
        alert(`⚠️ تم إنهاء البث تلقائياً بعد ${MAX_DURATION_HOURS} ساعات`);
        stopBroadcast();
      }
    }
  }, [elapsedTime, isLive]);

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const loadActiveBroadcast = async (broadcastId) => {
    try {
      const broadcasts = await base44.entities.Broadcast.filter({ id: broadcastId, is_live: true });
      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        setCurrentBroadcast(broadcast);
        setBroadcastData({
          title: broadcast.title, description: broadcast.description || "", category: broadcast.category,
          lecturer_name: broadcast.lecturer_name || "د.إبراهيم الشربيني", series_id: broadcast.series_id || "",
          episode_number: broadcast.episode_number || null, has_video: broadcast.has_video || false,
          youtube_url: broadcast.youtube_url || "", facebook_url: broadcast.facebook_url || "",
          rebroadcast_from_recording_id: broadcast.rebroadcast_from_recording_id || "",
          rebroadcast_from_url: broadcast.rebroadcast_from_url || ""
        });
        setIsLive(true);
        startTimeRef.current = new Date(broadcast.started_at).getTime();
        setError(null);
      } else {
        navigate(createPageUrl("CreateBroadcast"), { replace: true });
      }
    } catch (error) {
      setError("فشل تحميل البث النشط");
    }
  };

  const loadScheduledBroadcast = async (broadcastId) => {
    try {
      const broadcasts = await base44.entities.Broadcast.filter({ id: broadcastId, is_scheduled: true, is_live: false });
      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        setBroadcastData({
          title: broadcast.title, description: broadcast.description || "", category: broadcast.category,
          lecturer_name: broadcast.lecturer_name || "د.إبراهيم الشربيني", series_id: broadcast.series_id || "",
          episode_number: broadcast.episode_number || null, has_video: broadcast.has_video || false,
          youtube_url: broadcast.youtube_url || "", facebook_url: broadcast.facebook_url || "",
          rebroadcast_from_recording_id: broadcast.rebroadcast_from_recording_id || "",
          rebroadcast_from_url: broadcast.rebroadcast_from_url || ""
        });
        const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastId });
        setSelectedCoverId(covers.length > 0 ? covers[0].id : "");
      } else {
        setError("البث المجدول المحدد غير موجود أو غير متاح للبدء.");
        setSelectedScheduledBroadcast("");
        navigate(createPageUrl("CreateBroadcast"), { replace: true });
      }
    } catch (error) {
      setError("فشل تحميل البث المجدول");
    }
  };

  const handleScheduledBroadcastChange = (broadcastId) => {
    setSelectedScheduledBroadcast(broadcastId);
    if (broadcastId) {
      loadScheduledBroadcast(broadcastId);
    } else {
      setBroadcastData({ title: "", description: "", category: "علوم شرعية", lecturer_name: "د.إبراهيم الشربيني", series_id: "", episode_number: null, has_video: false, youtube_url: "", facebook_url: "", rebroadcast_from_recording_id: "", rebroadcast_from_url: "" });
      setSelectedCoverId("");
    }
  };

  useEffect(() => {
    if (selectedScheduledBroadcast) {
      const coversForScheduled = allCovers.filter(c => c.broadcast_id === selectedScheduledBroadcast);
      const templateCovers = allCovers.filter(c => c.broadcast_id === null || c.broadcast_id === undefined);
      setAvailableCovers([...templateCovers, ...coversForScheduled]);
      if (coversForScheduled.length > 0) setSelectedCoverId(coversForScheduled[0].id);
      else setSelectedCoverId("");
    } else {
      setAvailableCovers(allCovers.filter(c => c.broadcast_id === null || c.broadcast_id === undefined));
      setSelectedCoverId("");
    }
  }, [selectedScheduledBroadcast, allCovers]);

  useEffect(() => {
    if (isLive && currentBroadcast) {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(async () => {
        try {
          const listeners = await base44.entities.Listener.filter({ broadcast_id: currentBroadcast.id, is_active: true });
          const count = listeners.length;
          setListenerCount(count);
          let currentPeakForStat = 0;
          setPeakListeners(prevPeak => { const newPeak = Math.max(prevPeak, count); currentPeakForStat = newPeak; return newPeak; });
          const stat = await base44.entities.ListenerStats.create({ broadcast_id: currentBroadcast.id, timestamp: new Date().toISOString(), active_listeners: count, peak_listeners: currentPeakForStat });
          setListenerStats(prev => [...prev.slice(-19), stat]);
        } catch (error) { console.error("Error tracking listener stats:", error); }
      }, 10000);
      return () => { if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; } };
    } else {
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
    }
  }, [isLive, currentBroadcast]);

  const createBroadcastMutation = useMutation({
    mutationFn: (data) => base44.entities.Broadcast.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['broadcasts'] }); },
  });

  const updateBroadcastMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Broadcast.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['broadcasts'] }); },
  });

  const setupAudioProcessing = (stream) => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const gainNode = audioContext.createGain(); gainNode.gain.value = audioSettings.gain; gainNodeRef.current = gainNode;
    const compressor = audioContext.createDynamicsCompressor(); compressor.threshold.value = -50; compressor.knee.value = 40; compressor.ratio.value = 12; compressor.attack.value = 0; compressor.release.value = 0.25; compressorRef.current = compressor;
    const bassEQ = audioContext.createBiquadFilter(); bassEQ.type = 'lowshelf'; bassEQ.frequency.value = 200; bassEQ.gain.value = audioSettings.bass; bassEQRef.current = bassEQ;
    const trebleEQ = audioContext.createBiquadFilter(); trebleEQ.type = 'highshelf'; trebleEQ.frequency.value = 3000; trebleEQ.gain.value = audioSettings.treble; trebleEQRef.current = trebleEQ;
    source.connect(gainNode); gainNode.connect(compressor); compressor.connect(bassEQ); bassEQ.connect(trebleEQ); trebleEQ.connect(audioContext.destination);
  };

  const handleAudioSettingsChange = (settings) => {
    setAudioSettings(settings);
    if (gainNodeRef.current) gainNodeRef.current.gain.value = settings.gain;
    if (bassEQRef.current) bassEQRef.current.gain.value = settings.bass;
    if (trebleEQRef.current) trebleEQRef.current.gain.value = settings.treble;
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isLive && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
      if (newStream) { streamRef.current = newStream; setupAudioProcessing(newStream); }
    }
  };

  const startBroadcast = async () => {
    if (!isAdmin) { setError("عذراً، البث المباشر متاح للمشرفين والمذيعين فقط"); return; }
    if (!broadcastData.title.trim()) { setError("يرجى إدخال عنوان للبث"); return; }
    setIsConnecting(true);
    try {
      const existingBroadcasts = await base44.entities.Broadcast.filter({ broadcaster_id: user.id, is_live: true });
      if (existingBroadcasts.length > 0) {
        const activeBroadcast = existingBroadcasts[0];
        setError(<div className="space-y-3"><p>لديك بث نشط بالفعل.</p><Button onClick={() => { window.location.href = createPageUrl(`CreateBroadcast?active=${activeBroadcast.id}`); }} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">الانتقال للبث النشط</Button></div>);
        setIsConnecting(false);
        return;
      }

      let broadcastToStart = null;
      if (selectedScheduledBroadcast) {
        const scheduled = scheduledBroadcasts.find(b => b.id === selectedScheduledBroadcast);
        if (!scheduled) { setError("البث المجدول المحدد غير موجود."); setIsConnecting(false); return; }
        broadcastToStart = await updateBroadcastMutation.mutateAsync({ id: scheduled.id, data: { is_live: true, is_scheduled: false, started_at: new Date().toISOString(), title: broadcastData.title, description: broadcastData.description, category: broadcastData.category, lecturer_name: broadcastData.lecturer_name, series_id: broadcastData.series_id || null, episode_number: broadcastData.episode_number || null, has_video: broadcastData.has_video, youtube_url: broadcastData.youtube_url, facebook_url: broadcastData.facebook_url, rebroadcast_from_recording_id: broadcastData.rebroadcast_from_recording_id || null, rebroadcast_from_url: broadcastData.rebroadcast_from_url || null, broadcaster_name: user.full_name || user.email, broadcaster_id: user.id } });
        queryClient.invalidateQueries({ queryKey: ['scheduledBroadcastsCreate'] });
      } else {
        broadcastToStart = await createBroadcastMutation.mutateAsync({ title: broadcastData.title, description: broadcastData.description, category: broadcastData.category, lecturer_name: broadcastData.lecturer_name || "د.إبراهيم الشربيني", series_id: broadcastData.series_id || null, episode_number: broadcastData.episode_number || null, broadcaster_name: user.full_name || user.email, broadcaster_id: user.id, is_live: true, is_muted_for_all: false, started_at: new Date().toISOString(), listener_count: 0, total_listeners: 0, has_video: broadcastData.has_video, youtube_url: broadcastData.youtube_url, facebook_url: broadcastData.facebook_url, rebroadcast_from_recording_id: broadcastData.rebroadcast_from_recording_id || null, rebroadcast_from_url: broadcastData.rebroadcast_from_url || null });
      }

      if (broadcastToStart) {
        const currentLinkedCover = (await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastToStart.id }))[0];
        if (selectedCoverId) {
          if (currentLinkedCover && currentLinkedCover.id !== selectedCoverId) await base44.entities.BroadcastCover.update(currentLinkedCover.id, { broadcast_id: null });
          await base44.entities.BroadcastCover.update(selectedCoverId, { broadcast_id: broadcastToStart.id });
          queryClient.invalidateQueries({ queryKey: ['broadcastCover', broadcastToStart.id] });
        } else {
          if (currentLinkedCover) { await base44.entities.BroadcastCover.update(currentLinkedCover.id, { broadcast_id: null }); queryClient.invalidateQueries({ queryKey: ['broadcastCover', broadcastToStart.id] }); }
        }
        try { await base44.functions.invoke('notifyFollowers', { broadcast_id: broadcastToStart.id, type: 'live_starting' }); } catch (err) { console.error("Error sending notifications:", err); }
        startTimeRef.current = Date.now();
        setIsLive(true);
        setIsConnecting(false);
        setError(null);
        setListenerStats([]);
        setPeakListeners(0);
        setCurrentBroadcast(broadcastToStart);
      }
    } catch (error) {
      setIsConnecting(false);
      setError("حدث خطأ أثناء بدء البث.");
      console.error("Error starting broadcast:", error);
    }
  };

  const handleAgoraTrackReady = (track) => {
    setAgoraTrack(track);
    streamRef.current = new MediaStream([track.getMediaStreamTrack()]);
  };

  const handleAgoraError = (error) => { setError(`خطأ في الاتصال: ${error.message}`); };

  const stopBroadcast = async () => {
    if (!currentBroadcast) return;
    try {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 60000);
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
      const listeners = await base44.entities.Listener.filter({ broadcast_id: currentBroadcast.id, is_active: true });
      for (const listener of listeners) await base44.entities.Listener.update(listener.id, { is_active: false });
      await updateBroadcastMutation.mutateAsync({ id: currentBroadcast.id, data: { is_live: false, ended_at: new Date().toISOString(), duration_minutes: duration, total_listeners: peakListeners } });
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
      try { await base44.functions.invoke('notifyFollowers', { broadcast_id: currentBroadcast.id, type: 'new_recording' }); } catch (err) { console.error(err); }
      setIsLive(false); setCurrentBroadcast(null);
      setBroadcastData({ title: "", description: "", category: "علوم شرعية", lecturer_name: "د.إبراهيم الشربيني", series_id: "", episode_number: null, has_video: false, youtube_url: "", facebook_url: "", rebroadcast_from_recording_id: "", rebroadcast_from_url: "" });
      setListenerCount(0); setAgoraTrack(null); setListenerStats([]); setPeakListeners(0); setSelectedScheduledBroadcast(""); setSelectedCoverId("");
      navigate(createPageUrl("MyBroadcasts"));
    } catch (error) {
      setError("حدث خطأ أثناء إيقاف البث.");
      console.error("Error stopping broadcast:", error);
    }
  };

  const toggleMute = () => {
    if (agoraTrack) { agoraTrack.setMuted(!isMuted); setIsMuted(!isMuted); }
    else if (gainNodeRef.current) { gainNodeRef.current.gain.value = isMuted ? audioSettings.gain : 0; setIsMuted(!isMuted); }
    else if (streamRef.current) { streamRef.current.getAudioTracks().forEach(track => { track.enabled = isMuted; }); setIsMuted(!isMuted); }
  };

  if (!isAdmin && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"><Shield className="w-10 h-10 text-purple-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
            <p className="text-gray-600 mb-6">عذراً، البث المباشر متاح للمشرفين والمذيعين فقط.</p>
            <Button onClick={() => navigate(createPageUrl("Home"))} className="bg-gradient-to-r from-purple-500 to-pink-500">العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{isLive ? "بثك المباشر" : "ابدأ بث جديد"}</h1>
          <p className="text-gray-600">{isLive ? "أنت الآن على الهواء مباشرة!" : "ابدأ بثاً مباشراً أو اختر من البثوث المجدولة"}</p>
        </motion.div>

        {error && !isLive && (
          <Alert variant="destructive" className="mb-6 max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLive ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Card className="border-2 border-purple-300 bg-gradient-to-br from-white to-purple-50 shadow-2xl">
                  <CardHeader className="border-b border-purple-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{broadcastData.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <LiveIndicator isLive={true} size="lg" />
                        <ShareButton broadcastId={currentBroadcast?.id} title={broadcastData.title} />
                        <AudioSettings onDeviceChange={handleDeviceChange} audioStream={streamRef.current} onSettingsChange={handleAudioSettingsChange} currentSettings={audioSettings} />
                      </div>
                    </div>
                    {broadcastData.lecturer_name && <p className="text-sm text-gray-600 mt-2">المحاضر: {broadcastData.lecturer_name}</p>}
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">

                    {/* ← التعديل الرئيسي: عرض الشاشة أو الغلاف */}
                    <ScreenOrCoverDisplay
                      broadcastId={currentBroadcast?.id}
                      screenStream={agoraScreenStream}
                    />

                    <AgoraAudioBroadcaster
                      channelName={currentBroadcast?.id}
                      isActive={isLive}
                      deviceId={selectedDeviceId}
                      onTrackReady={handleAgoraTrackReady}
                      onError={handleAgoraError}
                      onScreenShareChange={(isSharing, stream) => setAgoraScreenStream(isSharing ? stream : null)}
                      screenShareLockedByRecording={isScreenRecording}
                      onStartScreenShareRef={startAgoraScreenShareRef}
                    />

                    <AudioVisualizer isActive={!isMuted} audioStream={streamRef.current} />

                    <div className="flex items-center justify-center gap-6 text-gray-700 flex-wrap">
                      <div className="flex items-center gap-2 bg-white rounded-xl px-6 py-3 shadow-md">
                        <Users className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-bold">{listenerCount}</span>
                        <span className="text-sm">مستمع</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-xl px-6 py-3 shadow-md">
                        <Clock className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold">{formatElapsedTime(elapsedTime)}</span>
                        <span className="text-sm">الوقت المنقضي</span>
                      </div>
                    </div>

                    {/* أزرار التحكم */}
                    <div className="flex gap-3 justify-center flex-wrap items-center">
                      <Button onClick={toggleMute} variant="outline" size="lg" className="gap-2 hover:bg-purple-50 border-2">
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        {isMuted ? "تشغيل الصوت" : "كتم الصوت"}
                      </Button>

                      <UnifiedRecordingButton
                        broadcastId={currentBroadcast?.id}
                        broadcastTitle={broadcastData.title}
                        audioStream={streamRef.current}
                        agoraScreenStream={agoraScreenStream}
                        onStartAgoraScreenShare={() => startAgoraScreenShareRef.current?.()}
                        useCloudflareR2={useCloudflareR2}
                        onScreenRecordingChange={setIsScreenRecording}
                      />

                      <MuteAllControl broadcast={currentBroadcast} isMutedForAll={isMutedForAll} />

                      <Button
                        onClick={stopBroadcast}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-xl"
                        disabled={updateBroadcastMutation.isPending}
                      >
                        {updateBroadcastMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                        <span className="font-bold text-base">إنهاء البث</span>
                      </Button>
                    </div>

                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900">✅ البث المباشر نشط مع معالجة صوت احترافية</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>

              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-900">
                  ⏰ الحد الأقصى لمدة البث: {MAX_DURATION_HOURS} ساعات - الوقت المنقضي: {formatElapsedTime(elapsedTime)}
                </AlertDescription>
              </Alert>

              <MarkerManager broadcastId={currentBroadcast?.id} currentTimestamp={elapsedSeconds} canManage={true} />

              <ListenerStatsChart stats={listenerStats} currentListeners={listenerCount} peakListeners={peakListeners} />

              <div className="h-[500px]">
                <ChatBox broadcastId={currentBroadcast?.id} currentUser={user} isBroadcaster={true} />
              </div>
            </div>

            <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-8">
              <ListenersList broadcastId={currentBroadcast?.id} isBroadcaster={true} />
            </div>
          </div>
        ) : (
          <Card className="shadow-xl border-2 border-purple-100 max-w-4xl mx-auto">
            <CardHeader><CardTitle className="text-2xl">معلومات البث</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scheduled" className="text-base font-semibold">اختر من البثوث المجدولة (اختياري)</Label>
                <Select value={selectedScheduledBroadcast || ""} onValueChange={handleScheduledBroadcastChange}>
                  <SelectTrigger className="text-base"><SelectValue placeholder="بث جديد (بدون جدولة)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>بث جديد (بدون جدولة)</SelectItem>
                    {scheduledBroadcasts.map((sb) => (
                      <SelectItem key={sb.id} value={sb.id}>{sb.title} - {new Date(sb.scheduled_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedScheduledBroadcast && <p className="text-sm text-green-600">✅ تم تحميل بيانات البث المجدول</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">عنوان البث *</Label>
                <Input id="title" placeholder="اختر عنواناً جذاباً لبثك..." value={broadcastData.title} onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })} className="text-lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lecturer" className="text-base font-semibold">اسم المحاضر</Label>
                <Input id="lecturer" placeholder="د.إبراهيم الشربيني" value={broadcastData.lecturer_name} onChange={(e) => setBroadcastData({ ...broadcastData, lecturer_name: e.target.value })} className="text-lg" />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">السلسلة (اختياري)</Label>
                <Select value={broadcastData.series_id || "none"} onValueChange={(value) => setBroadcastData({ ...broadcastData, series_id: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="بدون سلسلة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون سلسلة</SelectItem>
                    {series.map((s) => (<SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {broadcastData.series_id && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">رقم الحلقة</Label>
                  <Input type="number" value={broadcastData.episode_number || ""} onChange={(e) => setBroadcastData({ ...broadcastData, episode_number: parseInt(e.target.value) || null })} placeholder="1" min="1" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">وصف البث</Label>
                <Textarea id="description" placeholder="أخبر المستمعين عن محتوى بثك..." value={broadcastData.description} onChange={(e) => setBroadcastData({ ...broadcastData, description: e.target.value })} className="min-h-24 text-base" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-base font-semibold">التصنيف</Label>
                <Select value={broadcastData.category} onValueChange={(value) => setBroadcastData({ ...broadcastData, category: value })}>
                  <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((category) => (<SelectItem key={category} value={category} className="text-base">{category}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <div className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-100">
                <Label className="text-base font-semibold flex items-center gap-2"><Radio className="w-5 h-5 text-orange-600" />إعادة بث من تسجيل أو رابط خارجي</Label>
                <div className="space-y-2">
                  <Label className="text-sm">اختر تسجيل لإعادة بثه</Label>
                  <Select value={broadcastData.rebroadcast_from_recording_id || "none"} onValueChange={(value) => setBroadcastData({ ...broadcastData, rebroadcast_from_recording_id: value === "none" ? "" : value, rebroadcast_from_url: "" })}>
                    <SelectTrigger><SelectValue placeholder="بث جديد (بدون إعادة)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بث جديد (بدون إعادة)</SelectItem>
                      {recordings.map((r) => (<SelectItem key={r.id} value={r.id}>{r.title} - {Math.floor((r.duration_seconds || 0) / 60)} دقيقة</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-orange-300"></div></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-orange-50 px-2 text-orange-600">أو</span></div></div>
                <div className="space-y-2">
                  <Label className="text-sm">رابط خارجي لإعادة البث</Label>
                  <Input placeholder="https://example.com/audio.mp3" value={broadcastData.rebroadcast_from_url} onChange={(e) => setBroadcastData({ ...broadcastData, rebroadcast_from_url: e.target.value, rebroadcast_from_recording_id: "" })} disabled={!!broadcastData.rebroadcast_from_recording_id} />
                  <p className="text-xs text-orange-600">💡 أدخل رابط ملف صوتي مباشر (mp3, webm, ogg)</p>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-100">
                <Label className="text-base font-semibold flex items-center gap-2"><Radio className="w-5 h-5 text-blue-600" />ربط البث مع منصات أخرى</Label>
                <div className="space-y-2">
                  <Label className="text-sm">رابط YouTube Live</Label>
                  <Input placeholder="https://youtube.com/live/..." value={broadcastData.youtube_url} onChange={(e) => setBroadcastData({ ...broadcastData, youtube_url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">رابط Facebook Live</Label>
                  <Input placeholder="https://facebook.com/..." value={broadcastData.facebook_url} onChange={(e) => setBroadcastData({ ...broadcastData, facebook_url: e.target.value })} />
                </div>
              </div>

              {availableCovers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">اختر الغلاف (اختياري)</Label>
                  <Select value={selectedCoverId} onValueChange={setSelectedCoverId}>
                    <SelectTrigger><SelectValue placeholder="بدون غلاف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>بدون غلاف</SelectItem>
                      {availableCovers.map((cover) => (<SelectItem key={cover.id} value={cover.id}>{cover.fixed_title} - سورة {cover.surah_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {selectedCoverId && <p className="text-sm text-green-600">✅ سيتم استخدام هذا الغلاف في البث</p>}
                </div>
              )}

              {(broadcastData.title || selectedCoverId) && (
                <div className="space-y-2">
                  <Button onClick={() => setShowCoverPreview(!showCoverPreview)} variant="outline" className="w-full gap-2 border-2 border-blue-200">
                    <Eye className="w-5 h-5" />
                    {showCoverPreview ? "إخفاء معاينة الغلاف" : "معاينة الغلاف"}
                  </Button>
                  {showCoverPreview && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                      <p className="text-sm text-gray-600 mb-3">💡 هذه معاينة للغلاف</p>
                      <BroadcastCover broadcastId={selectedScheduledBroadcast || "preview"} className="max-w-2xl mx-auto" />
                    </motion.div>
                  )}
                </div>
              )}

              <Button onClick={startBroadcast} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-3" disabled={isConnecting || !broadcastData.title.trim()}>
                {isConnecting ? (<><Loader2 className="w-6 h-6 animate-spin" />جارٍ الاتصال بالخادم...</>) : (<><Radio className="w-6 h-6" />ابدأ البث المباشر</>)}
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">✅ أنت مشرف - يمكنك بدء البث المباشر</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}