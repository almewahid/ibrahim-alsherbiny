import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LiveIndicator from "./LiveIndicator";
import FollowButton from "./FollowButton";
import BroadcastCover from "./BroadcastCover";

const categoryColors = {
  "علوم شرعية": "bg-purple-100 text-purple-800",
  "تفسير القرآن": "bg-green-100 text-green-800",
  "الحديث النبوي": "bg-blue-100 text-blue-800",
  "الفقه الإسلامي": "bg-yellow-100 text-yellow-800",
  "السيرة النبوية": "bg-pink-100 text-pink-800",
  "تربية وتزكية": "bg-indigo-100 text-indigo-800",
  "نقاش": "bg-orange-100 text-orange-800",
  "أخرى": "bg-gray-100 text-gray-800"
};

export default function BroadcastCard({ broadcast, autoStartListening = false }) {
  const navigate = useNavigate();

  if (!broadcast) {
    return null;
  }

  const handleListen = () => {
    // If broadcast is not live, navigate to recordings with the broadcast's recording
    if (!broadcast.is_live) {
      navigate(createPageUrl("Recordings"));
      return;
    }
    
    const url = createPageUrl(`ListenBroadcast?id=${broadcast.id}${autoStartListening ? '&autoplay=true' : ''}`);
    navigate(url);
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || categoryColors["أخرى"] || "bg-gray-100 text-gray-800";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-2 border-purple-100 hover:shadow-2xl transition-all cursor-pointer group h-full flex flex-col">
        {/* Cover as Card Image - Pass isHomePage prop */}
        <div onClick={handleListen}>
          <BroadcastCover broadcastId={broadcast.id} className="w-full" isHomePage={true} />
        </div>

        <CardContent className="pt-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LiveIndicator isLive={broadcast.is_live} />
              <Badge className={`text-xs ${getCategoryColor(broadcast.category)}`}>
                {broadcast.category || "أخرى"}
              </Badge>
            </div>
            {broadcast.has_video && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                📹 فيديو
              </Badge>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-purple-600 transition-colors leading-tight">
              {broadcast.title}
            </h3>
            {broadcast.lecturer_name && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>👨‍🏫</span>
                <span className="line-clamp-1">{broadcast.lecturer_name}</span>
              </div>
            )}
          </div>

          {broadcast.description && (
            <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
              {broadcast.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-600">
            {broadcast.is_live && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="font-bold">{broadcast.listener_count || 0}</span>
              </div>
            )}
            {broadcast.duration_minutes > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{broadcast.duration_minutes} د</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleListen}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2 text-sm py-2"
            >
              <Radio className="w-3 h-3" />
              {broadcast.is_live ? "استمع الآن" : "استمع للتسجيل"}
            </Button>
            <FollowButton
              broadcasterId={broadcast.broadcaster_id}
              broadcasterName={broadcast.broadcaster_name}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}