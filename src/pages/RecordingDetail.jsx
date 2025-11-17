import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Edit, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RecordingPlayer from "../components/recording/RecordingPlayer";
import BroadcastMarkers from "../components/broadcast/BroadcastMarkers";

export default function RecordingDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const recordingId = urlParams.get('id');
  const [seekTo, setSeekTo] = useState(null);

  const { data: recording } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      const recordings = await base44.entities.Recording.filter({ id: recordingId });
      return recordings[0];
    },
    enabled: !!recordingId,
  });

  const { data: markers = [] } = useQuery({
    queryKey: ['recordingMarkers', recording?.broadcast_id],
    queryFn: () => base44.entities.BroadcastMarker.filter({ broadcast_id: recording.broadcast_id }),
    enabled: !!recording?.broadcast_id,
  });

  const handleMarkerSeek = (timestamp) => {
    setSeekTo(timestamp);
  };

  if (!recording) {
    return <div className="min-h-screen flex items-center justify-center">جارٍ التحميل...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="outline" onClick={() => navigate(createPageUrl("Recordings"))} className="mb-6 gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <div className="space-y-6">
          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="text-3xl">{recording.title}</CardTitle>
              <p className="text-gray-600">{recording.broadcaster_name}</p>
              <div className="flex gap-2 mt-3">
                <Badge>{recording.category}</Badge>
                {recording.series_id && <Badge variant="outline">سلسلة</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {recording.description && (
                <p className="text-gray-700">{recording.description}</p>
              )}

              <RecordingPlayer 
                fileUri={recording.file_uri} 
                markers={markers}
                onSeek={seekTo}
              />
            </CardContent>
          </Card>

          <BroadcastMarkers
            broadcastId={recording.broadcast_id}
            currentTime={seekTo || 0}
            onSeek={handleMarkerSeek}
            canManage={false}
          />
        </div>
      </div>
    </div>
  );
}