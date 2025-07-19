import asyncio
import json
import os
import time
from typing import Dict, List, Optional
import aiofiles
import cv2
import numpy as np
import psutil
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pathlib import Path

from models.yolo_detector import YOLODetector
from services.websocket_manager import WebSocketManager
from services.performance_monitor import PerformanceMonitor
from utils.file_handler import FileHandler

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi.responses import PlainTextResponse

app = FastAPI(title="AI Vision Waste Classification API")

class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int = 200 * 1024 * 1024):  # 200 MB
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_upload_size:
            return PlainTextResponse("File too large", status_code=413)
        return await call_next(request)

# Tambahkan middleware pembatas ukuran
app.add_middleware(LimitUploadSizeMiddleware)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
websocket_manager = WebSocketManager()
performance_monitor = PerformanceMonitor()
file_handler = FileHandler()
yolo_detector: Optional[YOLODetector] = None

# Create directories
UPLOAD_DIR = Path("uploads")
MODELS_DIR = Path("models")
EXPORTS_DIR = Path("exports")

for directory in [UPLOAD_DIR, MODELS_DIR, EXPORTS_DIR]:
    directory.mkdir(exist_ok=True)

# Global state
current_session = {
    "start_time": None,
    "total_detections": 0,
    "captured_images": 0,
    "model_name": None,
    "detections": [],
    "performance_metrics": {
        "cpu_usage": 0,
        "memory_usage": 0,
        "gpu_usage": 0,
        "inference_time": 0,
        "fps": 0
    }
}

@app.post("/api/upload-model")
async def upload_model(file: UploadFile = File(...)):
    """Upload a YOLO model (.pt file)"""
    global yolo_detector
    
    if not file.filename.endswith('.pt'):
        raise HTTPException(status_code=400, detail="Only .pt files are allowed")
    
    try:
        # Save uploaded file
        file_path = MODELS_DIR / file.filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Initialize YOLO detector with new model
        yolo_detector = YOLODetector(str(file_path))
        
        # Update current session
        current_session["model_name"] = file.filename
        current_session["start_time"] = time.time()
        current_session["total_detections"] = 0
        current_session["captured_images"] = 0
        current_session["detections"] = []
        
        # Notify all connected clients
        await websocket_manager.broadcast_message({
            "type": "model_uploaded",
            "model_name": file.filename,
            "model_size": f"{len(content) / (1024*1024):.1f}MB"
        })
        
        return JSONResponse(content={
            "message": "Model uploaded successfully",
            "model_name": file.filename,
            "model_size": f"{len(content) / (1024*1024):.1f}MB"
        })
        
    except Exception as e:
        print(f"[UPLOAD ERROR] {str(e)}")  # 👈 Tambahkan log ini!
        raise HTTPException(status_code=500, detail=f"Failed to upload model: {str(e)}")


@app.post("/api/update-config")
async def update_config(config: dict):
    """Update detection configuration"""
    global yolo_detector
    
    if not yolo_detector:
        raise HTTPException(status_code=400, detail="No model loaded")
    
    try:
        confidence_threshold = config.get("confidence_threshold", 0.5)
        iou_threshold = config.get("iou_threshold", 0.45)
        enabled_classes = config.get("enabled_classes", ["botol_kaca", "botol_kaleng", "botol_plastik"])
        
        yolo_detector.update_config(confidence_threshold, iou_threshold, enabled_classes)
        
        # Notify all connected clients
        await websocket_manager.broadcast_message({
            "type": "config_updated",
            "config": config
        })
        
        return JSONResponse(content={"message": "Configuration updated successfully"})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@app.get("/api/export/{format}")
async def export_data(format: str):
    """Export detection data in specified format (json/csv)"""
    try:
        if format.lower() == "json":
            export_data = {
                "session_info": {
                    "start_time": current_session["start_time"],
                    "duration": time.time() - current_session["start_time"] if current_session["start_time"] else 0,
                    "model_name": current_session["model_name"],
                    "total_detections": current_session["total_detections"],
                    "captured_images": current_session["captured_images"]
                },
                "detections": current_session["detections"],
                "performance_metrics": current_session["performance_metrics"]
            }
            
            file_path = EXPORTS_DIR / f"detections_{int(time.time())}.json"
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(json.dumps(export_data, indent=2))
                
        elif format.lower() == "csv":
            import pandas as pd
            
            df = pd.DataFrame(current_session["detections"])
            file_path = EXPORTS_DIR / f"detections_{int(time.time())}.csv"
            df.to_csv(file_path, index=False)
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use 'json' or 'csv'")
        
        return JSONResponse(content={
            "message": f"Data exported successfully",
            "file_path": str(file_path),
            "format": format
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    print("WebSocket connection received")
    await websocket_manager.connect(websocket)
    
    try:
        # Send initial status
        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "model_loaded": yolo_detector is not None,
            "model_name": current_session.get("model_name")
        })
        
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            if data["type"] == "process_frame":
                await process_frame(websocket, data["frame_data"])
            elif data["type"] == "capture_image":
                await capture_image(websocket, data["frame_data"])
            elif data["type"] == "get_performance":
                await send_performance_metrics(websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)

async def process_frame(websocket: WebSocket, frame_data: str):
    """Process a single frame for object detection"""
    global yolo_detector
    
    if not yolo_detector:
        await websocket.send_json({
            "type": "error",
            "message": "No model loaded"
        })
        return
    
    try:
        # Decode base64 frame
        import base64
        frame_bytes = base64.b64decode(frame_data.split(',')[1])
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Measure inference time
        start_time = time.time()
        detections = yolo_detector.detect(frame)
        inference_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Update session statistics
        current_session["total_detections"] += len(detections)
        current_session["performance_metrics"]["inference_time"] = inference_time
        
        # Store detections
        for detection in detections:
            detection["timestamp"] = time.time()
            current_session["detections"].append(detection)
        
        # Send results
        await websocket.send_json({
            "type": "detection_results",
            "detections": detections,
            "inference_time": inference_time,
            "total_detections": current_session["total_detections"]
        })
        
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to process frame: {str(e)}"
        })

async def capture_image(websocket: WebSocket, frame_data: str):
    """Capture and save an image with detection metadata"""
    try:
        # Decode and save image
        import base64
        frame_bytes = base64.b64decode(frame_data.split(',')[1])
        
        timestamp = int(time.time())
        image_path = UPLOAD_DIR / f"capture_{timestamp}.jpg"
        
        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(frame_bytes)
        
        current_session["captured_images"] += 1
        
        await websocket.send_json({
            "type": "image_captured",
            "file_path": str(image_path),
            "captured_images": current_session["captured_images"]
        })
        
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to capture image: {str(e)}"
        })

async def send_performance_metrics(websocket: WebSocket):
    """Send current performance metrics"""
    try:
        metrics = performance_monitor.get_current_metrics()
        current_session["performance_metrics"].update(metrics)
        
        # Calculate session duration
        session_duration = 0
        if current_session["start_time"]:
            session_duration = time.time() - current_session["start_time"]
        
        await websocket.send_json({
            "type": "performance_metrics",
            "metrics": {
                **metrics,
                "session_duration": session_duration,
                "total_detections": current_session["total_detections"],
                "captured_images": current_session["captured_images"],
                "model_name": current_session["model_name"]
            }
        })
        
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Failed to get performance metrics: {str(e)}"
        })

# Background task to broadcast performance metrics
async def performance_broadcast():
    """Broadcast performance metrics periodically"""
    while True:
        if websocket_manager.active_connections:
            try:
                metrics = performance_monitor.get_current_metrics()
                current_session["performance_metrics"].update(metrics)
                
                await websocket_manager.broadcast_message({
                    "type": "performance_update",
                    "metrics": metrics
                })
            except Exception as e:
                print(f"Error broadcasting performance metrics: {e}")
        
        await asyncio.sleep(1)  # Broadcast every second

@app.on_event("startup")
async def startup_event():
    """Start background tasks & load default model if available"""
    global yolo_detector
    
    asyncio.create_task(performance_broadcast())

    default_model_path = MODELS_DIR / "best.pt"
    if default_model_path.exists():
        try:
            yolo_detector = YOLODetector(str(default_model_path))
            current_session["model_name"] = "b"
            current_session["start_time"] = time.time()
            print("[STARTUP] Default model 'b' loaded successfully.")
        except Exception as e:
            print(f"[STARTUP ERROR] Failed to load default model: {e}")
    else:
        print("[STARTUP] No default model found at 'models/b'")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
