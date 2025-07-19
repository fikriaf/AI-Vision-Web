import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings, List, Download, Check, FileCode, FileSpreadsheet, Images, Trash2 } from "lucide-react";
// @ts-ignore
import { Detection, WasteClass, DetectionConfig } from "@/types/detection";

interface ControlPanelProps {
  config: DetectionConfig;
  onConfigChange: (config: DetectionConfig) => void;
  onModelUpload: (file: File) => void;
  detections: Detection[];
  onClearDetections: () => void;
  onExport: (format: 'json' | 'csv' | 'images') => void;
  sessionStats: {
    totalDetections: number;
    capturedImages: number;
    sessionDuration: number;
  };
}

const wasteClasses: WasteClass[] = [
  { name: "botol_kaca", displayName: "Plastic (Plastik)", color: "bg-green-500", enabled: true },
  { name: "botol_kaleng", displayName: "Glass (Kaca)", color: "bg-blue-500", enabled: true },
  { name: "botol_plastik", displayName: "Cans (Kaleng)", color: "bg-yellow-500", enabled: true },
];

export function ControlPanel({ 
  config, 
  onConfigChange, 
  onModelUpload, 
  detections, 
  onClearDetections,
  onExport,
  sessionStats
}: ControlPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfidenceChange = (value: number[]) => {
    setLocalConfig(prev => ({ ...prev, confidence_threshold: value[0] }));
  };

  const handleIouChange = (value: number[]) => {
    setLocalConfig(prev => ({ ...prev, iou_threshold: value[0] }));
  };

  const handleClassToggle = (className: string, enabled: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      enabled_classes: enabled 
        ? [...prev.enabled_classes, className]
        : prev.enabled_classes.filter(c => c !== className)
    }));
  };

  const handleApplyConfig = () => {
    onConfigChange(localConfig);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.pt')) {
      onModelUpload(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const recentDetections = detections.slice(-10).reverse();

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* LEFT SIDE: Upload + Configuration */}
      <div className="flex-1 space-y-6">
        {/* Model Upload */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Settings className="mr-2 text-primary" />
              Model Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label htmlFor="modelUpload" className="block text-sm font-medium">
                Upload YOLO Model (.pt)
              </Label>
              <Input
                id="modelUpload"
                type="file"
                accept=".pt"
                onChange={handleFileUpload}
                className="file:bg-primary file:text-primary-foreground file:border-0 file:rounded file:px-3 file:py-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Settings className="mr-2 text-primary" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confidence Threshold */}
            <div>
              <Label className="block text-sm font-medium mb-2">
                Confidence Threshold
              </Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localConfig.confidence_threshold]}
                  onValueChange={handleConfidenceChange}
                  max={1}
                  min={0.1}
                  step={0.05}
                  className="flex-1"
                />
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded min-w-[3rem]">
                  {localConfig.confidence_threshold.toFixed(2)}
                </span>
              </div>
            </div>

            {/* IoU Threshold */}
            <div>
              <Label className="block text-sm font-medium mb-2">
                IoU Threshold
              </Label>
              <div className="flex items-center space-x-3">
                <Slider
                  value={[localConfig.iou_threshold]}
                  onValueChange={handleIouChange}
                  max={1}
                  min={0.1}
                  step={0.05}
                  className="flex-1"
                />
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded min-w-[3rem]">
                  {localConfig.iou_threshold.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Detection Classes */}
            <div>
              <Label className="block text-sm font-medium mb-3">
                Detection Classes
              </Label>
              <div className="space-y-2">
                {wasteClasses.map((wasteClass) => (
                  <div key={wasteClass.name} className="flex items-center space-x-3">
                    <Checkbox
                      id={wasteClass.name}
                      checked={localConfig.enabled_classes.includes(wasteClass.name)}
                      onCheckedChange={(checked: any) =>
                        handleClassToggle(wasteClass.name, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={wasteClass.name}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <div className={`w-3 h-3 ${wasteClass.color} rounded-full`} />
                      <span>{wasteClass.displayName}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleApplyConfig}
              className="w-full bg-primary hover:bg-blue-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT SIDE: Real-time Detection + Export */}
      <div className="flex-1 space-y-6">
        {/* Real-time Detection Results */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <List className="mr-2 text-primary" />
              Live Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentDetections.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No detections yet</p>
              ) : (
                recentDetections.map((detection, index) => (
                  <div
                    key={index}
                    className="bg-muted rounded-lg p-3 border-l-4"
                    style={{
                      borderLeftColor: detection.class_name === 'plastic' ? '#10b981' :
                        detection.class_name === 'glass' ? '#3b82f6' :
                          detection.class_name === 'cans' ? '#eab308' : '#f97316'
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {detection.class_name.charAt(0).toUpperCase() + detection.class_name.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {detection.timestamp ? new Date(detection.timestamp * 1000).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <div className="text-sm mb-2">
                      Confidence: {(detection.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Box: [{detection.bbox.join(', ')}]
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              onClick={onClearDetections}
              variant="secondary"
              className="w-full mt-3"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </CardContent>
        </Card>

        {/* Export Controls */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Download className="mr-2 text-primary" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                onClick={() => onExport('json')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <FileCode className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>

              <Button
                onClick={() => onExport('csv')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>

              <Button
                onClick={() => onExport('images')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Images className="h-4 w-4 mr-2" />
                Export Images
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Detections:</span>
                  <span className="font-medium">{sessionStats.totalDetections}</span>
                </div>
                <div className="flex justify-between">
                  <span>Captured Images:</span>
                  <span className="font-medium">{sessionStats.capturedImages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Session Duration:</span>
                  <span className="font-medium">{formatTime(sessionStats.sessionDuration)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

}
