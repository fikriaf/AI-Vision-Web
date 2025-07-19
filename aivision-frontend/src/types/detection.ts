export interface Detection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  color: [number, number, number]; // RGB
  timestamp?: number;
}

export interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage_percent: number;
  memory_usage_gb: number;
  gpu_usage: number;
  fps: number;
  inference_time?: number;
  uptime?: number;
  session_duration?: number;
  total_detections?: number;
  captured_images?: number;
  model_name?: string;
}

export interface SessionStatus {
  isActive: boolean;
  modelLoaded: boolean;
  modelName?: string;
  startTime?: number;
  totalDetections: number;
  capturedImages: number;
}

export interface WasteClass {
  name: string;
  displayName: string;
  color: string;
  enabled: boolean;
}

export interface DetectionConfig {
  confidence_threshold: number;
  iou_threshold: number;
  enabled_classes: string[];
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}
