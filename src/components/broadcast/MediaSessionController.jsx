import { useEffect } from "react";

/**
 * MediaSessionController - Enables background audio playback in web browsers
 * 
 * This component uses the Media Session API to allow audio to continue playing
 * when the user switches tabs, minimizes the browser, or locks their device screen.
 * 
 * Note: This is a web-based solution. For native mobile apps, you would need:
 * - Android: Foreground Service
 * - iOS: Background Audio capability
 */
export default function MediaSessionController({ 
  title = "بث مباشر",
  artist = "د.إبراهيم الشربيني", 
  album = "بث حي",
  artwork = [],
  isPlaying = false,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward
}) {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: album,
        artwork: artwork.length > 0 ? artwork : [
          { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set action handlers
      if (onPlay) {
        navigator.mediaSession.setActionHandler('play', onPlay);
      }
      
      if (onPause) {
        navigator.mediaSession.setActionHandler('pause', onPause);
      }
      
      if (onSeekBackward) {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          onSeekBackward(details.seekOffset || 10);
        });
      }
      
      if (onSeekForward) {
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          onSeekForward(details.seekOffset || 10);
        });
      }

      // Additional handlers for better control
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
    };
  }, [title, artist, album, artwork, isPlaying, onPlay, onPause, onSeekBackward, onSeekForward]);

  return null; // This component doesn't render anything
}