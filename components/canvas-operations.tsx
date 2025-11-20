"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCanvasStore } from "@/lib/canvas-store";
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
} from "lucide-react";

interface CanvasOperationsProps {
  onClearCanvas?: () => void;
}

export function CanvasOperations({ onClearCanvas }: CanvasOperationsProps) {
  const {
    canUndo,
    canRedo,
    stageScale,
    undo,
    redo,
    clearCanvas,
    fitToScreen,
    resetZoom,
    zoomIn,
    zoomOut,
  } = useCanvasStore();

  const handleClearCanvas = () => {
    if (onClearCanvas) {
      onClearCanvas();
    } else {
      clearCanvas();
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2 shadow-lg">
        {/* 撤销/重置 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            className="h-8 w-8 p-0"
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
            className="h-8 w-8 p-0"
            title="重置 (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 清空画布 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearCanvas}
          className="h-8 w-8 p-0"
          title="清空画布 (Ctrl+Shift+Del)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* 缩放控制 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="h-8 w-8 p-0"
            title="缩小 (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="px-2 text-xs font-mono min-w-[3rem] text-center">
            {Math.round(stageScale * 100)}%
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="h-8 w-8 p-0"
            title="放大 (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 视口控制 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="h-8 w-8 p-0"
            title="重置缩放 (Ctrl+0)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fitToScreen}
            className="h-8 w-8 p-0"
            title="适应屏幕 (Ctrl+1)"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
