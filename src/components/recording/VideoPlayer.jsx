import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize, Zap, Youtube } from "lucide-react";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
};

// استخراج YouTube video ID من أي رابط
const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

export default function VideoPlayer({ videoUrl, youtubeUrl, title, seekTime }) {
  // إذا كان رابط يوتيوب متوفراً، نعرضه بالـ iframe
  const ytId = getYouTubeId(youtubeUrl);
  const [activeTab, setActiveTab] = useState(ytId && !videoUrl ? "youtube" : "local");
  const iframeRef = useRef(null);

  // YouTube seek via postMessage (requires enablejsapi=1)
  useEffect(() => {
    if (!seekTime || !ytId || activeTab !== "youtube" || !iframeRef.current) return;
    const win = iframeRef.current.contentWindow;
    win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime.time, true] }), '*');
    setTimeout(() => {
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }, 150);
  }, [seekTime]);

  if (ytId && activeTab === "youtube") {
    return (
      <Card className="border-2 border-purple-100 overflow-hidden">
        <CardContent className="p-0">
          {(videoUrl && ytId) && (
            <div className="flex border-b border-purple-100">
              <button
                onClick={() => setActiveTab("local")}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${activeTab === "local" ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-purple-50"}`}
              >
                🎬 الملف المسجل
              </button>
              <button
                onClick={() => setActiveTab("youtube")}
                className={`flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "youtube" ? "bg-red-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-red-50"}`}
              >
                <Youtube className="w-4 h-4" /> يوتيوب
              </button>
            </div>
          )}
          <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&enablejsapi=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </CardContent>
      </Card>
    );
  }
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);
    const onFull = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onDuration);
    video.addEventListener('ended', onEnded);
    document.addEventListener('fullscreenchange', onFull);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onDuration);
      video.removeEventListener('ended', onEnded);
      document.removeEventListener('fullscreenchange', onFull);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); } else { video.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skipBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const skipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleZoom = (value) => {
    setZoom(value[0]);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="border-2 border-purple-100 overflow-hidden">
      <CardContent className="p-0">
        {/* تبويب التبديل بين الملف المسجل ويوتيوب */}
        {ytId && videoUrl && (
          <div className="flex border-b border-purple-100">
            <button
              onClick={() => setActiveTab("local")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${activeTab === "local" ? "bg-purple-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-purple-50"}`}
            >
              🎬 الملف المسجل
            </button>
            <button
              onClick={() => setActiveTab("youtube")}
              className={`flex-1 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${activeTab === "youtube" ? "bg-red-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-red-50"}`}
            >
              <Youtube className="w-4 h-4" /> يوتيوب
            </button>
          </div>
        )}
        <div
          ref={containerRef}
          className="relative bg-black group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Video Element */}
          <div className="overflow-hidden w-full" style={{ maxHeight: isFullscreen ? '100vh' : '60vh' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              onClick={togglePlay}
            />
          </div>

          {/* Overlay Controls */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Center Play Button */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress */}
              <div className="relative w-full h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                handleSeek([pct * duration]);
              }}>
                <div className="absolute h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={skipBackward} className="text-white hover:text-purple-300 p-1">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button onClick={togglePlay} className="text-white hover:text-purple-300 p-1">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button onClick={skipForward} className="text-white hover:text-purple-300 p-1">
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <span className="text-white text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-white hover:text-purple-300 p-1">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="w-20 hidden sm:block">
                    <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={(v) => setVolume(v[0])} />
                  </div>
                  <button onClick={toggleFullscreen} className="text-white hover:text-purple-300 p-1">
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below Video Controls */}
        <div className="p-4 flex items-center gap-4 flex-wrap bg-gray-50">
          {/* Speed */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600">السرعة:</span>
            <Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="0.75">0.75x</SelectItem>
                <SelectItem value="1">1x عادي</SelectItem>
                <SelectItem value="1.25">1.25x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 flex-1 min-w-40">
            <span className="text-sm text-gray-600 whitespace-nowrap">تكبير:</span>
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => handleZoom(v)} className="flex-1" />
            <span className="text-xs text-gray-500 w-10">{zoom.toFixed(1)}x</span>
            {zoom !== 1 && (
              <Button onClick={() => setZoom(1)} variant="ghost" size="sm" className="text-xs h-7 px-2">
                إعادة
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}