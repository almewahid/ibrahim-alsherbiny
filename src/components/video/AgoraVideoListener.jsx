import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Video, VideoOff } from "lucide-react";

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

export default function AgoraVideoListener({ 
  channelName, 
  isActive
}) {
  const clientRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    loadAgoraSDK()
      .then(() => setSdkLoaded(true))
      .catch(err => {
        setError('فشل تحميل Agora SDK');
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!isActive || !sdkLoaded) {
      cleanup();
      return;
    }

    initializeListener();

    return () => {
      cleanup();
    };
  }, [isActive, channelName, sdkLoaded]);

  const initializeListener = async () => {
    try {
      setConnectionState('CONNECTING');
      
      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'audience'
      });

      if (!tokenResponse.data || !tokenResponse.data.token) {
        throw new Error('Failed to get Agora token');
      }

      const { token, appId, uid } = tokenResponse.data;

      const AgoraRTC = window.AgoraRTC;
      const client = AgoraRTC.createClient({ 
        mode: "live", 
        codec: "vp8" 
      });

      clientRef.current = client;

      await client.setClientRole("audience");

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === "video") {
          setHasVideo(true);
          if (remoteVideoRef.current) {
            user.videoTrack.play(remoteVideoRef.current);
          }
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          setHasVideo(false);
        }
      });

      await client.join(appId, channelName, token, uid);
      setConnectionState('CONNECTED');
      setError(null);
    } catch (err) {
      console.error('Agora video listener initialization error:', err);
      setError(err.message);
      setConnectionState('FAILED');
    }
  };

  const cleanup = async () => {
    try {
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }

      setConnectionState('DISCONNECTED');
      setHasVideo(false);
    } catch (err) {
      console.error('Cleanup error:', err);
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

  return (
    <div className="space-y-4">
      <div 
        ref={remoteVideoRef}
        className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden"
      >
        {!hasVideo && (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <VideoOff className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-400">لا يوجد فيديو</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Video className="w-4 h-4 text-purple-600" />
        <span className={`font-medium ${
          connectionState === 'CONNECTED' ? 'text-green-600' :
          connectionState === 'CONNECTING' ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {connectionState === 'CONNECTED' ? 'متصل' :
           connectionState === 'CONNECTING' ? 'جارٍ الاتصال...' :
           'غير متصل'}
        </span>
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