"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas-store";
import { generateImage } from "@/lib/ai-image-server";

export const AIPanel = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { importImage, stagePos, stageScale } = useCanvasStore();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);

  if (isOpen === false) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入图片描述");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      // 调用AI生成图片
      const imageUrl = await generateImage(prompt, width, height); // 使用模拟数据进行测试
      if (imageUrl) {
        // 计算画布中心位置
        const canvasX = -stagePos.x / stageScale;
        const canvasY = -stagePos.y / stageScale;
        const centerX = canvasX + window.innerWidth / 2 / stageScale;
        const centerY = canvasY + window.innerHeight / 2 / stageScale;

        // 添加图片到画布
        importImage(
          imageUrl,
          centerX - width / 2,
          centerY - height / 2,
          width,
          height
        );
      }
    } catch (err) {
      console.error("图片生成失败:", err);
      setError("图片生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setError("");
    onClose();
  };

  return (
    <div className="absolute top-20 right-4 w-64 bg-card border border-border rounded-lg shadow-lg p-4 z-10">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">AI 图片生成</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 py-4">
        {/* 图片描述输入 */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-xs">
            图片描述
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的图片内容..."
            className="min-h-[100px] textarea"
            style={{ minHeight: "100px" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">图片尺寸</Label>
          <span className="text-xs text-muted-foreground">
            {width} × {height} px
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width" className="text-xs">
              宽度
            </Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) =>
                setWidth(
                  Math.min(Math.max(128, parseInt(e.target.value) || 128), 1024)
                )
              }
              min="128"
              max="1024"
              step="64"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-xs">
              高度
            </Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) =>
                setHeight(
                  Math.min(Math.max(128, parseInt(e.target.value) || 128), 1024)
                )
              }
              min="128"
              max="1024"
              step="64"
            />
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && <div className="text-sm text-destructive">{error}</div>}

      {/* 生成中状态 */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-sm">正在生成图片...</p>
        </div>
      )}
      <div className="flex gap-1 mb-4 mt-4">
        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          生成图片
        </Button>
      </div>
    </div>
  );
};

// 默认导出一个空组件，以便在主应用中使用
const DefaultAIPanel = () => null;
export default DefaultAIPanel;
