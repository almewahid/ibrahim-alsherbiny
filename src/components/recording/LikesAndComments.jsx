import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Trash2, Reply } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function LikesAndComments({ recordingId, user }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  // Fetch likes
  const { data: likes = [] } = useQuery({
    queryKey: ['likes', recordingId],
    queryFn: () => base44.entities.Like.filter({ recording_id: recordingId }),
    refetchInterval: 5000,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', recordingId],
    queryFn: () => base44.entities.Comment.filter({ recording_id: recordingId }, "-created_date"),
    refetchInterval: 5000,
  });

  const isLiked = likes.some(like => like.user_id === user?.id);
  const likesCount = likes.length;

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isLiked) {
        const userLike = likes.find(like => like.user_id === user.id);
        if (userLike) {
          await base44.entities.Like.delete(userLike.id);
        }
      } else {
        await base44.entities.Like.create({
          recording_id: recordingId,
          user_id: user.id,
          user_name: user.full_name || user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', recordingId] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', recordingId] });
      setCommentText("");
      setReplyingTo(null);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.Comment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', recordingId] });
    },
  });

  const handleLike = () => {
    if (!user) {
      alert('يجب تسجيل الدخول للإعجاب');
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!user) {
      alert('يجب تسجيل الدخول للتعليق');
      return;
    }
    if (!commentText.trim()) return;

    commentMutation.mutate({
      recording_id: recordingId,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_avatar: user.avatar_url || "",
      comment_text: commentText,
      parent_comment_id: replyingTo?.id || null
    });
  };

  const handleDelete = (commentId) => {
    if (confirm('هل تريد حذف هذا التعليق؟')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const mainComments = comments.filter(c => !c.parent_comment_id);

  return (
    <div className="space-y-6">
      {/* Likes Section */}
      <Card className="border-2 border-purple-100">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleLike}
              variant={isLiked ? "default" : "outline"}
              className={`gap-2 ${isLiked ? 'bg-gradient-to-r from-red-500 to-pink-500' : ''}`}
              disabled={likeMutation.isPending}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount} إعجاب
            </Button>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-5 h-5" />
              <span>{comments.length} تعليق</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Comment */}
      <Card className="border-2 border-purple-100">
        <CardHeader>
          <CardTitle className="text-lg">
            {replyingTo ? `الرد على ${replyingTo.user_name}` : 'أضف تعليق'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {replyingTo && (
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 flex items-center justify-between">
              <p className="text-sm text-gray-700">{replyingTo.comment_text}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(null)}
              >
                إلغاء
              </Button>
            </div>
          )}
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="اكتب تعليقك..."
            className="min-h-24"
          />
          <Button
            onClick={handleComment}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
            disabled={commentMutation.isPending || !commentText.trim()}
          >
            <Send className="w-4 h-4" />
            نشر التعليق
          </Button>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900">التعليقات ({comments.length})</h3>
        
        {mainComments.length === 0 ? (
          <Card className="border-2 border-purple-100">
            <CardContent className="pt-12 pb-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد تعليقات بعد. كن أول من يعلق!</p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {mainComments.map((comment) => {
              const replies = comments.filter(c => c.parent_comment_id === comment.id);
              
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="border-2 border-purple-100">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                          {comment.user_avatar ? (
                            <img src={comment.user_avatar} alt={comment.user_name} className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-white font-bold text-sm">
                              {comment.user_name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-900">{comment.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: ar })}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 mb-3">{comment.comment_text}</p>
                          
                          <div className="flex items-center gap-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReplyingTo(comment)}
                              className="gap-1 text-purple-600 hover:text-purple-700"
                            >
                              <Reply className="w-4 h-4" />
                              رد
                            </Button>
                            
                            {(user?.id === comment.user_id || user?.role === 'admin') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(comment.id)}
                                className="gap-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                حذف
                              </Button>
                            )}
                          </div>

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="mt-4 mr-6 space-y-3 border-r-2 border-purple-200 pr-4">
                              {replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-bold text-xs">
                                      {reply.user_name[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 bg-purple-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm text-gray-900">{reply.user_name}</span>
                                      <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true, locale: ar })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{reply.comment_text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}