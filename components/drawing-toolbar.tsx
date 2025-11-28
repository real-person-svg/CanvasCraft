"use client";

import {
  MousePointer2,
  Hand,
  Pen,
  Square,
  Circle,
  Image as Images,
  ArrowRight,
  Type,
  Minus,
  Grid3X3,
  Magnet,
  Eraser,
  Download,
  FilePlus,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/canvas-store";
import { ColorPicker } from "./color-picker";
import { StrokeWidthPicker } from "./stroke-width-picker";
import { ThemeToggle } from "./theme-toggle";
import { importJSON } from "@/lib/utils";
import { toast } from "sonner";

const tools = [
  { id: "select", icon: MousePointer2, label: "选择 (V)" },
  { id: "hand", icon: Hand, label: "拖拽 (H)" },
  { id: "pen", icon: Pen, label: "画笔 (P)" },
  { id: "rectangle", icon: Square, label: "矩形 (R)" },
  { id: "circle", icon: Circle, label: "圆形 (C)" },
  { id: "arrow", icon: ArrowRight, label: "箭头 (A)" },
  { id: "line", icon: Minus, label: "线条 (L)" },
  { id: "text", icon: Type, label: "文本 (T)" },
  { id: "image", icon: Images, label: "图片 (I)" },
  { id: "eraser", icon: Eraser, label: "橡皮擦 (E)" },
] as const;

export function DrawingToolbar() {
  const {
    tool,
    setTool,
    showGrid,
    setShowGrid,
    importImage,
    snapEnabled,
    setSnapEnabled,
    exportToJSON,
    additionalImportFromJSON,
    overwriteImportFromJSON,
  } = useCanvasStore();

  const handleImagesClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              // 计算合适的尺寸，保持纵横比
              const maxWidth = 400;
              const maxHeight = 300;
              let width = img.width;
              let height = img.height;

              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }

              // 默认位置在画布中心
              const centerX = (window.innerWidth - width) / 2;
              const centerY = (window.innerHeight - height) / 2;

              importImage(
                event.target?.result as string,
                centerX,
                centerY,
                width,
                height
              );
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
          toast.success("导入图片成功", { closeButton: true });
        } catch (error) {
          toast.error("导入图片失败" + (error as Error).message, {
            closeButton: true,
          });
        }
      }
    };
    input.click();
  };

  return (
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-2 shadow-lg">
      {tools.map((toolItem) => (
        <Button
          key={toolItem.id}
          variant={
            tool !== "image" && tool === toolItem.id ? "default" : "ghost"
          }
          size="sm"
          onClick={() => {
            setTool(toolItem.id);
            if (toolItem.id === "image") {
              handleImagesClick();
            }
          }}
          title={toolItem.label}
          className="h-8 w-8 p-0"
        >
          <toolItem.icon className="h-4 w-4" />
        </Button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      <ColorPicker />
      <StrokeWidthPicker />

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant={showGrid ? "default" : "ghost"}
        size="sm"
        onClick={() => setShowGrid(!showGrid)}
        title="网格切换 (Ctrl+')"
        className="h-8 w-8 p-0"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />
      <ThemeToggle />

      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant={snapEnabled ? "default" : "ghost"}
        size="sm"
        onClick={() => setSnapEnabled(!snapEnabled)}
        title="吸附选择 (Ctrl+S)"
        className="h-8 w-8 p-0"
      >
        <Magnet className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToJSON()}
        title="导出"
        className="h-8 w-8 p-0"
      >
        <Download className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => importJSON(additionalImportFromJSON)}
        title="追加导入"
        className="h-8 w-8 p-0"
      >
        <FilePlus className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast("覆盖导入后，将清空原有画布，确认导入吗？", {
            action: {
              label: "确认",
              onClick: () => importJSON(overwriteImportFromJSON),
            },
          })
        }
        title="覆盖导入"
        className="h-8 w-8 p-0"
      >
        <FileDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
