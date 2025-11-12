
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Trash2, Edit, Copy, Shield, Radio, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BroadcastCover from "../components/broadcast/BroadcastCover";
import SearchBar from "../components/broadcast/SearchBar";

export default function CoversGallery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const coversPerPage = 9;

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin' && currentUser.custom_role !== 'admin' && currentUser.custom_role !== 'content_manager') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: covers = [], isLoading } = useQuery({
    queryKey: ['allCovers'],
    queryFn: () => base44.entities.BroadcastCover.list("-created_date"),
    refetchInterval: 10000,
  });

  const deleteCoverMutation = useMutation({
    mutationFn: (id) => base44.entities.BroadcastCover.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCovers'] });
      alert('✅ تم حذف الغلاف بنجاح');
    },
  });

  const filteredCovers = React.useMemo(() => {
    if (!searchQuery.trim()) return covers;
    
    const query = searchQuery.toLowerCase();
    return covers.filter(c =>
      c.fixed_title?.toLowerCase().includes(query) ||
      c.lecturer_name?.toLowerCase().includes(query) ||
      c.surah_name?.toLowerCase().includes(query)
    );
  }, [covers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCovers.length / coversPerPage);
  const paginatedCovers = filteredCovers.slice(
    (currentPage - 1) * coversPerPage,
    currentPage * coversPerPage
  );

  const handleDelete = (coverId) => {
    if (confirm('هل أنت متأكد من حذف هذا الغلاف؟')) {
      deleteCoverMutation.mutate(coverId);
    }
  };

  const handleEdit = (cover) => {
    navigate(createPageUrl(`BroadcastCoverEditor?broadcast_id=${cover.broadcast_id}`));
  };

  const copyBroadcastId = (broadcastId) => {
    navigator.clipboard.writeText(broadcastId);
    alert('✅ تم نسخ معرف البث');
  };

  const useInNewBroadcast = (cover) => {
    navigate(createPageUrl(`CreateBroadcast?cover_id=${cover.id}`));
  };

  const useInScheduledBroadcast = (cover) => {
    navigate(createPageUrl(`ScheduleBroadcast?cover_id=${cover.id}`));
  };

  if (!user || (user.role !== 'admin' && user.custom_role !== 'admin' && user.custom_role !== 'content_manager')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
            <p className="text-gray-600">هذه الصفحة متاحة للمشرفين فقط</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <Image className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">الأغلفة المحفوظة</h1>
          <p className="text-lg text-gray-600">
            اعرض، عدّل، أو احذف الأغلفة المُنشأة
          </p>
          
          <div className="mt-4 inline-block bg-purple-50 border-2 border-purple-200 rounded-xl px-4 py-2">
            <p className="text-sm text-purple-700 font-bold">
              📊 إجمالي الأغلفة: {covers.length}
            </p>
          </div>
        </motion.div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar
            value={searchQuery}
            onChange={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            placeholder="ابحث عن الأغلفة حسب العنوان، المحاضر، أو السورة..."
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : paginatedCovers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto border-2 border-purple-100">
              <CardContent className="pt-12 pb-12">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {searchQuery ? "لم يتم العثور على نتائج" : "لا توجد أغلفة بعد"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery ? "جرب البحث بكلمات مختلفة" : "ابدأ بإنشاء غلاف جديد"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCovers.map((cover) => (
                  <motion.div
                    key={cover.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-2 border-purple-100 hover:shadow-xl transition-shadow overflow-hidden">
                      <BroadcastCover broadcastId={cover.broadcast_id} className="w-full" />
                      
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-100 text-purple-700">
                            {cover.template_type}
                          </Badge>
                          <Badge variant="outline">
                            تصميم {cover.design_variant}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {cover.fixed_title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            المحاضر: {cover.lecturer_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            سورة {cover.surah_name} - آية {cover.verse_number}
                          </p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                          <p className="text-xs text-purple-700 mb-1">📋 معرف البث:</p>
                          <div className="flex items-center gap-1">
                            <code className="text-xs text-purple-900 font-mono bg-white px-2 py-1 rounded flex-1 truncate">
                              {cover.broadcast_id}
                            </code>
                            <Button
                              onClick={() => copyBroadcastId(cover.broadcast_id)}
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => useInNewBroadcast(cover)}
                            variant="outline"
                            className="flex-1 border-2 border-green-200 text-green-600 hover:bg-green-50 gap-2"
                          >
                            <Radio className="w-4 h-4" />
                            بث جديد
                          </Button>
                          <Button
                            onClick={() => useInScheduledBroadcast(cover)}
                            variant="outline"
                            className="flex-1 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            جدولة
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(cover)}
                            variant="outline"
                            className="flex-1 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </Button>
                          <Button
                            onClick={() => handleDelete(cover.id)}
                            variant="outline"
                            className="flex-1 border-2 border-red-200 text-red-600 hover:bg-red-50 gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  السابق
                </Button>
                
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      className={currentPage === page ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  التالي
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
