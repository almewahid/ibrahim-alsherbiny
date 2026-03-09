import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff, Volume2, Monitor, Maximize, PictureInPicture } from "lucide-react";
import { Button } from "@/components/ui/button";

const loadAgoraSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.AgoraRTC) { resolve(window.AgoraRTC); return; }
    const script = document.createElement('script');
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.21.0.js';
    script.async = true;
    script.onload = () => window.AgoraRTC ? resolve(window.AgoraRTC) : reject(new Error('Failed to load Agora SDK'));
    script.onerror = () => reject(new Error('Failed to load Agora SDK'));
    document.head.appendChild(script);
  });
};

export default function AgoraAudioListener({
  channelName,
  isActive,
  isLocalMuted = false,       // كتم المستمع لنفسه
  isBroadcasterMuted = false,  // كتم المذيع للجميع — الافتراضي false
  onHasVideoChange,
  onRemoteUserJoined,
  onRemoteUserLeft
}) {
  const clientRef = useRef(null);
  const remoteAudioTracksRef = useRef([]);
  const videoContainerRef = useRef(null);
  const silentAudioRef = useRef(null);

  // ─── isMutedRef: يجمع كتم المستمع + كتم المذيع ───────────────────────────
  // نُحدّثه مباشرةً في الـ render (قبل أي useEffect) ليكون دقيقاً دائماً
  const isMutedRef = useRef(false);
  isMutedRef.current = isLocalMuted || isBroadcasterMuted;

  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  // ─── Silent audio: يُبقي جلسة الصوت حية في الخلفية / شاشة القفل ──────────
  useEffect(() => {
    const audio = new Audio();
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    audio.loop = true;
    audio.volume = 0.01;
    silentAudioRef.current = audio;
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  // ─── تشغيل/إيقاف Silent audio حسب حالة الاتصال ──────────────────────────
  useEffect(() => {
    if (connectionState === 'CONNECTED' && silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'بث مباشر',
          artist: 'د. إبراهيم الشربيني',
          album: 'المنصة الإسلامية',
        });
        navigator.mediaSession.playbackState = 'playing';
      }
    } else if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [connectionState]);

  // ─── تحديث مستوى الصوت عند تغيّر حالة الكتم ─────────────────────────────
  useEffect(() => {
    const shouldMute = isLocalMuted || isBroadcasterMuted;
    remoteAudioTracksRef.current.forEach(track => {
      try { track.setVolume(shouldMute ? 0 : 100); } catch (_) {}
    });
  }, [isLocalMuted, isBroadcasterMuted]);

  // ─── تحميل SDK ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAgoraSDK()
      .then(() => setSdkLoaded(true))
      .catch(err => { setError('فشل تحميل Agora SDK'); console.error(err); });
  }, []);

  // ─── تهيئة / إيقاف الاستماع ───────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !sdkLoaded) { cleanup(); return; }
    initializeListener();
    return () => { cleanup(); };
  }, [isActive, channelName, sdkLoaded]);

  // ─── تهيئة الاستماع ───────────────────────────────────────────────────────
  const initializeListener = async () => {
    try {
      setConnectionState('CONNECTING');

      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'audience'
      });

      if (!tokenResponse.data?.token) throw new Error('Failed to get Agora token');
      const { token, appId, uid } = tokenResponse.data;

      const AgoraRTC = window.AgoraRTC;
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;
      await client.setClientRole("audience");

      // ─── عند نشر tracks من المذيع ─────────────────────────────────────────
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);

        if (mediaType === "audio") {
          // ← الإصلاح: الصوت يبدأ مفتوحاً دائماً ما لم يكن هناك كتم نشط
          const volumeLevel = isMutedRef.current ? 0 : 100;
          user.audioTrack.setVolume(volumeLevel);
          user.audioTrack.play();
          remoteAudioTracksRef.current.push(user.audioTrack);

          // مراقبة مستوى الصوت
          const interval = setInterval(() => {
            try { setAudioLevel(user.audioTrack.getVolumeLevel()); } catch (_) { clearInterval(interval); }
          }, 100);
          user.audioTrack.on?.("track-ended", () => clearInterval(interval));
        }

        if (mediaType === "video") {
          playVideoInContainer(user.videoTrack);
          setHasVideo(true);
          if (onHasVideoChange) onHasVideoChange(true);
        }

        if (onRemoteUserJoined) onRemoteUserJoined(user);
      });

      // ─── عند إلغاء نشر tracks ─────────────────────────────────────────────
      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
          remoteAudioTracksRef.current = remoteAudioTracksRef.current.filter(t => t !== user.audioTrack);
          setAudioLevel(0);
        }
        if (mediaType === "video") {
          setHasVideo(false);
          if (onHasVideoChange) onHasVideoChange(false);
        }
        if (onRemoteUserLeft) onRemoteUserLeft(user);
      });

      client.on("user-left", (user) => {
        setHasVideo(false);
        if (onHasVideoChange) onHasVideoChange(false);
        if (onRemoteUserLeft) onRemoteUserLeft(user);
      });

      await client.join(appId, channelName, token, uid);
      setConnectionState('CONNECTED');
      setError(null);

      // ─── اشترك في tracks الموجودة مسبقاً ─────────────────────────────────
      for (const remoteUser of client.remoteUsers) {
        if (remoteUser.hasAudio) {
          await client.subscribe(remoteUser, "audio");
          const volumeLevel = isMutedRef.current ? 0 : 100;
          remoteUser.audioTrack.setVolume(volumeLevel);
          remoteUser.audioTrack.play();
          remoteAudioTracksRef.current.push(remoteUser.audioTrack);
        }
        if (remoteUser.hasVideo) {
          await client.subscribe(remoteUser, "video");
          playVideoInContainer(remoteUser.videoTrack);
          setHasVideo(true);
          if (onHasVideoChange) onHasVideoChange(true);
        }
      }
    } catch (err) {
      console.error('Agora listener error:', err);
      setError(err.message);
      setConnectionState('FAILED');
    }
  };

  // ─── تشغيل الفيديو في الـ container ──────────────────────────────────────
  const playVideoInContainer = (videoTrack) => {
    const container = videoContainerRef.current;
    if (!container) return;
    videoTrack.play(container);
    setTimeout(() => {
      const videoEl = container.querySelector('video');
      if (videoEl) {
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'contain';
      }
    }, 200);
  };

  // ─── تنظيف الموارد ────────────────────────────────────────────────────────
  const cleanup = async () => {
    try {
      remoteAudioTracksRef.current = [];
      setHasVideo(false);
      setAudioLevel(0);
      if (onHasVideoChange) onHasVideoChange(false);
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
      setConnectionState('DISCONNECTED');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  // ─── واجهة المستخدم ───────────────────────────────────────────────────────
  if (!sdkLoaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span>جارٍ تحميل نظام البث...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* ── حاوية الفيديو (مشاركة الشاشة) ── */}
      <div
        ref={videoContainerRef}
        style={{
          display: 'block',
          visibility: hasVideo ? 'visible' : 'hidden',
          width: '100%',
          height: hasVideo ? 'auto' : '0',
          aspectRatio: hasVideo ? '16/9' : undefined,
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#000',
        }}
      />

      {/* ── أزرار التحكم بالفيديو ── */}
      {hasVideo && (
        <div className="flex items-center justify-between gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span>المذيع يشارك الشاشة</span>
          </div>
          <div className="flex items-center gap-2">
            {document.pictureInPictureEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-100 h-7 px-2"
                onClick={async () => {
                  const videoEl = videoContainerRef.current?.querySelector('video');
                  if (!videoEl) return;
                  try {
                    if (document.pictureInPictureElement) await document.exitPictureInPicture();
                    else await videoEl.requestPictureInPicture();
                  } catch (err) { console.error('PiP error:', err); }
                }}
              >
                <PictureInPicture className="w-3 h-3" />
                صورة داخل صورة
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-100 h-7 px-2"
              onClick={() => {
                const videoEl = videoContainerRef.current?.querySelector('video') || videoContainerRef.current;
                if (!videoEl) return;
                if (videoEl.requestFullscreen) videoEl.requestFullscreen();
                else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
                else if (videoEl.mozRequestFullScreen) videoEl.mozRequestFullScreen();
              }}
            >
              <Maximize className="w-3 h-3" />
              عرض كامل
            </Button>
          </div>
        </div>
      )}

      {/* ── حالة الاتصال + مستوى الصوت ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {connectionState === 'CONNECTED'
            ? <Wifi className="w-4 h-4 text-green-600" />
            : connectionState === 'CONNECTING'
            ? <Wifi className="w-4 h-4 text-yellow-600 animate-pulse" />
            : <WifiOff className="w-4 h-4 text-red-600" />}
          <span className={`font-medium ${
            connectionState === 'CONNECTED'  ? 'text-green-600' :
            connectionState === 'CONNECTING' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {connectionState === 'CONNECTED'  ? 'متصل' :
             connectionState === 'CONNECTING' ? 'جارٍ الاتصال...' : 'غير متصل'}
          </span>
        </div>

        {connectionState === 'CONNECTED' && remoteAudioTracksRef.current.length > 0 && (
          <div className="flex items-center gap-1">
            <Volume2 className="w-4 h-4 text-purple-600" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 h-3 rounded-full transition-all ${audioLevel * 5 > i ? 'bg-purple-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}