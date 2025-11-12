
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
import RecordingControls from "../components/broadcast/RecordingControls";
import ListenerStatsChart from "../components/broadcast/ListenerStatsChart";
import MuteAllControl from "../components/broadcast/MuteAllControl";
import BroadcastCover from "../components/broadcast/BroadcastCover";

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
  const [audioSettings, setAudioSettings] = useState({
    gain: 1.0,
    compression: 0.5,
    bass: 0,
    treble: 0
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [agoraTrack, setAgoraTrack] = useState(null);
  const [listenerStats, setListenerStats] = useState([]);
  const [peakListeners, setPeakListeners] = useState(0);
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

  const [elapsedTime, setElapsedTime] = useState(0);
  const MAX_DURATION_HOURS = 3;
  const MAX_DURATION_SECONDS = MAX_DURATION_HOURS * 60 * 60;

  // Fetch cover for preview (this fetches the cover *associated with currentBroadcast*)
  const { data: broadcastCover } = useQuery({
    queryKey: ['broadcastCover', currentBroadcast?.id],
    queryFn: async () => {
      if (!currentBroadcast?.id) return null;
      const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: currentBroadcast.id });
      return covers.length > 0 ? covers[0] : null;
    },
    enabled: !!currentBroadcast?.id && isLive, // Only fetch for live broadcast
  });

  // Fetch scheduled broadcasts
  const { data: scheduledBroadcasts = [] } = useQuery({
    queryKey: ['scheduledBroadcastsCreate'],
    queryFn: () => base44.entities.Broadcast.filter({ is_scheduled: true, is_live: false, broadcaster_id: user?.id }), // Filter by current user for scheduling
    enabled: !isLive && !!user?.id, // Only fetch if not live and user is known
  });

  // Fetch all covers
  const { data: allCovers = [] } = useQuery({
    queryKey: ['allCovers'],
    queryFn: () => base44.entities.BroadcastCover.list("-created_date"),
    enabled: !isLive, // Only fetch if not live
  });

  // Fetch series for dropdown
  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !isLive,
  });

  // Fetch recordings for re-broadcast dropdown
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
        // Updated admin/broadcaster role check
        setIsAdmin(currentUser.role === 'admin' || currentUser.custom_role === 'admin' || currentUser.custom_role === 'broadcaster' || currentUser.custom_role === 'content_manager');

        if (currentUser.role !== 'admin' && currentUser.custom_role !== 'admin' && currentUser.custom_role !== 'broadcaster' && currentUser.custom_role !== 'content_manager') {
          setError("عذراً، البث المباشر متاح للمشرفين والمذيعين فقط"); // Updated error message
          return;
        }

        // Check if there's an active broadcast ID in URL
        if (activeBroadcastId) {
          loadActiveBroadcast(activeBroadcastId);
        } else if (scheduledBroadcastId) { // New: Load scheduled broadcast from URL
          loadScheduledBroadcast(scheduledBroadcastId);
          setSelectedScheduledBroadcast(scheduledBroadcastId); // Set the select dropdown value
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, [activeBroadcastId, scheduledBroadcastId, user?.id]); // Added user.id to dependencies for scheduledBroadcasts query

  // Track elapsed time
  useEffect(() => {
    if (isLive && startTimeRef.current) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isLive, startTimeRef.current]);

  // Auto-stop broadcast after 3 hours
  useEffect(() => {
    if (isLive && startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (elapsed >= MAX_DURATION_SECONDS) {
        alert(`⚠️ تم إنهاء البث تلقائياً بعد ${MAX_DURATION_HOURS} ساعات (الحد الأقصى)`);
        stopBroadcast();
      }
    }
  }, [elapsedTime, isLive]); // Depend on elapsedTime to trigger check every second

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const loadActiveBroadcast = async (broadcastId) => {
    try {
      const broadcasts = await base44.entities.Broadcast.filter({
        id: broadcastId,
        is_live: true
      });

      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        setCurrentBroadcast(broadcast);
        setBroadcastData({
          title: broadcast.title,
          description: broadcast.description || "",
          category: broadcast.category,
          lecturer_name: broadcast.lecturer_name || "د.إبراهيم الشربيني",
          series_id: broadcast.series_id || "",
          episode_number: broadcast.episode_number || null,
          has_video: broadcast.has_video || false,
          youtube_url: broadcast.youtube_url || "",
          facebook_url: broadcast.facebook_url || "",
          rebroadcast_from_recording_id: broadcast.rebroadcast_from_recording_id || "",
          rebroadcast_from_url: broadcast.rebroadcast_from_url || ""
        });
        setIsLive(true);
        startTimeRef.current = new Date(broadcast.started_at).getTime();
        setError(null);
      } else {
        // If broadcast ID was in URL but not found or not live, clear it.
        navigate(createPageUrl("CreateBroadcast"), { replace: true });
      }
    } catch (error) {
      console.error("Error loading active broadcast:", error);
      setError("فشل تحميل البث النشط");
    }
  };

  // New: Load scheduled broadcast data into form
  const loadScheduledBroadcast = async (broadcastId) => {
    try {
      const broadcasts = await base44.entities.Broadcast.filter({ id: broadcastId, is_scheduled: true, is_live: false });
      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        setBroadcastData({
          title: broadcast.title,
          description: broadcast.description || "",
          category: broadcast.category,
          lecturer_name: broadcast.lecturer_name || "د.إبراهيم الشربيني",
          series_id: broadcast.series_id || "",
          episode_number: broadcast.episode_number || null,
          has_video: broadcast.has_video || false, // Scheduled broadcasts might not have video, or could carry over
          youtube_url: broadcast.youtube_url || "",
          facebook_url: broadcast.facebook_url || "",
          rebroadcast_from_recording_id: broadcast.rebroadcast_from_recording_id || "",
          rebroadcast_from_url: broadcast.rebroadcast_from_url || ""
        });

        // Check if cover exists for this scheduled broadcast and pre-select it
        const covers = await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastId });
        if (covers.length > 0) {
          setSelectedCoverId(covers[0].id);
        } else {
          setSelectedCoverId(""); // No cover associated
        }
      } else {
        // If scheduled broadcast ID was in URL but not found or already live/not scheduled
        setError("البث المجدول المحدد غير موجود أو غير متاح للبدء.");
        setSelectedScheduledBroadcast(""); // Clear selection
        navigate(createPageUrl("CreateBroadcast"), { replace: true }); // Remove from URL
      }
    } catch (error) {
      console.error("Error loading scheduled broadcast:", error);
      setError("فشل تحميل البث المجدول");
    }
  };

  // New: Handler for scheduled broadcast selection dropdown
  const handleScheduledBroadcastChange = (broadcastId) => {
    setSelectedScheduledBroadcast(broadcastId);
    if (broadcastId) {
      loadScheduledBroadcast(broadcastId);
    } else {
      // Reset form data if "new broadcast" is selected
      setBroadcastData({
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
      setSelectedCoverId(""); // Clear selected cover as well
    }
  };

  // New: Filter covers based on selected broadcast or show all
  useEffect(() => {
    if (selectedScheduledBroadcast) {
      // If a scheduled broadcast is selected, show covers linked to it AND template covers
      const coversForScheduled = allCovers.filter(c => c.broadcast_id === selectedScheduledBroadcast);
      const templateCovers = allCovers.filter(c => c.broadcast_id === null || c.broadcast_id === undefined);
      setAvailableCovers([...templateCovers, ...coversForScheduled]);

      // If a cover was already set for this scheduled broadcast, make sure it's selected in the dropdown
      if (coversForScheduled.length > 0) {
        setSelectedCoverId(coversForScheduled[0].id);
      } else {
        setSelectedCoverId(""); // No cover currently linked, default to empty
      }
    } else {
      // If no scheduled broadcast is selected, show all covers that are not associated with any broadcast (templates)
      setAvailableCovers(allCovers.filter(c => c.broadcast_id === null || c.broadcast_id === undefined));
      setSelectedCoverId(""); // Clear cover selection for a new, unscheduled broadcast
    }
  }, [selectedScheduledBroadcast, allCovers]);

  // Track listener stats
  useEffect(() => {
    if (isLive && currentBroadcast) {
      // Clear any existing interval to prevent duplicates if component re-renders
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }

      statsIntervalRef.current = setInterval(async () => {
        try {
          const listeners = await base44.entities.Listener.filter({
            broadcast_id: currentBroadcast.id,
            is_active: true
          });

          const count = listeners.length;
          setListenerCount(count);

          let currentPeakForStat = 0;
          setPeakListeners(prevPeak => {
            const newPeak = Math.max(prevPeak, count);
            currentPeakForStat = newPeak; // Capture the potential new peak value for this stat entry
            return newPeak;
          });

          // Save stats to database
          const stat = await base44.entities.ListenerStats.create({
            broadcast_id: currentBroadcast.id,
            timestamp: new Date().toISOString(),
            active_listeners: count,
            peak_listeners: currentPeakForStat // Use the value determined by setPeakListeners
          });

          setListenerStats(prev => [...prev.slice(-19), stat]); // Keep last 20 entries (20 * 10s = 200s or ~3.3 minutes)
        } catch (error) {
          console.error("Error tracking listener stats:", error);
        }
      }, 10000); // Every 10 seconds

      return () => {
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
      };
    } else {
      // If broadcast is not live, ensure interval is cleared
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
  }, [isLive, currentBroadcast]); // Dependencies: only when live status or currentBroadcast changes, we re-setup the interval

  const createBroadcastMutation = useMutation({
    mutationFn: (data) => base44.entities.Broadcast.create(data),
    onSuccess: (data) => {
      // setCurrentBroadcast handled in startBroadcast for clarity
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
  });

  const updateBroadcastMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Broadcast.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
  });

  const requestMicrophoneAccess = async (deviceId = null) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Managed manually by gainNodeRef
          sampleRate: 48000,
          ...(deviceId && { deviceId: { exact: deviceId } })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Setup audio processing
      setupAudioProcessing(stream);

      setError(null);
      return stream;
    } catch (err) {
      setError("لم نتمكن من الوصول للميكروفون. يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.");
      return null;
    }
  };

  const setupAudioProcessing = (stream) => {
    // If an audio context already exists and is not closed, close it first
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);

    // Gain Node
    const gainNode = audioContext.createGain();
    gainNode.gain.value = audioSettings.gain;
    gainNodeRef.current = gainNode;

    // Compressor
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -50; // default: -24
    compressor.knee.value = 40;     // default: 30
    compressor.ratio.value = 12;    // default: 12
    compressor.attack.value = 0;    // default: 0.003
    compressor.release.value = 0.25; // default: 0.25
    compressorRef.current = compressor;

    // Bass EQ (Low Shelf)
    const bassEQ = audioContext.createBiquadFilter();
    bassEQ.type = 'lowshelf';
    bassEQ.frequency.value = 200; // Frequencies below 200Hz
    bassEQ.gain.value = audioSettings.bass;
    bassEQRef.current = bassEQ;

    // Treble EQ (High Shelf)
    const trebleEQ = audioContext.createBiquadFilter();
    trebleEQ.type = 'highshelf';
    trebleEQ.frequency.value = 3000; // Frequencies above 3000Hz
    trebleEQ.gain.value = audioSettings.treble;
    trebleEQRef.current = trebleEQ;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(bassEQ);
    bassEQ.connect(trebleEQ);
    trebleEQ.connect(audioContext.destination);
  };

  const handleAudioSettingsChange = (settings) => {
    setAudioSettings(settings);

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = settings.gain;
    }
    if (bassEQRef.current) {
      bassEQRef.current.gain.value = settings.bass;
    }
    if (trebleEQRef.current) {
      trebleEQRef.current.gain.value = settings.treble;
    }
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isLive && streamRef.current) {
      // Stop current stream and audio context
      streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      // Start with new device
      const newStream = await requestMicrophoneAccess(deviceId);
      if (newStream) {
        streamRef.current = newStream;
      }
    }
  };

  const startBroadcast = async () => {
    if (!isAdmin) {
      setError("عذراً، البث المباشر متاح للمشرفين والمذيعين فقط");
      return;
    }

    if (!broadcastData.title.trim()) {
      setError("يرجى إدخال عنوان للبث");
      return;
    }

    setIsConnecting(true);

    // Check for existing active broadcast by the current user
    try {
      const existingBroadcasts = await base44.entities.Broadcast.filter({
        broadcaster_id: user.id,
        is_live: true
      });

      if (existingBroadcasts.length > 0) {
        const activeBroadcast = existingBroadcasts[0];
        setError(
          <div className="space-y-3">
            <p>لديك بث نشط بالفعل. يرجى إنهاء البث الحالي قبل بدء بث جديد.</p>
            <Button
              onClick={() => {
                // Reload the page with the active broadcast ID
                window.location.href = createPageUrl(`CreateBroadcast?active=${activeBroadcast.id}`);
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              الانتقال للبث النشط
            </Button>
          </div>
        );
        setIsConnecting(false);
        return;
      }

      let broadcastToStart = null;

      if (selectedScheduledBroadcast) {
        // Scenario 1: Starting a scheduled broadcast
        const scheduled = scheduledBroadcasts.find(b => b.id === selectedScheduledBroadcast);
        if (!scheduled) {
          setError("البث المجدول المحدد غير موجود أو غير متاح.");
          setIsConnecting(false);
          return;
        }

        broadcastToStart = await updateBroadcastMutation.mutateAsync({
          id: scheduled.id,
          data: {
            is_live: true,
            is_scheduled: false, // Mark as no longer scheduled
            started_at: new Date().toISOString(),
            // Update other fields from current form data
            title: broadcastData.title,
            description: broadcastData.description,
            category: broadcastData.category,
            lecturer_name: broadcastData.lecturer_name,
            series_id: broadcastData.series_id || null,
            episode_number: broadcastData.episode_number || null,
            has_video: broadcastData.has_video,
            youtube_url: broadcastData.youtube_url,
            facebook_url: broadcastData.facebook_url,
            rebroadcast_from_recording_id: broadcastData.rebroadcast_from_recording_id || null,
            rebroadcast_from_url: broadcastData.rebroadcast_from_url || null,
            broadcaster_name: user.full_name || user.email,
            broadcaster_id: user.id,
          }
        });
        queryClient.invalidateQueries({ queryKey: ['scheduledBroadcastsCreate'] }); // Invalidate scheduled list
        queryClient.invalidateQueries({ queryKey: ['broadcastCover', scheduled.id] }); // Invalidate cover for this broadcast
      } else {
        // Scenario 2: Creating a brand new broadcast
        broadcastToStart = await createBroadcastMutation.mutateAsync({
          title: broadcastData.title,
          description: broadcastData.description,
          category: broadcastData.category,
          lecturer_name: broadcastData.lecturer_name || "د.إبراهيم الشربيني",
          series_id: broadcastData.series_id || null,
          episode_number: broadcastData.episode_number || null,
          broadcaster_name: user.full_name || user.email,
          broadcaster_id: user.id,
          is_live: true,
          is_muted_for_all: true, // Default to muted for all on start
          started_at: new Date().toISOString(),
          listener_count: 0,
          total_listeners: 0,
          has_video: broadcastData.has_video,
          youtube_url: broadcastData.youtube_url,
          facebook_url: broadcastData.facebook_url,
          rebroadcast_from_recording_id: broadcastData.rebroadcast_from_recording_id || null,
          rebroadcast_from_url: broadcastData.rebroadcast_from_url || null
        });
      }

      // Common actions after broadcastToStart is defined
      if (broadcastToStart) {
        // Handle cover association
        const currentLinkedCover = (await base44.entities.BroadcastCover.filter({ broadcast_id: broadcastToStart.id }))[0];

        if (selectedCoverId) {
          // A specific cover template was chosen
          if (currentLinkedCover && currentLinkedCover.id !== selectedCoverId) {
            // If there was a different cover previously linked, unlink it
            await base44.entities.BroadcastCover.update(currentLinkedCover.id, { broadcast_id: null });
          }
          // Link the selected cover to this broadcast
          await base44.entities.BroadcastCover.update(selectedCoverId, { broadcast_id: broadcastToStart.id });
          queryClient.invalidateQueries({ queryKey: ['broadcastCover', broadcastToStart.id] }); // Invalidate the cache for the broadcast's cover
        } else {
          // No cover selected (or "بدون غلاف" was chosen)
          if (currentLinkedCover) {
            // If a cover was previously linked, unlink it
            await base44.entities.BroadcastCover.update(currentLinkedCover.id, { broadcast_id: null });
            queryClient.invalidateQueries({ queryKey: ['broadcastCover', broadcastToStart.id] }); // Invalidate the cache for the broadcast's cover
          }
        }

        // Send notifications to followers
        try {
          await base44.functions.invoke('notifyFollowers', {
            broadcast_id: broadcastToStart.id,
            type: 'live_starting'
          });
        } catch (err) {
          console.error("Error sending notifications:", err);
        }

        startTimeRef.current = Date.now();
        setIsLive(true);
        setIsConnecting(false);
        setError(null);
        setListenerStats([]);
        setPeakListeners(0);
        setCurrentBroadcast(broadcastToStart); // Set current broadcast after all operations
      }

    } catch (error) {
      setIsConnecting(false);
      setError("حدث خطأ أثناء بدء البث. يرجى المحاولة مرة أخرى.");
      console.error("Error starting broadcast:", error);
    }
  };

  const handleAgoraTrackReady = (track) => {
    setAgoraTrack(track);
    // If using Agora track, we don't need the Web Audio API processing for sending,
    // as Agora handles its own processing. We keep `streamRef.current` for the visualizer.
    // The visualizer will use the Agora track's MediaStreamTrack.
    streamRef.current = new MediaStream([track.getMediaStreamTrack()]);
  };

  const handleAgoraError = (error) => {
    setError(`خطأ في الاتصال: ${error.message}`);
  };

  const stopBroadcast = async () => {
    if (!currentBroadcast) return;

    try {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 60000);

      // Clear stats interval
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      // Mark all listeners as inactive
      const listeners = await base44.entities.Listener.filter(
        { broadcast_id: currentBroadcast.id, is_active: true }
      );

      for (const listener of listeners) {
        await base44.entities.Listener.update(listener.id, { is_active: false });
      }

      await updateBroadcastMutation.mutateAsync({
        id: currentBroadcast.id,
        data: {
          is_live: false,
          ended_at: new Date().toISOString(),
          duration_minutes: duration,
          total_listeners: peakListeners // Use the accumulated peak listeners
        }
      });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Notify followers about new recording
      try {
        await base44.functions.invoke('notifyFollowers', {
          broadcast_id: currentBroadcast.id,
          type: 'new_recording'
        });
      } catch (err) {
        console.error("Error sending recording notification:", err);
      }

      setIsLive(false);
      setCurrentBroadcast(null);
      setBroadcastData({
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
      setListenerCount(0);
      setAgoraTrack(null); // Clear Agora track state
      setListenerStats([]); // Clear stats for next broadcast
      setPeakListeners(0); // Reset peak listeners
      setSelectedScheduledBroadcast(""); // Reset scheduled broadcast selection
      setSelectedCoverId(""); // Reset cover selection

      navigate(createPageUrl("MyBroadcasts"));
    } catch (error) {
      setError("حدث خطأ أثناء إيقاف البث.");
      console.error("Error stopping broadcast:", error);
    }
  };

  const toggleMute = () => {
    // When using Web Audio API, muting means disconnecting the source or setting gain to 0
    if (agoraTrack) {
      // If using Agora track, use its mute function
      agoraTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    } else if (gainNodeRef.current) {
      if (!isMuted) {
        gainNodeRef.current.gain.value = 0; // Mute by setting gain to 0
      } else {
        gainNodeRef.current.gain.value = audioSettings.gain; // Restore previous gain
      }
      setIsMuted(!isMuted);
    } else if (streamRef.current) { // Fallback if audio processing not active
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  if (!isAdmin && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              غير مصرح
            </h2>
            <p className="text-gray-600 mb-6">
              عذراً، البث المباشر متاح للمشرفين والمذيعين فقط. يمكنك الاستماع للبثوث المباشرة من الصفحة الرئيسية.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Home"))}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {isLive ? "بثك المباشر" : "ابدأ بث جديد"}
          </h1>
          <p className="text-gray-600">
            {isLive ? "أنت الآن على الهواء مباشرة!" : "ابدأ بثاً مباشراً أو اختر من البثوث المجدولة"}
          </p>
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
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Card className="border-2 border-purple-300 bg-gradient-to-br from-white to-purple-50 shadow-2xl">
                  <CardHeader className="border-b border-purple-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{broadcastData.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <LiveIndicator isLive={true} size="lg" />
                        <ShareButton
                          broadcastId={currentBroadcast?.id}
                          title={broadcastData.title}
                        />
                        <AudioSettings
                          onDeviceChange={handleDeviceChange}
                          audioStream={streamRef.current}
                          onSettingsChange={handleAudioSettingsChange}
                          currentSettings={audioSettings}
                        />
                      </div>
                    </div>
                    {broadcastData.lecturer_name && (
                      <p className="text-sm text-gray-600 mt-2">المحاضر: {broadcastData.lecturer_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <BroadcastCover broadcastId={currentBroadcast?.id} />

                    <AgoraAudioBroadcaster
                      channelName={currentBroadcast?.id}
                      isActive={isLive}
                      deviceId={selectedDeviceId}
                      onTrackReady={handleAgoraTrackReady}
                      onError={handleAgoraError}
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

                    <div className="flex gap-4 justify-center flex-wrap">
                      <Button
                        onClick={toggleMute}
                        variant="outline"
                        size="lg"
                        className="gap-2 hover:bg-purple-50 border-2"
                      >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        {isMuted ? "تشغيل الصوت" : "كتم الصوت"}
                      </Button>

                      <MuteAllControl
                        broadcast={currentBroadcast}
                        isMutedForAll={currentBroadcast?.is_muted_for_all}
                      />

                      <Button
                        onClick={stopBroadcast}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-xl"
                        disabled={updateBroadcastMutation.isPending}
                      >
                        {updateBroadcastMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Radio className="w-5 h-5" />
                        )}
                        <span className="font-bold text-base">إنهاء البث</span>
                      </Button>
                    </div>

                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        ✅ البث المباشر نشط مع معالجة صوت احترافية
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>

              <Alert className="mb-6 bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-900">
                  ⏰ الحد الأقصى لمدة البث: {MAX_DURATION_HOURS} ساعات - الوقت المنقضي: {formatElapsedTime(elapsedTime)}
                </AlertDescription>
              </Alert>

              <RecordingControls
                broadcastId={currentBroadcast?.id}
                broadcastTitle={broadcastData.title}
                audioStream={streamRef.current}
                autoStart={true}
                coverId={broadcastCover?.id}
              />

              <ListenerStatsChart
                stats={listenerStats}
                currentListeners={listenerCount}
                peakListeners={peakListeners}
              />

              <div className="h-[500px]">
                <ChatBox
                  broadcastId={currentBroadcast?.id}
                  currentUser={user}
                  isBroadcaster={true}
                />
              </div>
            </div>

            <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-8">
              <ListenersList
                broadcastId={currentBroadcast?.id}
                isBroadcaster={true}
              />
            </div>
          </div>
        ) : (
          <Card className="shadow-xl border-2 border-purple-100 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">معلومات البث</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New: Select from Scheduled Broadcasts */}
              <div className="space-y-2">
                <Label htmlFor="scheduled" className="text-base font-semibold">
                  اختر من البثوث المجدولة (اختياري)
                </Label>
                <Select value={selectedScheduledBroadcast || ""} onValueChange={handleScheduledBroadcastChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="بث جديد (بدون جدولة)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>بث جديد (بدون جدولة)</SelectItem>
                    {scheduledBroadcasts.map((sb) => (
                      <SelectItem key={sb.id} value={sb.id}>
                        {sb.title} - {new Date(sb.scheduled_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedScheduledBroadcast && (
                  <p className="text-sm text-green-600">
                    ✅ تم تحميل بيانات البث المجدول
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">
                  عنوان البث *
                </Label>
                <Input
                  id="title"
                  placeholder="اختر عنواناً جذاباً لبثك..."
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lecturer" className="text-base font-semibold">
                  اسم المحاضر
                </Label>
                <Input
                  id="lecturer"
                  placeholder="د.إبراهيم الشربيني"
                  value={broadcastData.lecturer_name}
                  onChange={(e) => setBroadcastData({ ...broadcastData, lecturer_name: e.target.value })}
                  className="text-lg"
                />
              </div>

              {/* NEW: Series Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  السلسلة (اختياري)
                </Label>
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
                  <Label className="text-base font-semibold">
                    رقم الحلقة
                  </Label>
                  <Input
                    type="number"
                    value={broadcastData.episode_number || ""}
                    onChange={(e) => setBroadcastData({ ...broadcastData, episode_number: parseInt(e.target.value) || null })}
                    placeholder="1"
                    min="1"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  وصف البث
                </Label>
                <Textarea
                  id="description"
                  placeholder="أخبر المستمعين عن محتوى بثك..."
                  value={broadcastData.description}
                  onChange={(e) => setBroadcastData({ ...broadcastData, description: e.target.value })}
                  className="min-h-24 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-base font-semibold">
                  التصنيف
                </Label>
                <Select
                  value={broadcastData.category}
                  onValueChange={(value) => setBroadcastData({ ...broadcastData, category: value })}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-base">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NEW: Rebroadcast Options */}
              <div className="space-y-4 p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-100">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-600" />
                  إعادة بث من تسجيل أو رابط خارجي
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="rebroadcast-recording" className="text-sm">
                    اختر تسجيل لإعادة بثه
                  </Label>
                  <Select
                    value={broadcastData.rebroadcast_from_recording_id || "none"}
                    onValueChange={(value) => setBroadcastData({
                      ...broadcastData,
                      rebroadcast_from_recording_id: value === "none" ? "" : value,
                      rebroadcast_from_url: "" // Clear URL if recording selected
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
                  <Label htmlFor="rebroadcast-url" className="text-sm">
                    رابط خارجي لإعادة البث
                  </Label>
                  <Input
                    id="rebroadcast-url"
                    placeholder="https://example.com/audio.mp3"
                    value={broadcastData.rebroadcast_from_url}
                    onChange={(e) => setBroadcastData({
                      ...broadcastData,
                      rebroadcast_from_url: e.target.value,
                      rebroadcast_from_recording_id: "" // Clear recording if URL entered
                    })}
                    disabled={!!broadcastData.rebroadcast_from_recording_id}
                  />
                  <p className="text-xs text-orange-600">
                    💡 أدخل رابط ملف صوتي مباشر (mp3, webm, ogg)
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-100">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-blue-600" />
                  ربط البث مع منصات أخرى
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="youtube" className="text-sm">
                    رابط YouTube Live
                  </Label>
                  <Input
                    id="youtube"
                    placeholder="https://youtube.com/live/..."
                    value={broadcastData.youtube_url}
                    onChange={(e) => setBroadcastData({ ...broadcastData, youtube_url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook" className="text-sm">
                    رابط Facebook Live
                  </Label>
                  <Input
                    id="facebook"
                    placeholder="https://facebook.com/..."
                    value={broadcastData.facebook_url}
                    onChange={(e) => setBroadcastData({ ...broadcastData, facebook_url: e.target.value })}
                  />
                </div>
              </div>

              {/* New: Select Cover */}
              {availableCovers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    اختر الغلاف (اختياري)
                  </Label>
                  <Select value={selectedCoverId} onValueChange={setSelectedCoverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="بدون غلاف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>بدون غلاف</SelectItem>
                      {availableCovers.map((cover) => (
                        <SelectItem key={cover.id} value={cover.id}>
                          {cover.fixed_title} - سورة {cover.surah_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCoverId && (
                    <p className="text-sm text-green-600">
                      ✅ سيتم استخدام هذا الغلاف في البث
                    </p>
                  )}
                </div>
              )}

              {/* New: Cover Preview Button */}
              {(broadcastData.title || selectedCoverId) && ( // Show preview button if title exists OR a cover is selected
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowCoverPreview(!showCoverPreview)}
                    variant="outline"
                    className="w-full gap-2 border-2 border-blue-200"
                  >
                    <Eye className="w-5 h-5" />
                    {showCoverPreview ? "إخفاء معاينة الغلاف" : "معاينة الغلاف"}
                  </Button>

                  {showCoverPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50"
                    >
                      <p className="text-sm text-gray-600 mb-3">
                        💡 هذه معاينة للغلاف - تأكد من إنشاء غلاف في صفحة "تصميم الغلاف" أولاً
                      </p>
                      {/*
                        BroadcastCover component expects a broadcast_id.
                        This will show the cover associated with the selected scheduled broadcast,
                        or a generic preview if no scheduled broadcast is selected.
                      */}
                      <BroadcastCover
                        broadcastId={selectedScheduledBroadcast || "preview"}
                        className="max-w-2xl mx-auto"
                      />
                    </motion.div>
                  )}
                </div>
              )}

              <Button
                onClick={startBroadcast}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-3"
                disabled={isConnecting || !broadcastData.title.trim()}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جارٍ الاتصال بالخادم...
                  </>
                ) : (
                  <>
                    <Radio className="w-6 h-6" />
                    ابدأ البث المباشر
                  </>
                )}
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  ✅ أنت مشرف - يمكنك بدء البث المباشر
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
