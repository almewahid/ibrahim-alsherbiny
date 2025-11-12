
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, X, Radio, MessageCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function NotificationBell({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => base44.entities.Notification.filter({ user_id: userId }, "-created_date", 50),
    refetchInterval: 5000,
    enabled: !!userId,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const updateNotificationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    // Mark as read
    updateNotificationMutation.mutate({
      id: notification.id,
      data: { is_read: true }
    });

    // Navigate based on notification type
    if (notification.type === "new_broadcast" && notification.broadcast_id) {
      // Navigate directly to listen with autoplay
      navigate(`/ListenBroadcast?id=${notification.broadcast_id}&autoplay=true`);
      setIsOpen(false);
    } else if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_broadcast":
        return <Radio className="w-4 h-4 text-purple-600" />;
      case "new_message":
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">الإشعارات</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">{unreadCount} إشعار جديد</p>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer relative ${
                    !notification.is_read ? 'bg-purple-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 w-6 h-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-start gap-3 pr-6">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_date), {
                          addSuffix: true,
                          locale: ar
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
