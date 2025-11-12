import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Maximize, Minimize, Play, Pause } from "lucide-react";

// Dynamically load Agora SDK
const loadAgoraSDK = () => {
  return new Promise((resolve, reject) => {
    if (window.AgoraRTC) {
      resolve(window.AgoraRTC);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.19.0.js';
    script.onload = () => resolve(window.AgoraRTC);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function AgoraVideoPlayer({ 
  channelName, 
  isActive,
  verses = null,
  hadithText = null,
  showText = true 
}) {
  const videoRef = useRef(null);
  const [client, setClient] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');

  useEffect(() => {
    if (!isActive || !channelName) return;

    let agoraClient = null;

    const init = async () => {
      try {
        const AgoraRTC = await loadAgoraSDK();
        
        agoraClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8', role: 'audience' });
        setClient(agoraClient);

        agoraClient.on('connection-state-change', (state) => {
          setConnectionState(state);
        });

        agoraClient.on('user-published', async (user, mediaType) => {
          await agoraClient.subscribe(user, mediaType);
          
          if (mediaType === 'video' && videoRef.current) {
            user.videoTrack.play(videoRef.current);
            setIsPlaying(true);
          }
          
          if (mediaType === 'audio') {
            user.audioTrack.play();
          }
        });

        agoraClient.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            setIsPlaying(false);
          }
        });

        // Get token from backend
        const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
          channelName,
          uid: 0,
          role: 'audience'
        });

        const token = tokenResponse.data.token;
        const appId = Deno.env.get('AGORA_APP_ID') || tokenResponse.data.appId;

        await agoraClient.join(appId, channelName, token, null);
        
      } catch (error) {
        console.error('Agora Video Init Error:', error);
        setConnectionState('FAILED');
      }
    };

    init();

    return () => {
      if (agoraClient) {
        agoraClient.leave();
      }
    };
  }, [isActive, channelName]);

  const toggleMute = () => {
    if (client) {
      client.remoteUsers.forEach(user => {
        if (user.audioTrack) {
          user.audioTrack.setVolume(isMuted ? 100 : 0);
        }
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      videoRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Video Player */}
      <div className="lg:col-span-2">
        <Card className="border-2 border-purple-100 bg-black overflow-hidden">
          <CardContent className="p-0 relative">
            <div 
              ref={videoRef}
              className="w-full aspect-video bg-gray-900 flex items-center justify-center"
            >
              {connectionState === 'CONNECTING' && (
                <div className="text-white text-center">
                  <p>جارٍ الاتصال بالبث...</p>
                </div>
              )}
              {connectionState === 'DISCONNECTED' && (
                <div className="text-white text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>في انتظار البث المباشر</p>
                </div>
              )}
              {connectionState === 'FAILED' && (
                <div className="text-red-500 text-center">
                  <p>فشل الاتصال</p>
                  <p className="text-sm mt-2">تأكد من تفعيل البث من المذيع</p>
                </div>
              )}
            </div>

            {/* Controls Overlay */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleMute}
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </div>

                  <Button
                    onClick={toggleFullscreen}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Text Display (if enabled) */}
      {showText && (verses || hadithText) && (
        <div className="lg:col-span-1">
          <Card className="border-2 border-purple-100 sticky top-4">
            <CardContent className="pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">النص المرافق</h4>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 max-h-[500px] overflow-y-auto">
                {verses ? (
                  <div className="space-y-4" dir="rtl">
                    {verses.map((verse, index) => (
                      <p key={index} className="text-xl leading-loose text-gray-800 font-arabic">
                        {verse}
                        {index < verses.length - 1 && (
                          <span className="mx-2 text-purple-400">۝</span>
                        )}
                      </p>
                    ))}
                  </div>
                ) : hadithText ? (
                  <p className="text-xl leading-loose text-gray-800 font-arabic" dir="rtl">
                    {hadithText}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}