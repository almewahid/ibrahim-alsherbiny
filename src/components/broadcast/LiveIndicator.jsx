import React from "react";
import { motion } from "framer-motion";

export default function LiveIndicator({ isLive, size = "md" }) {
  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`${sizes[size]} bg-red-500 rounded-full`}
      />
      <span className={`${textSizes[size]} font-bold text-red-500`}>
        مباشر
      </span>
    </div>
  );
}