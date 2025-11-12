import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function MuteAllControl({ broadcast, isMutedForAll }) {
  const queryClient = useQueryClient();

  const toggleMuteAllMutation = useMutation({
    mutationFn: async (muted) => {
      // Update broadcast status
      await base44.entities.Broadcast.update(broadcast.id, {
        is_muted_for_all: muted
      });

      // Update all active listeners
      const listeners = await base44.entities.Listener.filter({
        broadcast_id: broadcast.id,
        is_active: true
      });

      for (const listener of listeners) {
        await base44.entities.Listener.update(listener.id, {
          is_muted: muted
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      queryClient.invalidateQueries({ queryKey: ['listeners', broadcast.id] });
    },
  });

  const handleToggleMuteAll = () => {
    toggleMuteAllMutation.mutate(!isMutedForAll);
  };

  return (
    <Button
      onClick={handleToggleMuteAll}
      variant="outline"
      size="lg"
      className="gap-2 hover:bg-purple-50 border-2"
      disabled={toggleMuteAllMutation.isPending}
    >
      {isMutedForAll ? (
        <>
          <VolumeX className="w-5 h-5 text-red-500" />
          فتح الصوت للجميع
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5 text-green-500" />
          كتم الصوت للجميع
        </>
      )}
    </Button>
  );
}