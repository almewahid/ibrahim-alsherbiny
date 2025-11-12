
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Eye, Sparkles, Upload, FileText, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال",
  "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء",
  "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء",
  "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر",
  "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية",
  "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر",
  "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة",
  "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ",
  "النازعات", "عبس", "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق",
  "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين",
  "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر",
  "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد",
  "الإخلاص", "الفلق", "الناس"
];

const DESIGN_VARIANTS = [
  { id: 1, name: "كلاسيكي", colors: "from-purple-600 to-pink-600" },
  { id: 2, name: "أزرق هادئ", colors: "from-blue-600 to-cyan-600" },
  { id: 3, name: "أخضر طبيعي", colors: "from-green-600 to-emerald-600" },
  { id: 4, name: "ذهبي فاخر", colors: "from-yellow-600 to-orange-600" },
  { id: 5, name: "بنفسجي داكن", colors: "from-indigo-600 to-purple-600" }
];

export default function BroadcastCoverEditor() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const broadcastIdFromUrl = urlParams.get('broadcast_id');
  
  const [broadcastId, setBroadcastId] = useState(broadcastIdFromUrl || "");
  const [coverData, setCoverData] = useState({
    template_type: "تفسير",
    fixed_title: "التفسير الموضوعي الميسر",
    lecturer_name: "د.إبراهيم الشربيني",
    surah_name: "البقرة",
    surah_number: 2,
    verse_from: 1,
    verse_to: 1,
    verses_text: [],
    hadith_number: null,
    hadith_text: "",
    custom_image_url: "",
    pdf_url: "",
    design_variant: 1,
    morning_adhkar: "",
    previous_summary: ""
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const { data: verses = [] } = useQuery({
    queryKey: ['verses', coverData.surah_number],
    queryFn: () => base44.entities.QuranVerse.filter({ surah_number: coverData.surah_number }),
    enabled: !!coverData.surah_number && coverData.template_type === "تفسير",
  });

  const { data: hadiths = [] } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => base44.entities.Hadith.list(),
    enabled: coverData.template_type === "حديث",
  });

  // Sort hadiths by number for dropdown display
  const sortedHadiths = useMemo(() => {
    return [...hadiths].sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [hadiths]);

  useEffect(() => {
    if (broadcastId) {
      loadBroadcastData();
    }
  }, [broadcastId]);

  const loadBroadcastData = async () => {
    try {
      const broadcasts = await base44.entities.Broadcast.filter({ id: broadcastId });
      if (broadcasts.length > 0) {
        const broadcast = broadcasts[0];
        setCoverData(prev => ({
          ...prev,
          fixed_title: broadcast.title,
          lecturer_name: broadcast.lecturer_name || prev.lecturer_name
        }));
      }
    } catch (error) {
      console.error("Error loading broadcast:", error);
    }
  };

  // Load verses text when range changes
  useEffect(() => {
    if (coverData.template_type === "تفسير" && verses.length > 0 && coverData.verse_from && coverData.verse_to) {
      const selectedVerses = verses.filter(v => 
        v.verse_number >= coverData.verse_from && 
        v.verse_number <= coverData.verse_to
      );
      setCoverData(prev => ({ 
        ...prev, 
        verses_text: selectedVerses.map(v => v.verse_text) 
      }));
    }
  }, [verses, coverData.verse_from, coverData.verse_to, coverData.template_type]);

  // Load hadith text when number changes
  useEffect(() => {
    if (coverData.template_type === "حديث" && coverData.hadith_number && hadiths.length > 0) {
      const hadith = hadiths.find(h => h.number === parseInt(coverData.hadith_number));
      if (hadith) {
        setCoverData(prev => ({ ...prev, hadith_text: hadith.arabic_text }));
      }
    }
  }, [coverData.hadith_number, hadiths, coverData.template_type]);

  const saveCoverMutation = useMutation({
    mutationFn: (data) => base44.entities.BroadcastCover.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcastCovers'] });
      alert('✅ تم حفظ الغلاف بنجاح!');
    },
  });

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const response = await base44.functions.invoke('generateLessonSummary', {
        broadcast_id: broadcastId,
        lesson_topic: `${coverData.fixed_title} - ${coverData.surah_name || ''}`
      });

      if (response.data.success) {
        setCoverData(prev => ({ ...prev, previous_summary: response.data.summary }));
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('فشل توليد الملخص');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (type === 'image') {
        setCoverData(prev => ({ ...prev, custom_image_url: result.file_url }));
      } else if (type === 'pdf') {
        setCoverData(prev => ({ ...prev, pdf_url: result.file_url }));
      }
      
      alert('✅ تم رفع الملف بنجاح');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('فشل رفع الملف: ' + error.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSave = () => {
    if (!broadcastId) {
      alert('يرجى إدخال معرف البث');
      return;
    }

    saveCoverMutation.mutate({
      broadcast_id: broadcastId,
      ...coverData
    });
  };

  const selectedDesign = DESIGN_VARIANTS.find(d => d.id === coverData.design_variant);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-3">تصميم غلاف الدرس</h1>
          <p className="text-lg text-gray-600">قم بتخصيص غلاف البث الخاص بك</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle>معلومات الغلاف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>معرف البث</Label>
                <Input
                  value={broadcastId}
                  onChange={(e) => setBroadcastId(e.target.value)}
                  placeholder="أدخل معرف البث"
                  disabled={!!broadcastIdFromUrl}
                />
              </div>

              <div className="space-y-2">
                <Label>نوع القالب</Label>
                <Select
                  value={coverData.template_type}
                  onValueChange={(value) => setCoverData({ ...coverData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تفسير">تفسير (آيات قرآنية)</SelectItem>
                    <SelectItem value="حديث">حديث (الأربعون النووية)</SelectItem>
                    <SelectItem value="فقه">فقه (صورة/PDF)</SelectItem>
                    <SelectItem value="سيرة">سيرة (صورة/PDF)</SelectItem>
                    <SelectItem value="عام">عام (صورة/PDF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>العنوان الثابت</Label>
                <Input
                  value={coverData.fixed_title}
                  onChange={(e) => setCoverData({ ...coverData, fixed_title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>اسم المحاضر</Label>
                <Input
                  value={coverData.lecturer_name}
                  onChange={(e) => setCoverData({ ...coverData, lecturer_name: e.target.value })}
                />
              </div>

              {/* تفسير: Verse Range */}
              {coverData.template_type === "تفسير" && (
                <>
                  <div className="space-y-2">
                    <Label>اسم السورة</Label>
                    <Select
                      value={coverData.surah_name}
                      onValueChange={(value) => {
                        const index = SURAH_NAMES.indexOf(value);
                        setCoverData({ 
                          ...coverData, 
                          surah_name: value,
                          surah_number: index + 1
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {SURAH_NAMES.map((surah, index) => (
                          <SelectItem key={index} value={surah}>
                            {index + 1}. {surah}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>من آية</Label>
                      <Input
                        type="number"
                        value={coverData.verse_from}
                        onChange={(e) => setCoverData({ ...coverData, verse_from: parseInt(e.target.value) })}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>إلى آية</Label>
                      <Input
                        type="number"
                        value={coverData.verse_to}
                        onChange={(e) => setCoverData({ ...coverData, verse_to: parseInt(e.target.value) })}
                        min={coverData.verse_from}
                      />
                    </div>
                  </div>

                  {coverData.verses_text.length > 0 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        ✅ تم تحميل {coverData.verses_text.length} آية بنجاح
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {/* حديث: Hadith Selection */}
              {coverData.template_type === "حديث" && (
                <>
                  <div className="space-y-2">
                    <Label>رقم الحديث (الأربعون النووية)</Label>
                    <Select
                      value={coverData.hadith_number?.toString()}
                      onValueChange={(value) => setCoverData({ ...coverData, hadith_number: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر رقم الحديث" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {sortedHadiths.map((hadith) => (
                          <SelectItem key={hadith.number} value={hadith.number.toString()}>
                            {hadith.number}. {hadith.title || `الحديث ${hadith.number}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {coverData.hadith_text && (
                    <div className="space-y-2">
                      <Label>نص الحديث</Label>
                      <Textarea
                        value={coverData.hadith_text}
                        readOnly
                        className="min-h-32 bg-gray-50"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Other types: Image/PDF Upload */}
              {["فقه", "سيرة", "عام"].includes(coverData.template_type) && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>رفع صورة مخصصة</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'image')}
                        disabled={isUploadingFile}
                      />
                      {coverData.custom_image_url && (
                        <Button variant="outline" size="sm">
                          ✓ تم الرفع
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>رفع ملف PDF</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileUpload(e, 'pdf')}
                        disabled={isUploadingFile}
                      />
                      {coverData.pdf_url && (
                        <Button variant="outline" size="sm">
                          ✓ تم الرفع
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>تصميم الغلاف</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DESIGN_VARIANTS.map((design) => (
                    <button
                      key={design.id}
                      onClick={() => setCoverData({ ...coverData, design_variant: design.id })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        coverData.design_variant === design.id
                          ? 'border-purple-500 ring-2 ring-purple-200'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className={`h-20 rounded-lg bg-gradient-to-br ${design.colors} mb-2`} />
                      <p className="text-sm font-semibold text-center">{design.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات إضافية (تظهر في صفحة الانتظار)</Label>
                <Textarea
                  value={coverData.morning_adhkar}
                  onChange={(e) => setCoverData({ ...coverData, morning_adhkar: e.target.value })}
                  placeholder="أدخل ملاحظات، تنبيهات، أو أذكار للمستمعين..."
                  className="min-h-32"
                />
                <p className="text-xs text-gray-500">
                  💡 يمكنك كتابة تذكير بأذكار الصباح، أو تعليمات خاصة بالدرس
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>ملخص الدرس السابق (يظهر في صفحة الانتظار)</Label>
                  <Button
                    onClick={generateSummary}
                    variant="outline"
                    size="sm"
                    disabled={isGeneratingSummary || !broadcastId}
                    className="gap-2"
                  >
                    {isGeneratingSummary ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    توليد بالذكاء الاصطناعي
                  </Button>
                </div>
                <Textarea
                  value={coverData.previous_summary}
                  onChange={(e) => setCoverData({ ...coverData, previous_summary: e.target.value })}
                  placeholder="ملخص سريع للدرس السابق يساعد المستمعين على التذكر والربط..."
                  className="min-h-32"
                />
                <p className="text-xs text-gray-500">
                  💡 يمكنك كتابة ملخص يدوي أو استخدام الذكاء الاصطناعي لتوليده تلقائياً
                </p>
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 gap-2"
                disabled={saveCoverMutation.isPending}
              >
                {saveCoverMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                حفظ الغلاف
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-2 border-purple-100 sticky top-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                معاينة الغلاف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`relative min-h-[500px] rounded-2xl bg-gradient-to-br ${selectedDesign?.colors} p-8 text-white overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 h-full flex flex-col justify-center">
                  {coverData.template_type === "تفسير" && coverData.verses_text.length > 0 && (
                    <>
                      <h2 className="text-4xl font-bold mb-4 text-center drop-shadow-2xl">
                        سورة {coverData.surah_name}
                      </h2>
                      <p className="text-2xl font-bold mb-6 text-center text-white/90 drop-shadow-lg">
                        {coverData.verse_from === coverData.verse_to 
                          ? `الآية ${coverData.verse_from}`
                          : `من الآية ${coverData.verse_from} إلى ${coverData.verse_to}`
                        }
                      </p>
                      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border-2 border-white/30">
                        <div className="text-xl leading-loose space-y-4">
                          {coverData.verses_text.map((verse, index) => (
                            <p key={index}>
                              {verse}
                              {index < coverData.verses_text.length - 1 && (
                                <span className="mx-2 text-white/60">۝</span>
                              )}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {coverData.template_type === "حديث" && coverData.hadith_text && (
                    <>
                      <h2 className="text-4xl font-bold mb-4 text-center drop-shadow-2xl">
                        الحديث {coverData.hadith_number}
                      </h2>
                      <p className="text-xl mb-6 text-center text-white/90">من الأربعين النووية</p>
                      <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border-2 border-white/30">
                        <p className="text-xl leading-loose">
                          {coverData.hadith_text}
                        </p>
                      </div>
                    </>
                  )}

                  {coverData.custom_image_url && (
                    <div className="text-center">
                      <p className="text-lg">✅ تم رفع صورة مخصصة</p>
                    </div>
                  )}

                  {!coverData.verses_text?.length && !coverData.hadith_text && !coverData.custom_image_url && (
                    <div className="text-center">
                      <h2 className="text-4xl font-bold">
                        {coverData.fixed_title || "عنوان البث"}
                      </h2>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
