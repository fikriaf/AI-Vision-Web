import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Camera, Loader2, Video } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
// @ts-ignore
import { Detection } from "@/types/detection";

interface CameraFeedProps {
  onFrameCapture?: (frameData: string) => void;
  onImageCapture?: (frameData: string) => void;
  detections?: Detection[];
  stats?: {
    detectionCount: number;
    inferenceTime: string;
    fps: number;
    confidence: number;
  };
}

export function CameraFeed({ onFrameCapture, onImageCapture, detections = [], stats }: CameraFeedProps) {
  const { 
    videoRef, 
    canvasRef, 
    isActive, 
    isLoading, 
    error,
    availableCameras,
    selectedCameraId,
    startCamera, 
    stopCamera,
    switchCamera,
    captureFrame, 
    drawDetections 
  } = useCamera();
  
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start processing frames when camera is active
  useEffect(() => {
    if (isActive && onFrameCapture) {
      frameIntervalRef.current = setInterval(() => {
        const frameData = captureFrame();
        if (frameData) {
          onFrameCapture(frameData);
        }
      }, 500); // Process 10 FPS
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, onFrameCapture, captureFrame]);

  // Draw detections when they update
  useEffect(() => {
    if (detections.length > 0) {
      drawDetections(detections);
    }
  }, [detections, drawDetections]);

  const handleCapture = () => {
    const frameData = captureFrame();
    if (frameData && onImageCapture) {
      onImageCapture(frameData);
    }
  };

  return (
    <Card className="bg-surface border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <Camera className="mr-2 text-primary" />
            Live Camera Feed
          </h2>
          <div className="flex items-center space-x-3">
            {/* Camera Selection */}
            {availableCameras.length > 1 && (
              <Select value={selectedCameraId} onValueChange={switchCamera}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select Camera">
                    <div className="flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      <span className="truncate">
                        {availableCameras.find(cam => cam.deviceId === selectedCameraId)?.label || "Camera"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableCameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {!isActive ? (
              <Button 
                onClick={() => startCamera()} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Start
              </Button>
            ) : (
              <Button 
                onClick={stopCamera} 
                className="bg-red-600 hover:bg-red-700"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            )}
            <Button 
              onClick={handleCapture} 
              disabled={!isActive}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="h-4 w-4 mr-1" />
              Capture
            </Button>
          </div>
        </div>
      </div>

      <div className="relative bg-black aspect-video">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
        
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 text-primary mb-4 mx-auto animate-spin" />
              <p className="text-lg">Initializing Camera...</p>
              <p className="text-sm text-gray-300">Please allow camera access</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
              <p className="text-lg font-semibold">Camera Access Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button 
                onClick={() => startCamera()} 
                className="mt-4 bg-primary hover:bg-primary/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-muted">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats?.detectionCount || 0}
            </p>
            <p className="text-xs text-muted-foreground">Objects Detected</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.inferenceTime || "0ms"}
            </p>
            <p className="text-xs text-muted-foreground">Inference Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats?.fps || 0}
            </p>
            <p className="text-xs text-muted-foreground">FPS</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats?.confidence ? stats.confidence.toFixed(2) : "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
