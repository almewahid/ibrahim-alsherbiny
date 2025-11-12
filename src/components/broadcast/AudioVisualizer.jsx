import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function AudioVisualizer({ isActive, audioStream, barCount = 32 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    if (!audioStream || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const draw = () => {
      if (!canvas || !ctx || !analyser) return;

      const WIDTH = canvas.width;
      const HEIGHT = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * HEIGHT;
        
        const gradient = ctx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT);
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(1, '#ec4899');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioStream, isActive]);

  if (!audioStream) {
    // Fallback animation when no real audio
    return (
      <div className="flex items-center justify-center gap-1 h-32">
        {Array.from({ length: barCount }).map((_, index) => (
          <motion.div
            key={index}
            className="w-1.5 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
            animate={isActive ? {
              height: [
                Math.random() * 40 + 20,
                Math.random() * 80 + 40,
                Math.random() * 40 + 20
              ]
            } : {
              height: 8
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.05
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={128}
      className="w-full h-32 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50"
    />
  );
}