import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, User, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function DirectMessages() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['directMessages', user?.id, selectedUser?.id],
    queryFn: async () => {
      if (!user || !selectedUser) return [];
      
      const sent = await base44.entities.DirectMessage.filter({
        sender_id: user.id,
        receiver_id: selectedUser.id
      }, "-created_date");

      const received = await base44.entities.DirectMessage.filter({
        sender_id: selectedUser.id,
        receiver_id: user.id
      }, "-created_date");

      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    refetchInterval: 3000,
    enabled: !!user && !!selectedUser,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.DirectMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages'] });
      setMessage("");
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;

    sendMessageMutation.mutate({
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      receiver_id: selectedUser.id,
      receiver_name: selectedUser.full_name || selectedUser.email,
      message: message.trim()
    });
  };

  const filteredUsers = allUsers.filter(u => 
    u.id !== user?.id &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getUnreadCount = (userId) => {
    return messages.filter(m => 
      m.sender_id === userId && 
      m.receiver_id === user?.id && 
      !m.is_read
    ).length;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mb-4">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">الرسائل الخاصة</h1>
          <p className="text-lg text-gray-600">تواصل مباشرة مع المستخدمين</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle>المستخدمون</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مستخدم..."
                  className="pr-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {filteredUsers.map((u) => {
                  const unread = getUnreadCount(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full p-4 border-b hover:bg-purple-50 transition-colors text-right ${
                        selectedUser?.id === u.id ? 'bg-purple-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{u.full_name || u.email}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        {unread > 0 && (
                          <Badge className="bg-red-500">{unread}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-2 border-purple-100 flex flex-col">
            <CardHeader className="border-b">
              {selectedUser ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {selectedUser.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <CardTitle>{selectedUser.full_name || selectedUser.email}</CardTitle>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
              ) : (
                <CardTitle>اختر مستخدماً للمحادثة</CardTitle>
              )}
            </CardHeader>
            
            {selectedUser && (
              <>
                <CardContent className="flex-1 p-4">
                  <ScrollArea className="h-[480px]">
                    <AnimatePresence>
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>لا توجد رسائل بعد</p>
                          <p className="text-sm">ابدأ المحادثة!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex flex-col ${
                                msg.sender_id === user.id ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                                  msg.sender_id === user.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm break-words">{msg.message}</p>
                              </div>
                              <span className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(msg.created_date), {
                                  addSuffix: true,
                                  locale: ar
                                })}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </ScrollArea>
                </CardContent>

                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
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
                  </form>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}