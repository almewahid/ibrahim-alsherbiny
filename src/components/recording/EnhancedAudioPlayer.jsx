import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Clock, Zap, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChaptersList from "./ChaptersList";
import ChapterEditor from "./ChapterEditor";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Tiny inline component: chapter tick marks on the progress bar
function ChaptersProgressMarkers({ recordingId, duration, onSeek }) {
  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", recordingId],
    queryFn: () => base44.entities.VideoChapter.filter({ recording_id: recordingId }),
    enabled: !!recordingId && duration > 0,
  });
  if (!duration) return null;
  return (
    <>
      {chapters.map(ch => (
        <div
          key={ch.id}
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-pointer z-10"
          style={{ left: `${(ch.timestamp_seconds / duration) * 100}%` }}
          title={ch.title}
          onClick={(e) => { e.stopPropagation(); onSeek(ch.timestamp_seconds); }}
        />
      ))}
    </>
  );
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function EnhancedAudioPlayer({
  audioUrl,
  title,
  verses = null,
  hadithText = null,
  recordingId = null,
  isAdmin = false,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const sleepTimerRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.preload = "metadata";

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };

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

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Media Session API - background/lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'تسجيل صوتي',
      artist: 'د. إبراهيم الشربيني',
      album: 'البث الإسلامي',
      artwork: [
        { src: 'https://images.unsplash.com/photo-1585036156171-384164a8c675?w=512&h=512&fit=crop', sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    const handlePlay = () => {
      if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
    };
    const handlePause = () => {
      if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    };
    const handleSeekBackward = () => {
      if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    };
    const handleSeekForward = () => {
      if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    };

    navigator.mediaSession.setActionHandler('play', handlePlay);
    navigator.mediaSession.setActionHandler('pause', handlePause);
    navigator.mediaSession.setActionHandler('seekbackward', handleSeekBackward);
    navigator.mediaSession.setActionHandler('seekforward', handleSeekForward);
    navigator.mediaSession.setActionHandler('previoustrack', handleSeekBackward);
    navigator.mediaSession.setActionHandler('nexttrack', handleSeekForward);

    return () => {
      ['play','pause','seekbackward','seekforward','previoustrack','nexttrack'].forEach(action => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch(_) {}
      });
    };
  }, [title, duration]);

  // Update media session playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (audioRef.current && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: playbackRate,
            position: currentTime,
          });
        } catch(_) {}
      }
    }
  }, [isPlaying, currentTime, duration, playbackRate]);

  // Sleep Timer
  useEffect(() => {
    if (sleepTimerActive && sleepTimer > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerActive(false);
        alert('⏰ انتهى مؤقت النوم');
      }, sleepTimer * 60 * 1000);
      return () => { if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current); };
    }
  }, [sleepTimerActive, sleepTimer]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, currentTime + 10);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, currentTime - 10);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value) => {
    setVolume(value[0]);
    setIsMuted(false);
  };

  const activateSleepTimer = (minutes) => {
    setSleepTimer(parseInt(minutes));
    setSleepTimerActive(true);
  };

  const cancelSleepTimer = () => {
    setSleepTimerActive(false);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  };

  const addBookmark = () => {
    const label = bookmarkLabel.trim() || `إشارة عند ${formatTime(currentTime)}`;
    setBookmarks(prev => [...prev, { time: currentTime, label, id: Date.now() }]);
    setBookmarkLabel("");
    setShowBookmarkInput(false);
  };

  const removeBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const jumpToBookmark = (time) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Audio Player */}
      <div className={verses || hadithText ? "lg:col-span-2" : "lg:col-span-3"}>
        <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <Badge className="mt-2 bg-purple-100 text-purple-700 text-xs">
                {'mediaSession' in navigator ? '🎵 تشغيل في الخلفية مفعّل' : '🎵 مشغل صوتي'}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="relative w-full h-2 bg-gray-200 rounded-full cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                handleSeek([pct * duration]);
              }}>
                <div className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} />
                {bookmarks.map(b => (
                  <div
                    key={b.id}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow cursor-pointer"
                    style={{ left: `${(b.time / duration) * 100}%` }}
                    title={b.label}
                    onClick={(e) => { e.stopPropagation(); jumpToBookmark(b.time); }}
                  />
                ))}
              </div>
              {/* Chapters markers on progress bar */}
              {recordingId && <ChaptersProgressMarkers recordingId={recordingId} duration={duration} onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }} />}
              <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={handleSeek} className="cursor-pointer opacity-0 h-0" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button onClick={skipBackward} variant="outline" size="lg" className="gap-1 text-xs">
                <SkipBack className="w-5 h-5" /> 10
              </Button>
              <Button
                onClick={togglePlay}
                size="lg"
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </Button>
              <Button onClick={skipForward} variant="outline" size="lg" className="gap-1 text-xs">
                10 <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Advanced Controls Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button onClick={toggleMute} variant="ghost" size="sm" className="shrink-0">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} className="flex-1" />
              </div>

              {/* Playback Speed */}
              <Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
                <SelectTrigger className="w-full">
                  <Zap className="w-4 h-4 ml-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x بطيء</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x عادي</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x سريع</SelectItem>
                  <SelectItem value="1.75">1.75x</SelectItem>
                  <SelectItem value="2">2x أسرع</SelectItem>
                </SelectContent>
              </Select>

              {/* Sleep Timer */}
              {sleepTimerActive ? (
                <Button onClick={cancelSleepTimer} variant="outline" className="gap-2 border-orange-200 text-orange-600 text-xs">
                  <Clock className="w-4 h-4" /> إلغاء ({sleepTimer}د)
                </Button>
              ) : (
                <Select value="" onValueChange={activateSleepTimer}>
                  <SelectTrigger className="w-full">
                    <Clock className="w-4 h-4 ml-1" />
                    <SelectValue placeholder="مؤقت نوم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 دقائق</SelectItem>
                    <SelectItem value="10">10 دقائق</SelectItem>
                    <SelectItem value="15">15 دقيقة</SelectItem>
                    <SelectItem value="30">30 دقيقة</SelectItem>
                    <SelectItem value="60">ساعة</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Chapters */}
            {recordingId && (
              <div className="border-t pt-4 space-y-3">
                <ChaptersList
                  recordingId={recordingId}
                  currentTime={currentTime}
                  onSeek={(t) => { if(audioRef.current) { audioRef.current.currentTime = t; audioRef.current.play(); setCurrentTime(t); setIsPlaying(true); } }}
                />
                {isAdmin && (
                  <details className="mt-2">
                    <summary className="text-xs text-purple-600 cursor-pointer font-semibold">⚙️ إدارة الفصول</summary>
                    <div className="mt-3">
                      <ChapterEditor recordingId={recordingId} currentTime={currentTime} />
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Bookmarks Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-yellow-500" />
                  الإشارات المرجعية
                </h4>
                <Button
                  onClick={() => setShowBookmarkInput(!showBookmarkInput)}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs border-yellow-200 text-yellow-700"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  إضافة عند {formatTime(currentTime)}
                </Button>
              </div>

              <AnimatePresence>
                {showBookmarkInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="اسم الإشارة (اختياري)..."
                      value={bookmarkLabel}
                      onChange={(e) => setBookmarkLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
                      className="flex-1 text-sm"
                    />
                    <Button onClick={addBookmark} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      حفظ
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {bookmarks.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookmarks.map(b => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200"
                    >
                      <button
                        onClick={() => jumpToBookmark(b.time)}
                        className="flex items-center gap-2 text-sm text-gray-800 hover:text-purple-700 flex-1 text-right"
                      >
                        <span className="text-xs text-yellow-600 font-mono bg-yellow-100 px-2 py-0.5 rounded">
                          {formatTime(b.time)}
                        </span>
                        {b.label}
                      </button>
                      <Button
                        onClick={() => removeBookmark(b.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Text Display */}
      {(verses || hadithText) && (
        <div className="lg:col-span-1">
          <Card className="border-2 border-purple-100 sticky top-4">
            <CardContent className="pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">النص المرافق</h4>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                {verses ? (
                  <div className="space-y-4">
                    {verses.map((verse, index) => (
                      <p key={index} className="text-xl leading-loose text-gray-800 font-arabic" dir="rtl">
                        {verse}
                        {index < verses.length - 1 && (
                          <span className="mx-2 text-purple-400">۝</span>
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xl leading-loose text-gray-800 font-arabic" dir="rtl">
                    {hadithText}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}