import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Square, Loader2, CheckCircle, MonitorUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

// مسجّل مشاركة الشاشة فقط (تم إزالة تسجيل الكاميرا)
export default function VideoRecorder({ broadcastId, broadcastTitle, autoStart = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useCloudflareR2, setUseCloudflareR2] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const streamRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    const checkR2Config = async () => {
      try {
        const response = await base44.functions.invoke('checkR2Configuration', {});
        if (response.data && response.data.configured) {
          setUseCloudflareR2(true);
        }
      } catch (error) {
        setUseCloudflareR2(false);
      }
    };
    checkR2Config();
  }, []);

  const startRecording = async () => {
    try {
      // مشاركة الشاشة فقط مع الصوت
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });

      streamRef.current = stream;
      
      // Show preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      chunksRef.current = [];
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await saveRecording();
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting screen recording:", error);
      alert("فشل بدء تسجيل الشاشة. تأكد من السماح بمشاركة الشاشة.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const saveRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);

      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });

      let fileUri = null;
      let fileUrl = null;

      // Try Cloudflare R2 first if configured
      if (useCloudflareR2) {
        try {
          const r2Response = await base44.functions.invoke('uploadToCloudflareR2', {
            file,
            fileName: `${broadcastId}-video-${Date.now()}.webm`,
            folder: 'videos'
          });

          if (r2Response.data && r2Response.data.success) {
            fileUrl = r2Response.data.public_url;
            fileUri = r2Response.data.file_key;
          } else {
            console.warn('Cloudflare R2 upload unsuccessful, falling back to Base44 storage.');
          }
        } catch (r2Error) {
          console.error('Error uploading to Cloudflare R2, falling back to Base44 storage:', r2Error);
        }
      }

      // Fallback to Base44 storage
      if (!fileUri) {
        const uploadResponse = await base44.integrations.Core.UploadPrivateFile({ file });
        
        if (!uploadResponse || !uploadResponse.file_uri) {
          throw new Error("Failed to upload video recording");
        }
        
        fileUri = uploadResponse.file_uri;
      }

      const user = await base44.auth.me();

      await base44.entities.Recording.create({
        broadcast_id: broadcastId,
        title: `${broadcastTitle} - تسجيل الشاشة`,
        broadcaster_name: user.full_name || user.email,
        broadcaster_id: user.id,
        file_uri: fileUri,
        file_url: fileUrl || undefined,
        duration_seconds: duration,
        file_size_mb: parseFloat(fileSize),
        has_video: true,
        recorded_at: new Date().toISOString()
      });

      // تحميل محلي تلقائي
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `${broadcastTitle}-screen-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(localUrl);

      setIsProcessing(false);
      alert('✅ تم حفظ التسجيل على الموقع وتحميله على جهازك!');
    } catch (error) {
      console.error("Error saving video recording:", error);
      setIsProcessing(false);
      alert("❌ فشل حفظ الفيديو");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-purple-100 rounded-xl p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MonitorUp className="w-5 h-5 text-purple-600" />
          تسجيل مشاركة الشاشة
        </h3>

        {(isRecording || isProcessing) && (
          <div className="mb-4">
            <video
              ref={videoPreviewRef}
              className="w-full rounded-lg bg-black"
              autoPlay
              muted
              playsInline
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              variant="outline"
              className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50"
              disabled={isProcessing}
            >
              <MonitorUp className="w-4 h-4" />
              بدء تسجيل الشاشة
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="outline"
              className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50 animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              إيقاف التسجيل
            </Button>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="font-bold">جارٍ التسجيل...</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ الحفظ...</span>
            </div>
          )}
        </div>

        <Alert className="bg-blue-50 border-blue-200 mt-4">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            💡 سيتم حفظ التسجيل على الموقع وتحميله تلقائياً على جهازك عند الانتهاء
            {useCloudflareR2 && " ☁️ (Cloudflare R2)"}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}