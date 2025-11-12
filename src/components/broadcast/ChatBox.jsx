import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function ChatBox({ broadcastId, currentUser, isBroadcaster }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', broadcastId],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter(
        { broadcast_id: broadcastId },
        "-created_date"
      );
      return msgs.reverse();
    },
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', broadcastId] });
      setMessage("");
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      broadcast_id: broadcastId,
      user_id: currentUser.id,
      user_name: currentUser.full_name || currentUser.email,
      message: message.trim(),
      is_broadcaster: isBroadcaster
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          الدردشة المباشرة
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <AnimatePresence>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد رسائل بعد</p>
                <p className="text-sm">كن أول من يرسل رسالة!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${
                      msg.user_id === currentUser.id ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {msg.user_name}
                      </span>
                      {msg.is_broadcaster && (
                        <Badge className="bg-purple-500 text-white text-xs">
                          مذيع
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(msg.created_date)}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                        msg.user_id === currentUser.id
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : msg.is_broadcaster
                          ? 'bg-purple-100 text-purple-900 border-2 border-purple-300'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
        
        <form onSubmit={handleSendMessage} className="p-4 border-t border-purple-100">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}