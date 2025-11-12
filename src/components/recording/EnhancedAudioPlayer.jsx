import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function EnhancedAudioPlayer({ 
  audioUrl, 
  title,
  verses = null,
  hadithText = null 
}) {
  const audioRef = useRef(new Audio(audioUrl));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const sleepTimerRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    audio.src = audioUrl;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [audioUrl]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sleep Timer Logic
  useEffect(() => {
    if (sleepTimerActive && sleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerActive(false);
        alert('⏰ انتهى مؤقت النوم');
      }, sleepTimer * 60 * 1000);

      return () => {
        if (sleepTimerRef.current) {
          clearTimeout(sleepTimerRef.current);
        }
      };
    }
  }, [sleepTimerActive, sleepTimer]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skipForward = () => {
    audioRef.current.currentTime = Math.min(duration, currentTime + 10);
  };

  const skipBackward = () => {
    audioRef.current.currentTime = Math.max(0, currentTime - 10);
  };

  const toggleMute = () => {
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const activateSleepTimer = (minutes) => {
    setSleepTimer(minutes);
    setSleepTimerActive(true);
  };

  const cancelSleepTimer = () => {
    setSleepTimerActive(false);
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Audio Player */}
      <div className="lg:col-span-2">
        <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
              </div>

              {/* Progress Bar */}
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

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button onClick={skipBackward} variant="outline" size="lg">
                  <SkipBack className="w-6 h-6" />
                </Button>
                <Button
                  onClick={togglePlay}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </Button>
                <Button onClick={skipForward} variant="outline" size="lg">
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>

              {/* Advanced Controls */}
              <div className="grid grid-cols-3 gap-4">
                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="sm"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Playback Speed */}
                <div className="space-y-2">
                  <Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
                    <SelectTrigger className="w-full">
                      <Zap className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">عادي 1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sleep Timer */}
                <div className="space-y-2">
                  {sleepTimerActive ? (
                    <Button
                      onClick={cancelSleepTimer}
                      variant="outline"
                      className="w-full gap-2 border-orange-200 text-orange-600"
                    >
                      <Clock className="w-4 h-4" />
                      إلغاء ({sleepTimer} د)
                    </Button>
                  ) : (
                    <Select value="" onValueChange={(v) => activateSleepTimer(parseInt(v))}>
                      <SelectTrigger className="w-full">
                        <Clock className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="مؤقت نوم" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 دقائق</SelectItem>
                        <SelectItem value="10">10 دقائق</SelectItem>
                        <SelectItem value="15">15 دقيقة</SelectItem>
                        <SelectItem value="30">30 دقيقة</SelectItem>
                        <SelectItem value="60">ساعة واحدة</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Text Display (Verses or Hadith) */}
      {(verses || hadithText) && (
        <div className="lg:col-span-1">
          <Card className="border-2 border-purple-100 sticky top-4">
            <CardContent className="pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">النص المرافق</h4>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 max-h-[500px] overflow-y-auto">
                {verses ? (
                  <div className="space-y-4">
                    {verses.map((verse, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="text-xl leading-loose text-gray-800 font-arabic"
                      >
                        {verse}
                        {index < verses.length - 1 && (
                          <span className="mx-2 text-purple-400">۝</span>
                        )}
                      </motion.p>
                    ))}
                  </div>
                ) : hadithText ? (
                  <p className="text-xl leading-loose text-gray-800 font-arabic">
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