import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Monitor, Square, Loader2, Circle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function UnifiedRecordingButton({
  broadcastId,
  broadcastTitle,
  audioStream,
  agoraScreenStream,
  onStartAgoraScreenShare,
  useCloudflareR2 = false,
  onScreenRecordingChange,
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingScreenRecord, setPendingScreenRecord] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const screenTrackRef = useRef(null);

  useEffect(() => {
    if (pendingScreenRecord && agoraScreenStream) {
      setPendingScreenRecord(false);
      doStartScreenRecording(agoraScreenStream);
    }
  }, [agoraScreenStream, pendingScreenRecord]);

  const startAudioRecording = async () => {
    setShowDialog(false);
    try {
      const stream = audioStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      beginRecording(stream, 'audio');
    } catch (err) {
      alert("فشل الوصول للميكروفون: " + err.message);
    }
  };

  const startScreenRecording = async () => {
    setShowDialog(false);
    if (!agoraScreenStream) {
      if (onStartAgoraScreenShare) {
        onStartAgoraScreenShare();
        setPendingScreenRecord(true);
      }
      return;
    }
    doStartScreenRecording(agoraScreenStream);
  };

  const doStartScreenRecording = (screenStream) => {
    try {
      const videoTracks = screenStream.getVideoTracks();
      if (videoTracks.length === 0) { alert("لا يوجد فيديو في مشاركة الشاشة"); return; }
      const audioTracks = [
        ...screenStream.getAudioTracks(),
        ...(audioStream ? audioStream.getAudioTracks() : []),
      ];
      const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
      if (onScreenRecordingChange) onScreenRecordingChange(true);
      beginRecording(combinedStream, 'screen');
    } catch (err) {
      alert("فشل بدء تسجيل الشاشة: " + err.message);
    }
  };

  const beginRecording = (stream, recordingMode) => {
    setMode(recordingMode);
    chunksRef.current = [];
    const capturedBroadcastId = broadcastId;
    let mr;
    try {
      mr = new MediaRecorder(stream, {
        mimeType: recordingMode === 'screen' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus'
      });
    } catch (_) {
      mr = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => saveRecording(recordingMode, capturedBroadcastId);
    mr.start();
    startTimeRef.current = Date.now();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.getTracks().forEach(t => t.stop());
      screenTrackRef.current = null;
    }
    if (onScreenRecordingChange) onScreenRecordingChange(false);
  };

  const saveRecording = async (recordingMode, savedBroadcastId) => {
    const effectiveBroadcastId = savedBroadcastId || broadcastId;
    console.log('[SaveRecording] START', { recordingMode, effectiveBroadcastId, chunks: chunksRef.current.length });

    try {
      const isVideo = recordingMode === 'screen';
      const mimeType = isVideo ? 'video/webm' : 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const fileSize = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
      const fileName = `${isVideo ? 'screen' : 'audio'}-${Date.now()}.webm`;
      const file = new File([blob], fileName, { type: mimeType });

      console.log(`[SaveRecording] blob ready: ${fileSize} MB, duration: ${duration}s`);

      // ── 1. تحميل محلي فوري ──────────────────────────────────────────────
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `${broadcastTitle || 'broadcast'}-${fileName}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(localUrl), 60000);

      // ── 2. رفع الملف ─────────────────────────────────────────────────────
      let fileUri = null;
      let fileUrl = null;

      // محاولة Cloudflare R2 أولاً
      if (useCloudflareR2) {
        console.log('[SaveRecording] trying R2 upload...');
        try {
          const r2 = await base44.functions.invoke('uploadToCloudflareR2', {
            file,
            fileName: `${effectiveBroadcastId}-${fileName}`,
            folder: isVideo ? 'videos' : 'recordings'
          });
          console.log('[SaveRecording] R2 response:', r2.data);
          if (r2.data?.success) {
            fileUrl = r2.data.public_url;
            fileUri = r2.data.file_key;
            console.log('[SaveRecording] R2 OK:', { fileUrl, fileUri });
          } else {
            console.warn('[SaveRecording] R2 returned no success:', r2.data);
          }
        } catch (r2Err) {
          console.error('[SaveRecording] R2 failed:', r2Err.message);
        }
      }

      // الرفع عبر base44 إذا لم ينجح R2
      if (!fileUri && !fileUrl) {
        console.log(`[SaveRecording] uploading via base44 (${isVideo ? 'PrivateFile' : 'PublicFile'}): ${fileSize} MB`);
        try {
          if (isVideo) {
            // فيديو → UploadPrivateFile → يعيد { file_uri }
            const up = await base44.integrations.Core.UploadPrivateFile({ file });
            console.log('[SaveRecording] UploadPrivateFile response:', up);
            fileUri = up?.file_uri;
          } else {
            // صوت → UploadFile → يعيد { file_url }
            const up = await base44.integrations.Core.UploadFile({ file });
            console.log('[SaveRecording] UploadFile response:', up);
            fileUrl = up?.file_url;
            fileUri = up?.file_uri || up?.file_url;
          }
          console.log(`[SaveRecording] upload OK → fileUri=${fileUri} fileUrl=${fileUrl}`);
        } catch (uploadErr) {
          console.error('[SaveRecording] base44 upload failed:', uploadErr);
          alert(`تم الحفظ محلياً لكن فشل الرفع:\n${uploadErr.message}`);
        }
      }

      // ── 3. حفظ السجل في قاعدة البيانات ──────────────────────────────────
      const user = await base44.auth.me();
      if (!effectiveBroadcastId) throw new Error("broadcast_id مطلوب");

      const recordingData = {
        broadcast_id: effectiveBroadcastId,
        title: broadcastTitle || 'بث',
        broadcaster_name: user.full_name || user.email,
        broadcaster_id: user.id,
        duration_seconds: duration,
        file_size_mb: fileSize,
        recorded_at: new Date().toISOString(),
        is_public: !isVideo,
      };

      if (fileUri) recordingData.file_uri = fileUri;
      if (fileUrl) recordingData.file_url = fileUrl;

      console.log('[SaveRecording] creating Recording entity:', recordingData);
      await base44.entities.Recording.create(recordingData);
      console.log('[SaveRecording] Recording entity created ✅');

      alert(`✅ تم حفظ ${isVideo ? 'تسجيل الشاشة' : 'التسجيل الصوتي'} وتحميله على جهازك!`);
    } catch (err) {
      console.error('[SaveRecording] FATAL error:', err);
      alert("❌ فشل حفظ التسجيل: " + err.message);
    }
    setIsProcessing(false);
    setMode(null);
  };

  return (
    <>
      {!isRecording && !isProcessing ? (
        <Button onClick={() => setShowDialog(true)} variant="outline" className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50">
          <Circle className="w-4 h-4 fill-red-500" />
          بدء التسجيل
        </Button>
      ) : isRecording ? (
        <Button onClick={stopRecording} variant="outline" className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50 animate-pulse">
          <Square className="w-4 h-4 fill-current" />
          إيقاف التسجيل
          {mode === 'screen' && <span className="text-xs bg-red-100 px-1 rounded">شاشة</span>}
          {mode === 'audio'  && <span className="text-xs bg-red-100 px-1 rounded">صوت</span>}
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جارٍ حفظ التسجيل...</span>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
          <span className="font-semibold">
            {mode === 'screen' ? 'جارٍ تسجيل الشاشة...' : 'جارٍ التسجيل الصوتي...'}
          </span>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">اختر نوع التسجيل</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <button onClick={startAudioRecording} className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 transition-all group">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200">
                <Mic className="w-7 h-7 text-purple-600" />
              </div>
              <span className="font-bold text-gray-800">تسجيل صوتي</span>
              <span className="text-xs text-gray-500 text-center">يستمر عرض الغلاف مع الصوت</span>
            </button>
            <button onClick={startScreenRecording} className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                <Monitor className="w-7 h-7 text-blue-600" />
              </div>
              <span className="font-bold text-gray-800">تسجيل الشاشة</span>
              <span className="text-xs text-gray-500 text-center">
                {agoraScreenStream ? 'استخدام الشاشة المشاركة حالياً' : 'مشاركة الشاشة مع الصوت'}
              </span>
            </button>
          </div>
          <Alert className="bg-blue-50 border-blue-200 mt-2">
            <AlertDescription className="text-blue-800 text-xs">
              💡 سيُحفظ التسجيل على الموقع ويُنزَّل تلقائياً على جهازك عند الانتهاء
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    </>
  );
}