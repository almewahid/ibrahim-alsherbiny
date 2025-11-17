import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function AgoraVideoBroadcaster({ 
  channelName, 
  isActive,
  onVideoTrackReady,
  onError 
}) {
  const clientRef = useRef(null);
  const videoTrackRef = useRef(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);

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

    initializeBroadcaster();

    return () => {
      cleanup();
    };
  }, [isActive, channelName, sdkLoaded]);

  const initializeBroadcaster = async () => {
    try {
      setConnectionState('CONNECTING');
      
      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'host'
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

      await client.setClientRole("host");

      const videoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: "720p_2"
      });

      videoTrackRef.current = videoTrack;

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.join(appId, channelName, token, uid);
      await client.publish([videoTrack]);

      setConnectionState('CONNECTED');
      setError(null);

      if (onVideoTrackReady) {
        onVideoTrackReady(videoTrack);
      }
    } catch (err) {
      console.error('Agora video broadcaster initialization error:', err);
      setError(err.message);
      setConnectionState('FAILED');
      if (onError) {
        onError(err);
      }
    }
  };

  const cleanup = async () => {
    try {
      if (videoTrackRef.current) {
        videoTrackRef.current.close();
        videoTrackRef.current = null;
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

  const toggleVideo = async () => {
    if (videoTrackRef.current) {
      await videoTrackRef.current.setEnabled(!videoEnabled);
      setVideoEnabled(!videoEnabled);
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
        ref={localVideoRef}
        className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden"
      >
        {!videoEnabled && (
          <div className="w-full h-full flex items-center justify-center">
            <VideoOff className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
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

        {connectionState === 'CONNECTED' && (
          <Button
            onClick={toggleVideo}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {videoEnabled ? (
              <>
                <VideoOff className="w-4 h-4" />
                إيقاف الكاميرا
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                تشغيل الكاميرا
              </>
            )}
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