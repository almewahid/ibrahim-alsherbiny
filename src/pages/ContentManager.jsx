import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers, Radio, Edit, Trash2, Link, Search, Plus, CheckCircle,
  Film, Clock, Eye, Users, Save, X, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["علوم شرعية", "تفسير القرآن", "الحديث النبوي", "الفقه الإسلامي", "السيرة النبوية", "تربية وتزكية", "نقاش", "أخرى"];

const formatDuration = (s) => {
  if (!s) return "-";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
};

// ─── Series Row ────────────────────────────────────────────────────────────────
function SeriesRow({ series, recordings, allRecordings, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const linked = recordings.length;
  const totalDuration = recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0);

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-100 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded(!expanded)} className="text-purple-500 hover:text-purple-700">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{series.title}</span>
            {series.category && <Badge className="text-xs bg-purple-100 text-purple-700">{series.category}</Badge>}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Film className="w-3 h-3" />{linked} حلقة</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(totalDuration)}</span>
            <span className="text-gray-400">{series.broadcaster_name}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onEdit(series)} className="gap-1 border-blue-200 text-blue-600">
            <Edit className="w-3.5 h-3.5" /> تعديل
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(series)} className="gap-1 border-red-200 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-purple-50 bg-purple-50/40 p-4 space-y-2">
          {recordings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">لا توجد تسجيلات مرتبطة بهذه السلسلة</p>
          ) : (
            recordings
              .sort((a, b) => (a.episode_number || 999) - (b.episode_number || 999))
              .map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 text-sm border border-purple-100">
                  <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                    {r.episode_number || "?"}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-gray-800 truncate">{r.title}</span>
                  <span className="text-gray-400 shrink-0">{formatDuration(r.duration_seconds)}</span>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recording Row ─────────────────────────────────────────────────────────────
function RecordingRow({ recording, series, onEdit, onDelete }) {
  const linkedSeries = series.find(s => s.id === recording.series_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-purple-100 px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-gray-900 text-sm line-clamp-1">{recording.title}</span>
          {recording.episode_number && (
            <Badge className="text-xs bg-blue-100 text-blue-700 shrink-0">ح{recording.episode_number}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          {linkedSeries ? (
            <span className="flex items-center gap-1 text-purple-600 font-medium">
              <Layers className="w-3 h-3" />{linkedSeries.title}
            </span>
          ) : (
            <span className="text-orange-400 flex items-center gap-1">
              <Radio className="w-3 h-3" />بدون سلسلة
            </span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(recording.duration_seconds)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{recording.views_count || 0}</span>
          {recording.category && <Badge className="text-xs bg-gray-100 text-gray-600">{recording.category}</Badge>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => onEdit(recording)} className="gap-1 border-blue-200 text-blue-600 h-8 px-2">
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDelete(recording)} className="gap-1 border-red-200 text-red-500 h-8 px-2">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentManager() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("recordings");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("الكل");
  const [filterSeries, setFilterSeries] = useState("الكل");

  // Edit recording state
  const [editingRec, setEditingRec] = useState(null);
  const [recForm, setRecForm] = useState({});

  // Edit series state
  const [editingSeries, setEditingSeries] = useState(null);
  const [seriesForm, setSeriesForm] = useState({});
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesForm, setNewSeriesForm] = useState({ title: "", category: "علوم شرعية", description: "" });

  const { data: recordings = [] } = useQuery({
    queryKey: ["mgr-recordings"],
    queryFn: () => base44.entities.Recording.list("-created_date", 500),
  });

  const { data: series = [] } = useQuery({
    queryKey: ["mgr-series"],
    queryFn: () => base44.entities.Series.list(),
  });

  // Mutations
  const updateRec = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recording.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mgr-recordings"] }); setEditingRec(null); },
  });

  const deleteRec = useMutation({
    mutationFn: (id) => base44.entities.Recording.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mgr-recordings"] }),
  });

  const updateSeries = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Series.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mgr-series"] }); setEditingSeries(null); },
  });

  const deleteSeries = useMutation({
    mutationFn: (id) => base44.entities.Series.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mgr-series"] }),
  });

  const createSeries = useMutation({
    mutationFn: (data) => base44.entities.Series.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mgr-series"] }); setShowNewSeries(false); setNewSeriesForm({ title: "", category: "علوم شرعية", description: "" }); },
  });

  // Filtered recordings
  const filteredRecordings = useMemo(() => {
    let r = recordings;
    if (filterCategory !== "الكل") r = r.filter(x => x.category === filterCategory);
    if (filterSeries === "بدون سلسلة") r = r.filter(x => !x.series_id);
    else if (filterSeries !== "الكل") r = r.filter(x => x.series_id === filterSeries);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.title?.toLowerCase().includes(q) || x.broadcaster_name?.toLowerCase().includes(q));
    }
    return r;
  }, [recordings, filterCategory, filterSeries, search]);

  const openEditRec = (rec) => {
    setEditingRec(rec);
    setRecForm({
      title: rec.title || "",
      description: rec.description || "",
      category: rec.category || "علوم شرعية",
      series_id: rec.series_id || "",
      episode_number: rec.episode_number || "",
      youtube_url: rec.youtube_url || "",
      is_public: rec.is_public !== false,
    });
  };

  const openEditSeries = (s) => {
    setEditingSeries(s);
    setSeriesForm({
      title: s.title || "",
      description: s.description || "",
      category: s.category || "علوم شرعية",
      is_active: s.is_active !== false,
    });
  };

  const handleDeleteRec = (rec) => {
    if (confirm(`حذف "${rec.title}"؟`)) deleteRec.mutate(rec.id);
  };

  const handleDeleteSeries = (s) => {
    const count = recordings.filter(r => r.series_id === s.id).length;
    if (confirm(`حذف سلسلة "${s.title}"؟${count > 0 ? `\n⚠️ تحتوي على ${count} تسجيل سيُفقد ربطها بالسلسلة.` : ""}`)) {
      deleteSeries.mutate(s.id);
    }
  };

  // Stats
  const unlinked = recordings.filter(r => !r.series_id).length;
  const totalRecordings = recordings.length;

  return (
    <div className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة المحتوى</h1>
              <p className="text-sm text-gray-500">ربط التسجيلات بالسلاسل وإدارة التصنيفات</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white rounded-xl border-2 border-purple-100 p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{totalRecordings}</p>
              <p className="text-xs text-gray-500">إجمالي التسجيلات</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-100 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{series.length}</p>
              <p className="text-xs text-gray-500">السلاسل</p>
            </div>
            <div className={`rounded-xl border-2 p-3 text-center ${unlinked > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-purple-100"}`}>
              <p className={`text-2xl font-bold ${unlinked > 0 ? "text-orange-600" : "text-gray-400"}`}>{unlinked}</p>
              <p className="text-xs text-gray-500">غير مرتبطة بسلسلة</p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 bg-purple-50 border-2 border-purple-100 rounded-xl p-1 h-auto gap-1">
            <TabsTrigger value="recordings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5 font-semibold">
              <Radio className="w-4 h-4 ml-2" /> التسجيلات ({totalRecordings})
            </TabsTrigger>
            <TabsTrigger value="series" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5 font-semibold">
              <Layers className="w-4 h-4 ml-2" /> السلاسل ({series.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Recordings Tab ── */}
          <TabsContent value="recordings" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9 border-2 rounded-xl" />
              </div>
              <Select value={filterSeries} onValueChange={setFilterSeries}>
                <SelectTrigger className="border-2 rounded-xl w-44">
                  <SelectValue placeholder="السلسلة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">كل السلاسل</SelectItem>
                  <SelectItem value="بدون سلسلة">بدون سلسلة ⚠️</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-2 rounded-xl w-40">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الكل">كل التصنيفات</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-gray-500">عرض {filteredRecordings.length} من {totalRecordings}</p>

            <div className="space-y-2">
              {filteredRecordings.map(rec => (
                <RecordingRow
                  key={rec.id}
                  recording={rec}
                  series={series}
                  onEdit={openEditRec}
                  onDelete={handleDeleteRec}
                />
              ))}
            </div>
          </TabsContent>

          {/* ── Series Tab ── */}
          <TabsContent value="series" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowNewSeries(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2 rounded-xl"
              >
                <Plus className="w-4 h-4" /> سلسلة جديدة
              </Button>
            </div>

            <div className="space-y-3">
              {series.map(s => (
                <SeriesRow
                  key={s.id}
                  series={s}
                  recordings={recordings.filter(r => r.series_id === s.id)}
                  allRecordings={recordings}
                  onEdit={openEditSeries}
                  onDelete={handleDeleteSeries}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Edit Recording Dialog ── */}
      <Dialog open={!!editingRec} onOpenChange={() => setEditingRec(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" /> تعديل التسجيل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العنوان</Label>
              <Input value={recForm.title || ""} onChange={e => setRecForm(p => ({ ...p, title: e.target.value }))} className="mt-1 border-2" />
            </div>
            <div>
              <Label>الوصف / الملخص</Label>
              <Textarea value={recForm.description || ""} onChange={e => setRecForm(p => ({ ...p, description: e.target.value }))} className="mt-1 border-2" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التصنيف</Label>
                <Select value={recForm.category} onValueChange={v => setRecForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الحلقة</Label>
                <Input
                  type="number"
                  value={recForm.episode_number || ""}
                  onChange={e => setRecForm(p => ({ ...p, episode_number: e.target.value ? Number(e.target.value) : null }))}
                  className="mt-1 border-2"
                  placeholder="1, 2, 3..."
                />
              </div>
            </div>
            <div>
              <Label>السلسلة</Label>
              <Select value={recForm.series_id || "none"} onValueChange={v => setRecForm(p => ({ ...p, series_id: v === "none" ? null : v }))}>
                <SelectTrigger className="mt-1 border-2"><SelectValue placeholder="بدون سلسلة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون سلسلة</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رابط يوتيوب (اختياري)</Label>
              <Input
                dir="ltr"
                value={recForm.youtube_url || ""}
                onChange={e => setRecForm(p => ({ ...p, youtube_url: e.target.value }))}
                className="mt-1 border-2"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingRec(null)}>إلغاء</Button>
            <Button
              onClick={() => updateRec.mutate({ id: editingRec.id, data: {
              title: recForm.title,
              description: recForm.description || null,
              category: recForm.category,
              series_id: recForm.series_id || null,
              episode_number: recForm.episode_number || null,
              youtube_url: recForm.youtube_url || null,
              is_public: recForm.is_public,
            }})}
              disabled={updateRec.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
            >
              {updateRec.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Series Dialog ── */}
      <Dialog open={!!editingSeries} onOpenChange={() => setEditingSeries(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" /> تعديل السلسلة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input value={seriesForm.title || ""} onChange={e => setSeriesForm(p => ({ ...p, title: e.target.value }))} className="mt-1 border-2" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={seriesForm.description || ""} onChange={e => setSeriesForm(p => ({ ...p, description: e.target.value }))} className="mt-1 border-2" rows={2} />
            </div>
            <div>
              <Label>التصنيف</Label>
              <Select value={seriesForm.category} onValueChange={v => setSeriesForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditingSeries(null)}>إلغاء</Button>
            <Button
              onClick={() => updateSeries.mutate({ id: editingSeries.id, data: seriesForm })}
              disabled={updateSeries.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
            >
              {updateSeries.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Series Dialog ── */}
      <Dialog open={showNewSeries} onOpenChange={setShowNewSeries}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" /> سلسلة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم *</Label>
              <Input value={newSeriesForm.title} onChange={e => setNewSeriesForm(p => ({ ...p, title: e.target.value }))} className="mt-1 border-2" placeholder="اسم السلسلة..." />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={newSeriesForm.description} onChange={e => setNewSeriesForm(p => ({ ...p, description: e.target.value }))} className="mt-1 border-2" rows={2} />
            </div>
            <div>
              <Label>التصنيف</Label>
              <Select value={newSeriesForm.category} onValueChange={v => setNewSeriesForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowNewSeries(false)}>إلغاء</Button>
            <Button
              onClick={() => createSeries.mutate({ ...newSeriesForm, broadcaster_id: "admin", broadcaster_name: "د.إبراهيم الشربيني", is_active: true })}
              disabled={!newSeriesForm.title.trim() || createSeries.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2"
            >
              {createSeries.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}