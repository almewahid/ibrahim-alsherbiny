import React, { useEffect, useRef } from "react";
import BroadcastCover from "./BroadcastCover";

/**
 * يعرض مشاركة الشاشة إذا كانت نشطة، وإلا يعرض الغلاف.
 */
export default function ScreenOrCoverDisplay({ broadcastId, screenStream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [screenStream]);

  if (screenStream) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse inline-block" />
          مشاركة الشاشة
        </div>
      </div>
    );
  }

  return <BroadcastCover broadcastId={broadcastId} />;
}