import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
// @ts-ignore
import { PerformanceMetrics as PerformanceMetricsType } from "@/types/detection";

interface PerformanceMetricsProps {
  metrics: PerformanceMetricsType;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMemory = (gb: number) => {
    if (gb < 1) {
      return `${(gb * 1024).toFixed(0)}MB`;
    }
    return `${gb.toFixed(1)}GB`;
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <TrendingUp className="mr-2 text-primary" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">CPU Usage</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {metrics.cpu_usage.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={metrics.cpu_usage} 
              className="h-2"
            />
          </div>
          
          {/* Memory Usage */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Memory Usage</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatMemory(metrics.memory_usage_gb)}
              </span>
            </div>
            <Progress 
              value={metrics.memory_usage_percent} 
              className="h-2"
            />
          </div>
          
          {/* GPU Usage */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">GPU Usage</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {metrics.gpu_usage.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={metrics.gpu_usage} 
              className="h-2"
            />
          </div>
        </div>
        
        {/* Additional Metrics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">Model Size</p>
            <p className="font-semibold">
              {metrics.model_name ? "23.5MB" : "N/A"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Total Processed</p>
            <p className="font-semibold">
              {metrics.total_detections || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Session Time</p>
            <p className="font-semibold">
              {formatTime(metrics.session_duration || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">FPS</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {metrics.fps.toFixed(1)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
