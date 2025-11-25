
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Circle, Square, Loader2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function RecordingControls({ broadcastId, broadcastTitle, audioStream, autoStart = false, coverId = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useCloudflareR2, setUseCloudflareR2] = useState(false); // NEW
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);

  // Auto-start recording when broadcast begins
  useEffect(() => {
    if (autoStart && audioStream && !isRecording && !isProcessing) {
      startRecording();
    }
  }, [autoStart, audioStream, isRecording, isProcessing]); // Added dependencies for useEffect

  // Check if Cloudflare R2 is configured
  useEffect(() => {
    const checkR2Config = async () => {
      try {
        const response = await base44.functions.invoke('checkR2Configuration', {});
        if (response.data && response.data.configured) {
          setUseCloudflareR2(true);
        }
      } catch (error) {
        console.log('Cloudflare R2 not configured or check failed, using Base44 storage by default:', error);
        setUseCloudflareR2(false); // Ensure it's false if check fails
      }
    };
    checkR2Config();
  }, []); // Run once on component mount

  const startRecording = async () => {
    if (!audioStream) {
      console.warn("لا يوجد صوت للتسجيل");
      return;
    }

    try {
      chunksRef.current = [];
      
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(audioStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await saveRecording();
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
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
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);

      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

      let fileUri = null; // Will store the reference to the file (R2 key or Base44 URI)
      let fileUrl = null; // Will store the public URL if R2 is used

      // NEW: Try Cloudflare R2 first if configured
      if (useCloudflareR2) {
        try {
          const r2Response = await base44.functions.invoke('uploadToCloudflareR2', {
            file,
            fileName: `${broadcastId}-${Date.now()}.webm`,
            folder: 'recordings'
          });

          if (r2Response.data && r2Response.data.success) {
            fileUrl = r2Response.data.public_url;
            fileUri = r2Response.data.file_key; // Store R2 key for reference
          } else {
             // If R2 upload was attempted but not successful (e.g., data.success is false)
             console.warn('Cloudflare R2 upload unsuccessful, falling back to Base44 storage.');
          }
        } catch (r2Error) {
          // If R2 upload completely failed (e.g., network error, function error)
          console.error('Error uploading to Cloudflare R2, falling back to Base44 storage:', r2Error);
        }
      }

      // Fallback to Base44 private storage if R2 was not used or failed
      if (!fileUri) { // If fileUri is still null after R2 attempt (or if R2 wasn't used)
        const uploadResponse = await base44.integrations.Core.UploadPrivateFile({ file });
        
        if (!uploadResponse || !uploadResponse.file_uri) {
          throw new Error("Failed to upload recording to Base44 storage");
        }
        
        fileUri = uploadResponse.file_uri;
      }

      const user = await base44.auth.me();

      await base44.entities.Recording.create({
        broadcast_id: broadcastId,
        cover_id: coverId,
        title: broadcastTitle,
        broadcaster_name: user.full_name || user.email,
        broadcaster_id: user.id,
        file_uri: fileUri,
        file_url: fileUrl || undefined, // R2 URL if available, otherwise undefined
        duration_seconds: duration,
        file_size_mb: parseFloat(fileSize),
        recorded_at: new Date().toISOString()
      });

      setIsProcessing(false);
      
      const storageMessage = useCloudflareR2 && fileUrl 
        ? '✅ تم حفظ التسجيل على Cloudflare R2 بنجاح!'
        : '✅ تم حفظ التسجيل بنجاح!';
      
      alert(storageMessage);
    } catch (error) {
      console.error("Error saving recording:", error);
      setIsProcessing(false);
      alert("❌ فشل حفظ التسجيل");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="outline"
            className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50"
            disabled={isProcessing || !audioStream}
          >
            <Circle className="w-4 h-4 fill-current" />
            بدء التسجيل
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

      <Alert className="bg-blue-50 border-blue-200">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          💡 {autoStart ? "التسجيل يبدأ تلقائياً عند بدء البث" : "التسجيلات يتم حفظها تلقائياً"}
          {useCloudflareR2 && " - يتم استخدام Cloudflare R2 للتخزين الاقتصادي ☁️"}
        </AlertDescription>
      </Alert>
    </div>
  );
}
