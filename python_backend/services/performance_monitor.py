import psutil
import time
from typing import Dict, Any

class PerformanceMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.frame_count = 0
        self.last_fps_update = time.time()
        self.fps = 0.0

    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current system performance metrics"""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=None)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_gb = memory.used / (1024**3)
        
        # GPU usage (if available)
        gpu_percent = 0
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu_percent = gpus[0].load * 100
        except ImportError:
            # GPUtil not available, GPU metrics not supported
            pass
        
        # Calculate FPS
        current_time = time.time()
        self.frame_count += 1
        
        if current_time - self.last_fps_update >= 1.0:
            self.fps = self.frame_count / (current_time - self.last_fps_update)
            self.frame_count = 0
            self.last_fps_update = current_time
        
        return {
            "cpu_usage": round(cpu_percent, 1),
            "memory_usage_percent": round(memory_percent, 1), 
            "memory_usage_gb": round(memory_used_gb, 2),
            "gpu_usage": round(gpu_percent, 1),
            "fps": round(self.fps, 1),
            "uptime": round(current_time - self.start_time, 1)
        }

    def reset_fps_counter(self):
        """Reset FPS counter"""
        self.frame_count = 0
        self.last_fps_update = time.time()
