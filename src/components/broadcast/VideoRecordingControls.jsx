import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Circle, Square, Pause, Play, Loader2, CheckCircle, Monitor, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

export default function VideoRecordingControls({ broadcastId, broadcastTitle, autoStart = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingSource, setRecordingSource] = useState("camera"); // camera or screen
  const [mediaStream, setMediaStream] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoPreviewRef = useRef(null);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      
      let stream;
      if (recordingSource === "camera") {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: true 
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { width: 1920, height: 1080 },
          audio: true 
        });
      }

      setMediaStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await saveRecording();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error("Error starting video recording:", error);
      alert("❌ فشل بدء تسجيل الفيديو: " + error.message);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
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
    }
  };

  const saveRecording = async () => {
    try {
      setUploadProgress(10);
      
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileSize = (blob.size / (1024 * 1024)).toFixed(2);
      const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });

      setUploadProgress(30);

      const uploadResponse = await base44.integrations.Core.UploadPrivateFile({ file });
      
      setUploadProgress(70);
      
      if (!uploadResponse || !uploadResponse.file_uri) {
        throw new Error("فشل رفع الفيديو");
      }

      setUploadProgress(90);

      const user = await base44.auth.me();

      await base44.entities.Recording.create({
        broadcast_id: broadcastId,
        title: `${broadcastTitle} - فيديو`,
        broadcaster_name: user.full_name || user.email,
        broadcaster_id: user.id,
        file_uri: uploadResponse.file_uri,
        file_size_mb: parseFloat(fileSize),
        recorded_at: new Date().toISOString(),
        has_video: true
      });

      setUploadProgress(100);
      setIsProcessing(false);
      alert(`✅ تم حفظ تسجيل الفيديو بنجاح! (${fileSize} MB)`);
      
    } catch (error) {
      console.error("Error saving video recording:", error);
      setIsProcessing(false);
      alert("❌ فشل حفظ تسجيل الفيديو: " + error.message);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  return (
    <Card className="border-2 border-blue-100">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>مصدر التسجيل</Label>
          <Select value={recordingSource} onValueChange={setRecordingSource} disabled={isRecording}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="camera">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  الكاميرا
                </div>
              </SelectItem>
              <SelectItem value="screen">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  الشاشة
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isRecording && (
          <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
            <video ref={videoPreviewRef} autoPlay muted className="w-full h-full object-cover" />
          </div>
        )}

        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 font-semibold">جارٍ رفع الفيديو...</span>
              <span className="text-blue-600 font-bold">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              variant="outline"
              className="gap-2 border-2 border-red-500 text-red-600 hover:bg-red-50"
              disabled={isProcessing}
            >
              <Circle className="w-4 h-4 fill-current" />
              بدء تسجيل الفيديو
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button onClick={pauseRecording} variant="outline" className="gap-2 border-2 border-yellow-500">
                  <Pause className="w-4 h-4" />
                  إيقاف مؤقت
                </Button>
              ) : (
                <Button onClick={resumeRecording} variant="outline" className="gap-2 border-2 border-green-500">
                  <Play className="w-4 h-4" />
                  استئناف
                </Button>
              )}
              
              <Button onClick={stopRecording} variant="outline" className="gap-2 border-2 border-red-500">
                <Square className="w-4 h-4 fill-current" />
                إيقاف وحفظ
              </Button>
            </>
          )}
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            📹 تسجيل الفيديو متاح - اختر الكاميرا أو الشاشة
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}