import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

export default function FollowButton({ broadcasterId, broadcasterName }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: followRecord } = useQuery({
    queryKey: ['follow', user?.id, broadcasterId],
    queryFn: async () => {
      if (!user) return null;
      const follows = await base44.entities.Follow.filter({
        follower_id: user.id,
        following_id: broadcasterId
      });
      return follows[0] || null;
    },
    enabled: !!user && user.id !== broadcasterId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Follow.create({
        follower_id: user.id,
        following_id: broadcasterId,
        follower_name: user.full_name || user.email,
        following_name: broadcasterName,
        notify_on_broadcast: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Follow.delete(followRecord.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow'] });
    },
  });

  if (!user || user.id === broadcasterId) {
    return null;
  }

  const isFollowing = !!followRecord;

  return (
    <Button
      onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={`gap-2 ${isFollowing ? 'border-2' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'}`}
      disabled={followMutation.isPending || unfollowMutation.isPending}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          متابَع
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          متابعة
        </>
      )}
    </Button>
  );
}