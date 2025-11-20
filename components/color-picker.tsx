"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCanvasStore } from "@/lib/canvas-store";
import { Palette } from "lucide-react";

export const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#e03131",
  "#fd7e14",
  "#fab005",
  "#82c91e",
  "#40c057",
  "#15aabf",
  "#339af0",
  "#7950f2",
  "#f783ac",
  "#868e96",
  "#495057",
  "#c92a2a",
  "#d9480f",
  "#e8590c",
  "#5c940d",
  "#2f9e44",
  "#0c8599",
  "#1971c2",
  "#5f3dc4",
  "#d6336c",
  "#6c757d",
];

export function ColorPicker() {
  const { strokeColor, fillColor, setStrokeColor, setFillColor } =
    useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"stroke" | "fill">("stroke");

  const handleColorChange = (color: string) => {
    if (activeTab === "stroke") {
      setStrokeColor(color);
    } else {
      setFillColor(color);
    }
  };

  const currentColor = activeTab === "stroke" ? strokeColor : fillColor;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 relative bg-transparent"
        >
          <Palette className="h-4 w-4" />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border border-background"
            style={{ backgroundColor: currentColor }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded p-1">
            <Button
              variant={activeTab === "stroke" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("stroke")}
              className="flex-1 h-7 text-xs"
            >
              边框
            </Button>
            <Button
              variant={activeTab === "fill" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("fill")}
              className="flex-1 h-7 text-xs"
            >
              填充
            </Button>
          </div>

          {/* 当前颜色展示 */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded border border-border"
              style={{ backgroundColor: currentColor }}
            />
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-8 rounded border border-border cursor-pointer"
            />
          </div>

          {/* 展示可使用的颜色 */}
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* 无填充按钮 */}
          {activeTab === "fill" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleColorChange("transparent")}
              className="w-full h-8 text-xs"
            >
              无填充
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
