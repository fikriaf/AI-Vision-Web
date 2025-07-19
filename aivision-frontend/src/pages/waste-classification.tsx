import { useState, useCallback } from "react";
import { Camera, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { CameraFeed } from "@/components/camera-feed";
import { ControlPanel } from "@/components/control-panel";
import { PerformanceMetrics } from "@/components/performance-metrics";
import { ThemeToggle } from "@/components/theme-toggle";
import { DetectionConfig } from "@/types/detection";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react"

export default function WasteClassification() {
  const [urlInput, setUrlInput] = useState("ws://localhost:8000");
  const [wsUrl, setWsUrl] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleConnect = () => {
    setWsUrl(urlInput);
    console.log(wsUrl)
  };

  
  const { toast } = useToast();
  const {
    isConnected,
    detections,
    performanceMetrics,
    sessionStatus,
    processFrame,
    captureImage,
    sendMessage
  } = useWebSocket(wsUrl);

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
      const response = await fetch('/api/update-config', {
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

      const response = await fetch('/api/upload-model', {
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
      const response = await fetch(`/api/export/${format}`);
      
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

      <main className="max-w-6xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Camera Feed Section */}
          <div className="lg:col-span-2 ml-[-4rem] space-y-6">
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
            <div className="w-[27rem] mb-3 rounded-lg bg-surface p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold ml-1">WebSocket Server</h2>
                <button onClick={() => setIsOpen(!isOpen)} className="text-sm">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Input with collapse animation */}
              <div
                className={cn(
                  "grid transition-all duration-300 overflow-hidden",
                  isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="ws://localhost:8000"
                      className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 focus:border-black focus:ring-1 focus:ring-neutral-700 outline-none transition"
                    />
                    <button
                      onClick={handleConnect}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
