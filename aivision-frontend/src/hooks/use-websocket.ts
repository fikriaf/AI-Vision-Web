import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import { WebSocketMessage, Detection, PerformanceMetrics } from "@/types/detection";

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    cpu_usage: 0,
    memory_usage_percent: 0,
    memory_usage_gb: 0,
    gpu_usage: 0,
    fps: 0
  });
  const [sessionStatus, setSessionStatus] = useState({
    modelLoaded: false,
    modelName: undefined as string | undefined,
    totalDetections: 0,
    capturedImages: 0
  });

  const connect = useCallback(() => {
    const wsUrl = "wss://192.168.1.10:8000/ws";
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };
    
    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case "detection_results":
            setDetections(message.detections || []);
            setSessionStatus(prev => ({
              ...prev,
              totalDetections: message.total_detections || prev.totalDetections
            }));
            break;
            
          case "performance_metrics":
          case "performance_update":
            setPerformanceMetrics(message.metrics || message);
            break;
            
          case "model_uploaded":
            setSessionStatus(prev => ({
              ...prev,
              modelLoaded: true,
              modelName: message.model_name
            }));
            break;
            
          case "image_captured":
            setSessionStatus(prev => ({
              ...prev,
              capturedImages: message.captured_images || prev.capturedImages
            }));
            break;
            
          case "connection_status":
            if (message.model_loaded) {
              setSessionStatus(prev => ({
                ...prev,
                modelLoaded: message.model_loaded,
                modelName: message.model_name
              }));
            }
            break;
            
          case "error":
            console.error("WebSocket error:", message.message);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
    
    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const processFrame = useCallback((frameData: string) => {
    sendMessage({
      type: "process_frame",
      frame_data: frameData
    });
  }, [sendMessage]);

  const captureImage = useCallback((frameData: string) => {
    sendMessage({
      type: "capture_image", 
      frame_data: frameData
    });
  }, [sendMessage]);

  const requestPerformanceMetrics = useCallback(() => {
    sendMessage({
      type: "get_performance"
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    detections,
    performanceMetrics,
    sessionStatus,
    sendMessage,
    processFrame,
    captureImage,
    requestPerformanceMetrics
  };
}
