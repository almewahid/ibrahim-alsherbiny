import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wifi, WifiOff, Monitor, MonitorOff } from "lucide-react";

// Load Agora SDK dynamically
const loadAgoraSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.AgoraRTC) {
      resolve(window.AgoraRTC);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.21.0.js';
    script.async = true;
    script.onload = () => {
      if (window.AgoraRTC) {
        resolve(window.AgoraRTC);
      } else {
        reject(new Error('Failed to load Agora SDK'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Agora SDK'));
    document.head.appendChild(script);
  });
};

export default function AgoraAudioBroadcaster({ 
  channelName, 
  onTrackReady, 
  onError,
  isActive,
  deviceId,
  broadcastId,
  broadcastTitle,
  onScreenShareChange,         // callback(isSharingScreen, screenMediaStream)
  screenShareLockedByRecording, // true عندما يكون التسجيل نشطاً
  onStartScreenShareRef,        // ref لتخزين دالة startScreenShare حتى يستطيع المكوّن الأب استدعاءها
  externalScreenStream,         // stream جاهز من المكوّن الأب (التسجيل) — عند توفيره يُنشر تلقائياً في Agora
}) {
  const clientRef = useRef(null);
  const localTrackRef = useRef(null);
  const screenTrackRef = useRef(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // ─── تحميل SDK ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAgoraSDK()
      .then(() => setSdkLoaded(true))
      .catch(err => {
        setError('فشل تحميل Agora SDK');
        console.error(err);
      });
  }, []);

  // ─── تهيئة / إيقاف البث ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !sdkLoaded) {
      cleanup();
      return;
    }

    initializeBroadcast();

    return () => {
      cleanup();
    };
  }, [isActive, channelName, deviceId, sdkLoaded]);

  // ─── مراقبة externalScreenStream ─────────────────────────────────────────
  // عند توفّر stream خارجي (من التسجيل) → ابدأ مشاركة Agora تلقائياً
  // عند إزالته → أوقف مشاركة Agora تلقائياً
  useEffect(() => {
    if (externalScreenStream && connectionState === 'CONNECTED') {
      // تأكّد من عدم وجود مشاركة نشطة بالفعل قبل البدء
      if (!screenTrackRef.current) {
        startScreenShare(externalScreenStream);
      }
    } else if (!externalScreenStream && isSharingScreen) {
      stopScreenShare(/* notifyParent= */ false);
    }
  }, [externalScreenStream, connectionState]);

  // ─── تهيئة البث ──────────────────────────────────────────────────────────
  const initializeBroadcast = async () => {
    try {
      setConnectionState('CONNECTING');
      
      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'broadcaster'
      });

      if (!tokenResponse.data || !tokenResponse.data.token) {
        throw new Error('Failed to get Agora token');
      }

      const { token, appId, uid } = tokenResponse.data;

      const AgoraRTC = window.AgoraRTC;
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      await client.setClientRole("host");
      await client.join(appId, channelName, token, uid);
      setConnectionState('CONNECTED');

      const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: deviceId,
        encoderConfig: { sampleRate: 48000, stereo: false, bitrate: 128 },
        AEC: true,
        ANS: true,
        AGC: true,
      });

      localTrackRef.current = microphoneTrack;
      await client.publish([microphoneTrack]);

      if (onTrackReady) onTrackReady(microphoneTrack);
      setError(null);
    } catch (err) {
      console.error('Agora broadcast initialization error:', err);
      setError(err.message);
      setConnectionState('FAILED');
      if (onError) onError(err);
    }
  };

  // ─── مشاركة الشاشة ───────────────────────────────────────────────────────
  /**
   * @param {MediaStream|null} providedStream
   *   - إذا مُرِّر stream جاهز (من التسجيل) → يُستخدم مباشرةً بدون فتح نافذة اختيار جديدة.
   *   - إذا لم يُمرَّر → يُفتح getDisplayMedia كالمعتاد.
   */
  const startScreenShare = async (providedStream = null) => {
    if (!clientRef.current || connectionState !== 'CONNECTED') return;

    try {
      const AgoraRTC = window.AgoraRTC;
      let screenTrack;

      if (providedStream) {
        // ─── استخدام stream جاهز من التسجيل ───────────────────────────────
        const videoTrack = providedStream.getVideoTracks()[0];
        if (!videoTrack) throw new Error('لا يوجد مسار فيديو في الـ stream المُمرَّر');

        screenTrack = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: videoTrack,
        });

        screenTrackRef.current = screenTrack;
        await clientRef.current.publish([screenTrack]);
        setIsSharingScreen(true);

        // عند إيقاف المتصفح للمشاركة من خارج التطبيق
        videoTrack.onended = () => stopScreenShare(/* notifyParent= */ false);

        // لا نُخطر الأب بـ onScreenShareChange لأنه هو من بدأ الـ stream أصلاً
      } else {
        // ─── الطريقة العادية: فتح نافذة اختيار الشاشة ────────────────────
        screenTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 15,
            bitrateMax: 1500,
          },
          optimizationMode: "detail",
          selfBrowserSurface: "exclude",
        }, "disable");

        screenTrackRef.current = screenTrack;
        await clientRef.current.publish([screenTrack]);
        setIsSharingScreen(true);

        const rawTrack = screenTrack.getMediaStreamTrack?.();
        if (rawTrack) {
          rawTrack.onended = () => stopScreenShare(/* notifyParent= */ true);
          if (onScreenShareChange) {
            onScreenShareChange(true, new MediaStream([rawTrack]));
          }
        }
      }
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen share error:", err);
        setError("فشل مشاركة الشاشة: " + err.message);
      }
    }
  };

  /**
   * @param {boolean} notifyParent - هل نُخطر المكوّن الأب بـ onScreenShareChange
   */
  const stopScreenShare = async (notifyParent = true) => {
    if (!screenTrackRef.current) return;

    try {
      await clientRef.current?.unpublish([screenTrackRef.current]);
    } catch (_) {}

    try {
      screenTrackRef.current.stop();
      screenTrackRef.current.close();
    } catch (_) {}

    screenTrackRef.current = null;
    setIsSharingScreen(false);

    if (notifyParent && onScreenShareChange) {
      onScreenShareChange(false, null);
    }
  };

  // ─── تسجيل startScreenShare في ref الأب ─────────────────────────────────
  useEffect(() => {
    if (onStartScreenShareRef) {
      onStartScreenShareRef.current = startScreenShare;
    }
  });

  // ─── تنظيف الموارد ────────────────────────────────────────────────────────
  const cleanup = async () => {
    try {
      if (screenTrackRef.current) {
        try { await clientRef.current?.unpublish([screenTrackRef.current]); } catch (_) {}
        screenTrackRef.current.stop();
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (localTrackRef.current) {
        localTrackRef.current.stop();
        localTrackRef.current.close();
        localTrackRef.current = null;
      }
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
  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'CONNECTING':
        return <Wifi className="w-4 h-4 text-yellow-600 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionState) {
      case 'CONNECTED':  return 'متصل بالبث';
      case 'CONNECTING': return 'جارٍ الاتصال...';
      case 'FAILED':     return 'فشل الاتصال';
      default:           return 'غير متصل';
    }
  };

  if (!sdkLoaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span>جارٍ تحميل نظام البث...</span>
      </div>
    );
  }

  // زر مشاركة الشاشة يُعطَّل فقط إذا كان التسجيل نشطاً والمشاركة غير نشطة
  // (أي: لا نسمح ببدء مشاركة يدوية مستقلة أثناء التسجيل)
  const screenBtnDisabled = screenShareLockedByRecording && !isSharingScreen;

  const screenBtnClass = `gap-2 border-2 ${
    isSharingScreen && screenShareLockedByRecording
      ? 'border-red-500 text-red-600 bg-red-50 animate-pulse cursor-not-allowed'
      : isSharingScreen
      ? 'border-blue-500 text-blue-600 bg-blue-50 animate-pulse'
      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
  }`;

  const screenBtnLabel = isSharingScreen && screenShareLockedByRecording
    ? 'مشاركة الشاشة (جارٍ التسجيل)'
    : isSharingScreen
    ? 'إيقاف مشاركة الشاشة'
    : 'مشاركة الشاشة';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          {getConnectionIcon()}
          <span className={`font-medium ${
            connectionState === 'CONNECTED'  ? 'text-green-600' :
            connectionState === 'CONNECTING' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {getConnectionText()}
          </span>
        </div>

        {connectionState === 'CONNECTED' && (
          <Button
            onClick={isSharingScreen ? () => stopScreenShare(true) : () => startScreenShare()}
            variant="outline"
            size="sm"
            disabled={screenBtnDisabled}
            title={
              screenShareLockedByRecording && isSharingScreen
                ? 'مشاركة الشاشة مستخدمة في التسجيل'
                : undefined
            }
            className={screenBtnClass}
          >
            {isSharingScreen
              ? <MonitorOff className="w-4 h-4" />
              : <Monitor className="w-4 h-4" />
            }
            {screenBtnLabel}
          </Button>
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