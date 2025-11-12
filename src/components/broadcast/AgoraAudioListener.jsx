import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff, Volume2 } from "lucide-react";

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

export default function AgoraAudioListener({ 
  channelName, 
  isActive,
  onRemoteUserJoined,
  onRemoteUserLeft 
}) {
  const clientRef = useRef(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
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

    initializeListener();

    return () => {
      cleanup();
    };
  }, [isActive, channelName, sdkLoaded]);

  const initializeListener = async () => {
    try {
      setConnectionState('CONNECTING');
      
      // Get Agora token from backend
      const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
        channelName,
        role: 'audience'
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

      // Set client role as audience (listener)
      await client.setClientRole("audience");

      // Set up event listeners
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === "audio") {
          user.audioTrack.play();
          
          // Monitor audio level
          const interval = setInterval(() => {
            const level = user.audioTrack.getVolumeLevel();
            setAudioLevel(level);
          }, 100);

          user.audioTrack.on("track-ended", () => {
            clearInterval(interval);
          });
        }

        setRemoteUsers(prev => {
          if (!prev.find(u => u.uid === user.uid)) {
            const newUsers = [...prev, user];
            if (onRemoteUserJoined) {
              onRemoteUserJoined(user);
            }
            return newUsers;
          }
          return prev;
        });
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "audio") {
          setRemoteUsers(prev => {
            const filtered = prev.filter(u => u.uid !== user.uid);
            if (onRemoteUserLeft) {
              onRemoteUserLeft(user);
            }
            return filtered;
          });
        }
      });

      client.on("user-left", (user) => {
        setRemoteUsers(prev => {
          const filtered = prev.filter(u => u.uid !== user.uid);
          if (onRemoteUserLeft) {
            onRemoteUserLeft(user);
          }
          return filtered;
        });
      });

      // Join channel
      await client.join(appId, channelName, token, uid);
      setConnectionState('CONNECTED');
      setError(null);
    } catch (err) {
      console.error('Agora listener initialization error:', err);
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
      setRemoteUsers([]);
      setAudioLevel(0);
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          {getConnectionIcon()}
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

        {connectionState === 'CONNECTED' && remoteUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Volume2 className="w-4 h-4 text-purple-600" />
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-3 rounded-full transition-all ${
                    audioLevel * 5 > i ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
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