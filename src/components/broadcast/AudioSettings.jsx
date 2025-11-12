import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Mic, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AudioSettings({ 
  onDeviceChange, 
  audioStream,
  onSettingsChange 
}) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [gain, setGain] = useState([1.0]);
  const [compression, setCompression] = useState([0.5]);
  const [bass, setBass] = useState([0]);
  const [treble, setTreble] = useState([0]);

  useEffect(() => {
    loadAudioDevices();
  }, []);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({
        gain: gain[0],
        compression: compression[0],
        bass: bass[0],
        treble: treble[0]
      });
    }
  }, [gain, compression, bass, treble]);

  const loadAudioDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error loading audio devices:', error);
    }
  };

  const handleDeviceChange = async (deviceId) => {
    setSelectedDevice(deviceId);
    if (onDeviceChange) {
      await onDeviceChange(deviceId);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="hover:bg-purple-50 border-2 border-purple-200"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات الصوت المتقدمة
          </DialogTitle>
          <DialogDescription>
            تحكم في جودة الصوت وإعدادات الميكروفون
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Device Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              جهاز الميكروفون
            </Label>
            <Select value={selectedDevice} onValueChange={handleDeviceChange}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الميكروفون" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `ميكروفون ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gain Control */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>مستوى الصوت (Gain)</Label>
              <span className="text-sm text-gray-600">{(gain[0] * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={gain}
              onValueChange={setGain}
              min={0.1}
              max={3.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Compression */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>ضغط الصوت (Compression)</Label>
              <span className="text-sm text-gray-600">{(compression[0] * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={compression}
              onValueChange={setCompression}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              يوازن مستويات الصوت تلقائياً
            </p>
          </div>

          {/* EQ - Bass */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>الترددات المنخفضة (Bass)</Label>
              <span className="text-sm text-gray-600">{bass[0] > 0 ? '+' : ''}{bass[0]} dB</span>
            </div>
            <Slider
              value={bass}
              onValueChange={setBass}
              min={-12}
              max={12}
              step={1}
              className="w-full"
            />
          </div>

          {/* EQ - Treble */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>الترددات العالية (Treble)</Label>
              <span className="text-sm text-gray-600">{treble[0] > 0 ? '+' : ''}{treble[0]} dB</span>
            </div>
            <Slider
              value={treble}
              onValueChange={setTreble}
              min={-12}
              max={12}
              step={1}
              className="w-full"
            />
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => {
                setGain([1.0]);
                setCompression([0.5]);
                setBass([0]);
                setTreble([0]);
              }}
              variant="outline"
              className="w-full"
            >
              إعادة تعيين الإعدادات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}