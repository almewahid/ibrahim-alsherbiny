import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, X, ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Context ──────────────────────────────────────────────────────────────────
const FloatingPlayerContext = createContext(null);

export function useFloatingPlayer() {
  return useContext(FloatingPlayerContext);
}

const STORAGE_KEY = "floating_player_positions";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getSavedPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function savePosition(recordingId, time) {
  if (!recordingId) return;
  const positions = getSavedPositions();
  positions[recordingId] = time;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function FloatingPlayerProvider({ children }) {
  const [track, setTrack] = useState(null); // { id, title, url }
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const audioRef = useRef(new Audio());

  // ── Event listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      savePosition(track?.id, audio.currentTime);
    };
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, [track?.id]);

  // ── Sync playback rate ────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ── Sync mute ─────────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current.muted = isMuted;
  }, [isMuted]);

  // ── API exposed via context ───────────────────────────────────────────────
  const play = async ({ id, title, url }) => {
    const audio = audioRef.current;
    if (track?.id === id) {
      // Resume / pause same track
      if (isPlaying) { audio.pause(); setIsPlaying(false); }
      else { await audio.play(); setIsPlaying(true); }
      return;
    }
    // New track
    audio.src = url;
    audio.playbackRate = playbackRate;
    setTrack({ id, title, url });
    setCurrentTime(0);
    setDuration(0);
    // Restore saved position
    const saved = getSavedPositions()[id];
    if (saved && saved > 5) {
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = saved;
      }, { once: true });
    }
    await audio.play();
    setIsPlaying(true);
    setCollapsed(false);
  };

  const pause = () => { audioRef.current.pause(); setIsPlaying(false); };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const close = () => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const skip = (delta) => {
    const newTime = Math.min(duration, Math.max(0, audioRef.current.currentTime + delta));
    seek(newTime);
  };

  return (
    <FloatingPlayerContext.Provider value={{ track, isPlaying, play, pause, close, currentTime, duration }}>
      {children}
      <AnimatePresence>
        {track && (
          <FloatingPlayerUI
            track={track}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            isMuted={isMuted}
            collapsed={collapsed}
            onTogglePlay={() => isPlaying ? pause() : audioRef.current.play().then(() => setIsPlaying(true))}
            onSeek={seek}
            onSkip={skip}
            onClose={close}
            onRateChange={setPlaybackRate}
            onToggleMute={() => setIsMuted(m => !m)}
            onToggleCollapse={() => setCollapsed(c => !c)}
          />
        )}
      </AnimatePresence>
    </FloatingPlayerContext.Provider>
  );
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function FloatingPlayerUI({
  track, isPlaying, currentTime, duration, playbackRate, isMuted, collapsed,
  onTogglePlay, onSeek, onSkip, onClose, onRateChange, onToggleMute, onToggleCollapse
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const savedPos = getSavedPositions()[track.id];
  const hasSavedPos = savedPos && savedPos > 5 && Math.abs(savedPos - currentTime) > 5;
  const rates = [0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
      dir="rtl"
    >
      {/* Progress bar at very top */}
      <div
        className="h-1 bg-gray-200 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-white/95 backdrop-blur-sm border-t border-purple-100 px-4 py-2">
        {/* Main row */}
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{track.title}</p>
            <p className="text-xs text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration)}
              {hasSavedPos && (
                <span className="mr-2 text-purple-500 text-xs">• تم الاستئناف من {formatTime(savedPos)}</span>
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onSkip(-10)}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="h-9 w-9 p-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={onTogglePlay}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onSkip(10)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed & mute - hidden when collapsed */}
          {!collapsed && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onToggleMute}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-gray-600" />}
              </Button>

              {/* Speed buttons */}
              <div className="flex gap-1">
                {rates.map(r => (
                  <button
                    key={r}
                    onClick={() => onRateChange(r)}
                    className={`text-xs px-2 py-1 rounded font-mono transition-colors ${
                      playbackRate === r
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collapse / Close */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onToggleCollapse}>
              {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-500" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile speed row */}
        {!collapsed && (
          <div className="flex sm:hidden items-center justify-center gap-2 mt-1 pb-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onToggleMute}>
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </Button>
            {rates.map(r => (
              <button
                key={r}
                onClick={() => onRateChange(r)}
                className={`text-xs px-1.5 py-0.5 rounded font-mono transition-colors ${
                  playbackRate === r ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {r}x
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}