import cv2
import numpy as np
from typing import List, Dict, Any
from ultralytics import YOLO


class YOLODetector:
    def __init__(self, model_path: str):
        """Initialize YOLO detector with model path"""
        print(f"[YOLODetector] Loading model: {model_path}")
        self.model = YOLO(model_path)

        self.confidence_threshold = 0.5
        self.iou_threshold = 0.45
        self.enabled_classes = ["botol_kaca", "botol_kaleng", "botol_plastik"]
        
        # Class mapping for waste types
        self.class_mapping = {
            0: "botol_kaca",
            1: "botol_kaleng", 
            2: "botol_plastik",
        }
        
        # Colors for each class (RGB)
        self.class_colors = {
            "botol_kaca": [0, 255, 0],    # Green
            "botol_kaleng": [255, 0, 0],      # Blue  
            "botol_plastik": [0, 255, 255]     # Yellow
        }
    
    def update_config(self, confidence_threshold: float, iou_threshold: float, enabled_classes: List[str]):
        """Update detection configuration"""
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.enabled_classes = enabled_classes
    
    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in frame and return results"""
        try:
            # Run inference
            results = self.model(frame, conf=self.confidence_threshold, iou=self.iou_threshold)
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        # Get detection data
                        box = boxes.xyxy[i].cpu().numpy()
                        confidence = float(boxes.conf[i].cpu().numpy())
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        # Map class ID to class name
                        class_name = self.class_mapping.get(class_id, f"class_{class_id}")
                        
                        # Filter by enabled classes
                        if class_name not in self.enabled_classes:
                            continue
                        
                        # Convert box coordinates
                        x1, y1, x2, y2 = box
                        bbox = [int(x1), int(y1), int(x2), int(y2)]
                        
                        detection = {
                            "class_name": class_name,
                            "confidence": round(confidence, 3),
                            "bbox": bbox,
                            "color": self.class_colors.get(class_name, [255, 255, 255])
                        }
                        
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            print(f"Detection error: {e}")
            return []
    
    def draw_detections(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """Draw detection boxes and labels on frame"""
        annotated_frame = frame.copy()
        
        for detection in detections:
            bbox = detection["bbox"]
            class_name = detection["class_name"]
            confidence = detection["confidence"]
            color = detection["color"]
            
            # Draw bounding box
            cv2.rectangle(annotated_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            # Background for label
            cv2.rectangle(annotated_frame, 
                         (bbox[0], bbox[1] - label_size[1] - 10),
                         (bbox[0] + label_size[0], bbox[1]), 
                         color, -1)
            
            # Text
            cv2.putText(annotated_frame, label, 
                       (bbox[0], bbox[1] - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        return annotated_frame
