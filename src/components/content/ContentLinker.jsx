import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link2, Plus, Trash2, ExternalLink, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const LINK_TYPES = {
  related: { label: "محتوى ذو صلة", color: "bg-blue-100 text-blue-700" },
  continuation: { label: "استكمال", color: "bg-green-100 text-green-700" },
  prerequisite: { label: "متطلب سابق", color: "bg-yellow-100 text-yellow-700" },
  reference: { label: "مرجع", color: "bg-purple-100 text-purple-700" }
};

const CONTENT_TYPES = {
  broadcast: { label: "بث", icon: "📻" },
  recording: { label: "تسجيل", icon: "🎙️" },
  hadith: { label: "حديث", icon: "📖" },
  series: { label: "سلسلة", icon: "📚" }
};

export default function ContentLinker({ 
  sourceType, 
  sourceId, 
  sourceTitle,
  canManage = false 
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetType, setSelectedTargetType] = useState("recording");
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [linkType, setLinkType] = useState("related");
  const [description, setDescription] = useState("");

  // Fetch existing links
  const { data: links = [] } = useQuery({
    queryKey: ['contentLinks', sourceId],
    queryFn: () => base44.entities.ContentLink.filter({ source_id: sourceId }),
    enabled: !!sourceId,
  });

  // Search for content to link
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['contentSearch', selectedTargetType, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      
      let entityName = '';
      if (selectedTargetType === 'broadcast') entityName = 'Broadcast';
      else if (selectedTargetType === 'recording') entityName = 'Recording';
      else if (selectedTargetType === 'hadith') entityName = 'Hadith';
      else if (selectedTargetType === 'series') entityName = 'Series';

      const results = await base44.entities[entityName].list();
      return results.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);
    },
    enabled: showAddDialog && searchQuery.length >= 2,
  });

  const createLinkMutation = useMutation({
    mutationFn: async (linkData) => {
      const user = await base44.auth.me();
      return base44.entities.ContentLink.create({
        ...linkData,
        created_by: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentLinks', sourceId] });
      setShowAddDialog(false);
      setSearchQuery("");
      setSelectedTarget(null);
      setDescription("");
      alert('✅ تم إضافة الرابط بنجاح');
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (id) => base44.entities.ContentLink.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentLinks', sourceId] });
      alert('✅ تم حذف الرابط بنجاح');
    },
  });

  const handleAddLink = () => {
    if (!selectedTarget) {
      alert('يرجى اختيار محتوى للربط');
      return;
    }

    createLinkMutation.mutate({
      source_type: sourceType,
      source_id: sourceId,
      source_title: sourceTitle,
      target_type: selectedTargetType,
      target_id: selectedTarget.id,
      target_title: selectedTarget.title,
      link_type: linkType,
      description: description
    });
  };

  const navigateToContent = (link) => {
    let url = '';
    if (link.target_type === 'broadcast') {
      url = createPageUrl(`ListenBroadcast?id=${link.target_id}`);
    } else if (link.target_type === 'recording') {
      url = createPageUrl(`Recordings`);
    } else if (link.target_type === 'hadith') {
      url = createPageUrl(`AdminPanel`); // Or hadith viewer page
    } else if (link.target_type === 'series') {
      url = createPageUrl(`SeriesPublic`);
    }
    navigate(url);
  };

  return (
    <Card className="border-2 border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-600" />
            محتوى ذو صلة ({links.length})
          </CardTitle>
          {canManage && (
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة رابط
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-gray-600 text-center py-8">لا توجد روابط بعد</p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{CONTENT_TYPES[link.target_type].icon}</span>
                    <Badge className={LINK_TYPES[link.link_type].color}>
                      {LINK_TYPES[link.link_type].label}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{link.target_title}</h4>
                  <p className="text-sm text-gray-600">
                    {CONTENT_TYPES[link.target_type].label}
                  </p>
                  {link.description && (
                    <p className="text-sm text-gray-500 mt-1 italic">{link.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigateToContent(link)}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح
                  </Button>
                  {canManage && (
                    <Button
                      onClick={() => {
                        if (confirm('هل تريد حذف هذا الرابط؟')) {
                          deleteLinkMutation.mutate(link.id);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Link Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة رابط لمحتوى ذي صلة</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع المحتوى</Label>
              <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTENT_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.icon} {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ابحث عن المحتوى</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="اكتب للبحث..."
                  className="pr-10"
                />
              </div>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTarget(item)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTarget?.id === item.id
                        ? 'bg-purple-100 border-2 border-purple-500'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <p className="font-semibold">{item.title}</p>
                    {item.broadcaster_name && (
                      <p className="text-sm text-gray-600">👨‍🏫 {item.broadcaster_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTarget && (
              <>
                <div className="space-y-2">
                  <Label>نوع العلاقة</Label>
                  <Select value={linkType} onValueChange={setLinkType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LINK_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>وصف العلاقة (اختياري)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثال: تكملة للدرس السابق..."
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddLink}
              disabled={!selectedTarget || createLinkMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createLinkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  جارٍ الحفظ...
                </>
              ) : (
                'إضافة الرابط'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}