import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, UserX, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function ListenersList({ broadcastId, isBroadcaster }) {
  const queryClient = useQueryClient();

  const { data: listeners = [] } = useQuery({
    queryKey: ['listeners', broadcastId],
    queryFn: async () => {
      return await base44.entities.Listener.filter(
        { broadcast_id: broadcastId, is_active: true },
        "-created_date"
      );
    },
    refetchInterval: 3000,
  });

  const updateListenerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Listener.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listeners', broadcastId] });
    },
  });

  const toggleMuteListener = (listener) => {
    updateListenerMutation.mutate({
      id: listener.id,
      data: { is_muted: !listener.is_muted }
    });
  };

  const getTimeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
    } catch {
      return "الآن";
    }
  };

  return (
    <Card className="h-full flex flex-col border-2 border-purple-100">
      <CardHeader className="border-b border-purple-100 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            المستمعون ({listeners.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <AnimatePresence>
            {listeners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا يوجد مستمعون حالياً</p>
                <p className="text-sm">انتظر انضمام المستمعين</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listeners.map((listener) => (
                  <motion.div
                    key={listener.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-purple-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {listener.user_name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {listener.user_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          انضم {getTimeAgo(listener.joined_at || listener.created_date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {listener.is_muted && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          مكتوم
                        </Badge>
                      )}
                      {isBroadcaster && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleMuteListener(listener)}
                          className="hover:bg-purple-50"
                          title={listener.is_muted ? "إلغاء الكتم" : "كتم"}
                        >
                          {listener.is_muted ? (
                            <VolumeX className="w-4 h-4 text-red-500" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-purple-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}