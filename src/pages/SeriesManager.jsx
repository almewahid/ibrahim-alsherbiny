import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Layers, Plus, Edit, Trash2, Film, Clock, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const categories = ["علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

export default function SeriesManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [seriesData, setSeriesData] = useState({
    title: "",
    description: "",
    category: "علوم شرعية"
  });

  useEffect(() => {
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

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list("-created_date"),
  });

  const { data: recordings = [] } = useQuery({
    queryKey: ['recordingsWithSeries'],
    queryFn: () => base44.entities.Recording.list(),
  });

  const createSeriesMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setShowDialog(false);
      resetForm();
      alert('✅ تم إنشاء السلسلة بنجاح');
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Series.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setShowDialog(false);
      setEditingSeries(null);
      resetForm();
      alert('✅ تم تحديث السلسلة بنجاح');
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (id) => base44.entities.Series.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      alert('✅ تم حذف السلسلة بنجاح');
    },
  });

  const resetForm = () => {
    setSeriesData({
      title: "",
      description: "",
      category: "علوم شرعية"
    });
  };

  const handleSubmit = () => {
    if (!seriesData.title.trim()) {
      alert('يرجى إدخال اسم السلسلة');
      return;
    }

    const data = {
      ...seriesData,
      broadcaster_id: user.id,
      broadcaster_name: user.full_name || user.email
    };

    if (editingSeries) {
      updateSeriesMutation.mutate({ id: editingSeries.id, data });
    } else {
      createSeriesMutation.mutate(data);
    }
  };

  const handleEdit = (s) => {
    setEditingSeries(s);
    setSeriesData({
      title: s.title,
      description: s.description || "",
      category: s.category
    });
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    const hasRecordings = recordings.some(r => r.series_id === id);
    if (hasRecordings) {
      if (!confirm('هذه السلسلة تحتوي على تسجيلات. هل تريد حذفها؟')) {
        return;
      }
    } else {
      if (!confirm('هل أنت متأكد من حذف هذه السلسلة؟')) {
        return;
      }
    }
    deleteSeriesMutation.mutate(id);
  };

  const getSeriesStats = (seriesId) => {
    const seriesRecordings = recordings.filter(r => r.series_id === seriesId);
    return {
      count: seriesRecordings.length,
      duration: seriesRecordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / 60,
      views: seriesRecordings.reduce((sum, r) => sum + (r.views_count || 0), 0)
    };
  };

  if (!user || (user.role !== 'admin' && user.custom_role !== 'admin' && user.custom_role !== 'content_manager')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-purple-100">
          <CardContent className="pt-12 pb-12 text-center">
            <Shield className="w-10 h-10 text-purple-600 mx-auto mb-4" />
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
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">إدارة السلاسل</h1>
          <p className="text-lg text-gray-600">نظّم محتواك في سلاسل ومجموعات متكاملة</p>
        </motion.div>

        <div className="mb-6 flex justify-between items-center">
          <Badge className="bg-purple-100 text-purple-700 px-4 py-2 text-lg">
            📊 إجمالي السلاسل: {series.length}
          </Badge>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingSeries(null);
                  resetForm();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
              >
                <Plus className="w-5 h-5" />
                إنشاء سلسلة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingSeries ? "تعديل السلسلة" : "إنشاء سلسلة جديدة"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم السلسلة</Label>
                  <Input
                    value={seriesData.title}
                    onChange={(e) => setSeriesData({ ...seriesData, title: e.target.value })}
                    placeholder="مثال: تفسير سورة البقرة"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={seriesData.description}
                    onChange={(e) => setSeriesData({ ...seriesData, description: e.target.value })}
                    placeholder="وصف مختصر للسلسلة..."
                    className="min-h-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select value={seriesData.category} onValueChange={(value) => setSeriesData({ ...seriesData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                  disabled={createSeriesMutation.isPending || updateSeriesMutation.isPending}
                >
                  {editingSeries ? "حفظ التغييرات" : "إنشاء السلسلة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : series.length === 0 ? (
          <Card className="border-2 border-purple-100">
            <CardContent className="pt-12 pb-12 text-center">
              <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد سلاسل بعد</h3>
              <p className="text-gray-600 mb-6">ابدأ بإنشاء سلسلة جديدة لتنظيم محتواك</p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {series.map((s) => {
                const stats = getSeriesStats(s.id);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-2 border-purple-100 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{s.title}</CardTitle>
                            <Badge className="bg-purple-100 text-purple-700">
                              {s.category}
                            </Badge>
                          </div>
                          {s.is_active && (
                            <Badge className="bg-green-100 text-green-700">نشط</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {s.description && (
                          <p className="text-sm text-gray-600">{s.description}</p>
                        )}
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <Film className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-blue-700">{stats.count}</p>
                            <p className="text-xs text-blue-600">حلقة</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <Clock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-green-700">{Math.floor(stats.duration)}</p>
                            <p className="text-xs text-green-600">دقيقة</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-700">👁️</p>
                            <p className="text-2xl font-bold text-purple-700">{stats.views}</p>
                            <p className="text-xs text-purple-600">مشاهدة</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(s)}
                            variant="outline"
                            className="flex-1 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </Button>
                          <Button
                            onClick={() => handleDelete(s.id)}
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
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}