import { useState, useCallback } from "react";
import { Camera, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { CameraFeed } from "@/components/camera-feed";
import { ControlPanel } from "@/components/control-panel";
import { PerformanceMetrics } from "@/components/performance-metrics";
import { ThemeToggle } from "@/components/theme-toggle";
import { DetectionConfig } from "@/types/detection";

export default function WasteClassification() {
  const { toast } = useToast();
  const {
    isConnected,
    detections,
    performanceMetrics,
    sessionStatus,
    processFrame,
    captureImage,
    sendMessage
  } = useWebSocket();

  const [config, setConfig] = useState<DetectionConfig>({
    confidence_threshold: 0.5,
    iou_threshold: 0.45,
    enabled_classes: ["botol_kaca", "botol_kaleng", "botol_plastik"]
  });

  const handleFrameCapture = useCallback((frameData: string) => {
    if (isConnected) {
      processFrame(frameData);
    }
  }, [isConnected, processFrame]);

  const handleImageCapture = useCallback((frameData: string) => {
    if (isConnected) {
      captureImage(frameData);
      toast({
        title: "Image Captured",
        description: "Image saved successfully with detection metadata.",
      });
    }
  }, [isConnected, captureImage, toast]);

  const handleConfigChange = useCallback(async (newConfig: DetectionConfig) => {
    try {
      const response = await fetch('http://192.168.8.186:8000/api/update-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        setConfig(newConfig);
        toast({
          title: "Configuration Updated",
          description: "Detection settings applied successfully.",
        });
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: "Failed to update detection settings.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleModelUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://192.168.8.186:8000/api/upload-model', {
        method: 'POST',
        body: formData,
      });


      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Model Uploaded",
          description: `${result.model_name} (${result.model_size}) uploaded successfully.`,
        });
      } else {
        const errorText = await response.text(); // atau .json() kalau kamu yakin respon error JSON
        throw new Error(errorText || 'Failed to upload model');
      }

    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload model file.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleClearDetections = useCallback(() => {
    sendMessage({ type: "clear_detections" });
    toast({
      title: "Detections Cleared",
      description: "Detection history has been cleared.",
    });
  }, [sendMessage, toast]);

  const handleExport = useCallback(async (format: 'json' | 'csv' | 'images') => {
    try {
      const response = await fetch(`http://192.168.8.186:8000/api/export/${format}`);
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Export Successful",
          description: `Data exported as ${format.toUpperCase()} format.`,
        });
      } else {
        throw new Error(`Failed to export ${format}`);
      }
    } catch (error) {
      toast({
        title: "Export Error",
        description: `Failed to export data as ${format.toUpperCase()}.`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const cameraStats = {
    detectionCount: detections.length,
    inferenceTime: performanceMetrics.inference_time ? `${performanceMetrics.inference_time.toFixed(0)}ms` : "0ms",
    fps: performanceMetrics.fps,
    confidence: detections.length > 0 ? 
      detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length : 0
  };

  const sessionStats = {
    totalDetections: sessionStatus.totalDetections,
    capturedImages: sessionStatus.capturedImages,
    sessionDuration: performanceMetrics.session_duration || 0
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Camera className="text-primary text-2xl" />
            <h1 className="text-xl font-bold">AI Vision Camera Interface</h1>
            <span className="text-sm text-muted-foreground">Waste Classification System</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Camera Feed Section */}
          <div className="lg:col-span-3 space-y-6">
            <CameraFeed
              onFrameCapture={handleFrameCapture}
              onImageCapture={handleImageCapture}
              detections={detections}
              stats={cameraStats}
            />
            
            {/* Performance Metrics Below Camera */}
            <PerformanceMetrics metrics={performanceMetrics} />
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <ControlPanel
              config={config}
              onConfigChange={handleConfigChange}
              onModelUpload={handleModelUpload}
              detections={detections}
              onClearDetections={handleClearDetections}
              onExport={handleExport}
              sessionStats={sessionStats}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
