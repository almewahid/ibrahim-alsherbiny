import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, Square, Pause, Play, Loader2, CheckCircle, AlertCircle, Clock, HardDrive } from "lucide-react";
import { base44 } from "@/api/base44Client";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export default function RecordingControls({ broadcastId, broadcastTitle, audioStream, autoStart = false, coverId = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState(0);
  const [useCloudflareR2, setUseCloudflareR2] = useState(false);
  const [r2Status, setR2Status] = useState({ configured: false, connected: false, message: '' });
  const [uploadError, setUploadError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const timerIntervalRef = useRef(null);

  // Auto-start recording when broadcast begins
  useEffect(() => {
    if (autoStart && audioStream && !isRecording && !isProcessing) {
      startRecording();
    }
  }, [autoStart, audioStream]);

  // Check if Cloudflare R2 is configured and connected
  useEffect(() => {
    const checkR2Config = async () => {
      try {
        const response = await base44.functions.invoke('checkR2Configuration', {});
        if (response.data) {
          setR2Status(response.data);
          setUseCloudflareR2(response.data.configured && response.data.connected);
        }
      } catch (error) {
        console.log('Cloudflare R2 check failed:', error);
        setUseCloudflareR2(false);
      }
    };
    checkR2Config();
  }, []);

  // Update recording duration and estimated size
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        
        // Estimate file size (approximately 2KB per second for webm audio)
        setEstimatedSize(elapsed * 2 * 1024);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    if (!audioStream) {
      console.warn("لا يوجد صوت للتسجيل");
      return;
    }

    try {
      chunksRef.current = [];
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
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

      // Request data every 1 second to reduce memory usage
      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      setEstimatedSize(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("❌ فشل بدء التسجيل: " + error.message);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current += Date.now() - startTimeRef.current;
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setIsProcessing(true);
      setUploadProgress(0);
      setUploadError(null);
    }
  };

  const saveRecording = async () => {
    try {
      setUploadProgress(10);
      
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const duration = recordingDuration;
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);

      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

      setUploadProgress(20);

      let fileUri = null;
      let fileUrl = null;
      let storageUsed = 'Base44';

      // Try Cloudflare R2 first if configured
      if (useCloudflareR2) {
        try {
          setUploadProgress(30);
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', `${broadcastId}-${Date.now()}.webm`);
          formData.append('folder', 'recordings');

          const r2Response = await base44.functions.invoke('uploadToCloudflareR2', formData);

          setUploadProgress(60);

          if (r2Response.data && r2Response.data.success) {
            fileUrl = r2Response.data.public_url;
            fileUri = r2Response.data.file_key;
            storageUsed = 'Cloudflare R2';
          } else {
            console.warn('Cloudflare R2 upload unsuccessful:', r2Response.data?.error);
            setUploadError({
              message: r2Response.data?.error || 'فشل الرفع إلى Cloudflare R2',
              suggestions: r2Response.data?.suggestions || ['سيتم استخدام التخزين الاحتياطي']
            });
          }
        } catch (r2Error) {
          console.error('Error uploading to Cloudflare R2:', r2Error);
          setUploadError({
            message: 'فشل الرفع إلى Cloudflare R2',
            suggestions: ['سيتم استخدام التخزين الاحتياطي', 'تحقق من إعدادات Cloudflare R2']
          });
        }
      }

      // Fallback to Base44 private storage if R2 failed or not configured
      if (!fileUri) {
        setUploadProgress(40);
        
        const uploadResponse = await base44.integrations.Core.UploadPrivateFile({ file });
        
        setUploadProgress(70);
        
        if (!uploadResponse || !uploadResponse.file_uri) {
          throw new Error("فشل رفع التسجيل إلى التخزين");
        }
        
        fileUri = uploadResponse.file_uri;
        storageUsed = 'Base44';
      }

      setUploadProgress(80);

      const user = await base44.auth.me();

      await base44.entities.Recording.create({
        broadcast_id: broadcastId,
        cover_id: coverId,
        title: broadcastTitle,
        broadcaster_name: user.full_name || user.email,
        broadcaster_id: user.id,
        file_uri: fileUri,
        file_url: fileUrl || undefined,
        duration_seconds: duration,
        file_size_mb: parseFloat(fileSize),
        recorded_at: new Date().toISOString()
      });

      setUploadProgress(100);
      setIsProcessing(false);
      
      const storageMessage = storageUsed === 'Cloudflare R2'
        ? `✅ تم حفظ التسجيل على Cloudflare R2 بنجاح! (${fileSize} MB)`
        : `✅ تم حفظ التسجيل بنجاح! (${fileSize} MB)\n📦 التخزين: ${storageUsed}`;
      
      alert(storageMessage);
      
      // Reset states
      setRecordingDuration(0);
      setEstimatedSize(0);
      setUploadError(null);
      
    } catch (error) {
      console.error("Error saving recording:", error);
      setIsProcessing(false);
      setUploadProgress(0);
      
      const errorMessage = `❌ فشل حفظ التسجيل\n\n${error.message}\n\nسيتم حفظ التسجيل محلياً بدلاً من ذلك.`;
      alert(errorMessage);
      
      // Download locally as fallback
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ تم تحميل التسجيل على جهازك بنجاح!');
      } catch (downloadError) {
        console.error("Error downloading recording:", downloadError);
      }
    }
  };

  return (
    <Card className="border-2 border-purple-100">
      <CardContent className="pt-6 space-y-4">
        {/* Recording Status */}
        {isRecording && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border-2 border-red-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-600 animate-pulse'}`} />
                <span className="font-bold text-lg">
                  {isPaused ? '⏸️ متوقف مؤقتاً' : '🔴 جارٍ التسجيل...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-red-700">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-mono font-bold">{formatTime(recordingDuration)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>الحجم المقدر: {formatBytes(estimatedSize)}</span>
              </div>
              {useCloudflareR2 && (
                <span className="text-blue-600 font-semibold">☁️ Cloudflare R2</span>
              )}
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 font-semibold">جارٍ رفع التسجيل...</span>
              <span className="text-blue-600 font-bold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            {uploadError && (
              <Alert variant="destructive" className="bg-orange-50 border-orange-200">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900 text-sm">
                  <p className="font-semibold mb-1">{uploadError.message}</p>
                  {uploadError.suggestions && (
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {uploadError.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
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
            <>
              {!isPaused ? (
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  className="gap-2 border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                >
                  <Pause className="w-4 h-4" />
                  إيقاف مؤقت
                </Button>
              ) : (
                <Button
                  onClick={resumeRecording}
                  variant="outline"
                  className="gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Play className="w-4 h-4" />
                  استئناف
                </Button>
              )}
              
              <Button
                onClick={stopRecording}
                variant="outline"
                className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50"
              >
                <Square className="w-4 h-4 fill-current" />
                إيقاف وحفظ
              </Button>
            </>
          )}
        </div>

        {/* Info Alert */}
        <Alert className={useCloudflareR2 ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}>
          <CheckCircle className={`h-4 w-4 ${useCloudflareR2 ? 'text-blue-600' : 'text-purple-600'}`} />
          <AlertDescription className={`${useCloudflareR2 ? 'text-blue-900' : 'text-purple-900'} text-sm`}>
            {autoStart && '🎙️ التسجيل يبدأ تلقائياً • '}
            {useCloudflareR2 
              ? '☁️ يتم الرفع إلى Cloudflare R2 (تخزين اقتصادي)'
              : '📦 يتم الحفظ في Base44 Storage'
            }
            {r2Status.message && ` • ${r2Status.message}`}
          </AlertDescription>
        </Alert>

        {/* Resource Optimization Info */}
        {isRecording && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            💡 <strong>تحسين الموارد:</strong> يتم حفظ البيانات تلقائياً كل ثانية لتقليل استهلاك الذاكرة
          </div>
        )}
      </CardContent>
    </Card>
  );
}