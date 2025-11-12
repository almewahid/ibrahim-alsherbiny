import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";

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
  deviceId 
}) {
  const clientRef = useRef(null);
  const localTrackRef = useRef(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [error, setError] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

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

    initializeBroadcast();

    return () => {
      cleanup();
    };
  }, [isActive, channelName, deviceId, sdkLoaded]);

  const initializeBroadcast = async () => {
    try {
      setConnectionState('CONNECTING');
      
      // Get Agora token from backend
      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'broadcaster'
      });

      if (!tokenResponse.data || !tokenResponse.data.token) {
        throw new Error('Failed to get Agora token');
      }

      const { token, appId, uid } = tokenResponse.data;

      // Create Agora client
      const AgoraRTC = window.AgoraRTC;
      const client = AgoraRTC.createClient({ 
        mode: "live", 
        codec: "vp8" 
      });

      clientRef.current = client;

      // Set client role as host (broadcaster)
      await client.setClientRole("host");

      // Join channel
      await client.join(appId, channelName, token, uid);
      setConnectionState('CONNECTED');

      // Create microphone track
      const microphoneTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: deviceId,
        encoderConfig: {
          sampleRate: 48000,
          stereo: false,
          bitrate: 128,
        },
        AEC: true,
        ANS: true,
        AGC: true,
      });

      localTrackRef.current = microphoneTrack;

      // Publish track
      await client.publish([microphoneTrack]);

      if (onTrackReady) {
        onTrackReady(microphoneTrack);
      }

      setError(null);
    } catch (err) {
      console.error('Agora broadcast initialization error:', err);
      setError(err.message);
      setConnectionState('FAILED');
      if (onError) {
        onError(err);
      }
    }
  };

  const cleanup = async () => {
    try {
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
      case 'CONNECTED':
        return 'متصل بالبث';
      case 'CONNECTING':
        return 'جارٍ الاتصال...';
      case 'FAILED':
        return 'فشل الاتصال';
      default:
        return 'غير متصل';
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
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {getConnectionIcon()}
        <span className={`font-medium ${
          connectionState === 'CONNECTED' ? 'text-green-600' :
          connectionState === 'CONNECTING' ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {getConnectionText()}
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