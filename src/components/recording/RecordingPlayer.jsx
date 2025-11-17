import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack } from "lucide-react";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function RecordingPlayer({ fileUri, markers = [], onSeek }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        const response = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 3600
        });
        setSignedUrl(response.signed_url);
      } catch (error) {
        console.error("Error getting signed URL:", error);
      }
    };

    if (fileUri) {
      getSignedUrl();
    }
  }, [fileUri]);

  useEffect(() => {
    if (onSeek && audioRef.current) {
      audioRef.current.currentTime = onSeek;
      setCurrentTime(onSeek);
    }
  }, [onSeek]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  return (
    <Card className="border-2 border-purple-100">
      <CardContent className="pt-6 space-y-4">
        {signedUrl && (
          <audio
            ref={audioRef}
            src={signedUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => skip(-10)} variant="outline" size="sm">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button onClick={handlePlayPause} size="lg" className="bg-purple-600 hover:bg-purple-700">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button onClick={() => skip(10)} variant="outline" size="sm">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={toggleMute} variant="ghost" size="sm">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>

        {markers && markers.length > 0 && (
          <div className="space-y-1">
            {markers.map((marker) => (
              <button
                key={marker.id}
                onClick={() => handleSeek([marker.timestamp_seconds])}
                className="w-full text-right p-2 rounded hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{marker.label}</span>
                  <span className="text-xs text-gray-600">{formatTime(marker.timestamp_seconds)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}