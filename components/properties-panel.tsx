"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCanvasStore } from "@/lib/canvas-store";
import { X, Trash2, Copy } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { Palette } from "lucide-react";
import { PRESET_COLORS } from "@/components/color-picker";
import type { ImageFilter } from "@/types/canvas";

// 修改 ColorPicker 组件以支持属性面板中的颜色修改
export function ColorPickerForProperties({
  onStrokeColorChange,
  onFillColorChange,
  initialColor,
}: {
  onStrokeColorChange: (color: string) => void;
  onFillColorChange: (color: string) => void;
  initialColor: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"stroke" | "fill">("stroke");
  const [currentColor, setCurrentColor] = useState(initialColor);

  const handleColorChange = (color: string) => {
    if (tab === "stroke") {
      setCurrentColor(color);
      onStrokeColorChange(color);
    } else {
      setCurrentColor(color);
      onFillColorChange(color);
    }
  };

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
          {/* 边框颜色/填充颜色选择 */}
          <div className="flex gap-1 bg-muted rounded p-1">
            <Button
              variant={tab === "stroke" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("stroke")}
              className="flex-1 h-7 text-xs"
            >
              边框
            </Button>
            <Button
              variant={tab === "fill" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("fill")}
              className="flex-1 h-7 text-xs"
            >
              填充
            </Button>
          </div>

          {/* 展示当前颜色 */}
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

          {/* 展示可选择的颜色 */}
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
          {tab === "fill" && (
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

// 修改 StrokeWidthPicker 组件以支持属性面板中的线宽修改
export function StrokeWidthPickerForProperties({
  onWidthChange,
  initialWidth,
}: {
  onWidthChange: (width: number) => void;
  initialWidth: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(initialWidth);

  const handleWidthChange = (width: number) => {
    setCurrentWidth(width);
    onWidthChange(width);
  };

  const PRESET_WIDTHS = [1, 2, 4, 8, 12];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 gap-1 bg-transparent"
        >
          <div className="flex items-center gap-1">
            <div
              className="bg-foreground rounded-full"
              style={{
                width: Math.min(currentWidth * 2 + 2, 12),
                height: Math.min(currentWidth * 2 + 2, 12),
              }}
            />
            <span className="text-xs">{currentWidth}px</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3">
        <div className="space-y-3">
          <div className="text-sm font-medium">边框宽度</div>

          {/* 滑动选择 */}
          <div className="px-2">
            <Slider
              value={[currentWidth]}
              onValueChange={(value) => handleWidthChange(value[0])}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          {/* 预设宽度选择 */}
          <div className="flex gap-1">
            {PRESET_WIDTHS.map((width) => (
              <Button
                key={width}
                variant={currentWidth === width ? "default" : "outline"}
                size="sm"
                onClick={() => handleWidthChange(width)}
                className="flex-1 h-8 p-0"
              >
                <div
                  className="bg-current rounded-full"
                  style={{
                    width: Math.min(width * 2 + 2, 12),
                    height: Math.min(width * 2 + 2, 12),
                  }}
                />
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PropertiesPanel() {
  const {
    selectedIds,
    shapes,
    opacity,
    rotation,
    setOpacity,
    setRotation,
    clearSelection,
    collaborativeAddShape,
    collaborativeUpdateShape,
    collaborativeDeleteSelected,
  } = useCanvasStore();

  if (selectedIds.length === 0) return null;

  const selectedShapes = shapes.filter((shape) =>
    selectedIds.includes(shape.id)
  );
  const isMultiSelect = selectedIds.length > 1;
  const isTextSelection = !isMultiSelect && selectedShapes[0]?.type === "text";
  const isImageSelection =
    !isMultiSelect && selectedShapes[0]?.type === "image";

  // 获取第一个选中元素的属性作为默认值
  const firstShape = selectedShapes[0];
  const defaultStrokeColor = firstShape?.stroke || "#000000";
  const defaultFillColor = firstShape?.fill || "transparent";
  const defaultStrokeWidth = firstShape?.strokeWidth || 2;
  const defaultFontFamily = firstShape?.fontFamily || "Arial";
  const defaultFontSize = firstShape?.fontSize || 16;
  const defaultBackgroundColor = firstShape?.backgroundColor || "transparent";

  const handleStrokeColorChange = (color: string) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { stroke: color });
    });
  };

  const handleFillColorChange = (color: string) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { fill: color });
    });
  };

  const handleStrokeWidthChange = (width: number) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { strokeWidth: width });
    });
  };

  // 字体相关的处理函数
  const handleFontFamilyChange = (font: string) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { fontFamily: font });
    });
  };

  const handleFontSizeChange = (size: number) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { fontSize: size });
    });
  };

  const handleBackgroundColorChange = (color: string) => {
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { backgroundColor: color });
    });
  };

  const toggleTextStyle = (
    style: "isbold" | "isitalic" | "isunderline" | "isstrikethrough"
  ) => {
    selectedIds.forEach((id) => {
      const shape = shapes.find((s) => s.id === id);
      if (shape) {
        collaborativeUpdateShape(id, { [style]: !shape[style] });
      }
    });
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0] / 100;
    setOpacity(newOpacity);

    // 更新选中元素的透明度
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { opacity: newOpacity });
    });
  };

  const handleRotationChange = (value: number[]) => {
    const newRotation = value[0];
    setRotation(newRotation);

    // 更新选中元素的旋转角度
    selectedIds.forEach((id) => {
      collaborativeUpdateShape(id, { rotation: newRotation });
    });
  };

  // 复制选中元素
  const duplicateSelected = () => {
    selectedShapes.forEach((shape) => {
      const newShape = {
        ...shape,
        id: Date.now().toString() + Math.random(),
        x: shape.x + 20,
        y: shape.y + 20,
      };
      collaborativeAddShape(newShape);
    });
  };

  const handleTypeToLabel = (type: string) => {
    switch (type) {
      case "rectangle":
        return "矩形";
      case "circle":
        return "圆形";
      case "line":
        return "直线";
      case "arrow":
        return "箭头";
      case "text":
        return "文本";
      case "image":
        return "图片";
      default:
        return "元素";
    }
  };

  return (
    <div className="absolute top-20 right-4 w-64 bg-card border border-border rounded-lg shadow-lg p-4 z-10">
      {/* 面板头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm">
          {isMultiSelect
            ? `${selectedIds.length} 个元素`
            : handleTypeToLabel(selectedShapes[0]?.type) || "元素"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 元素通用行为 */}
      <div className="flex gap-1 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={duplicateSelected}
          className="flex-1 h-8 text-xs gap-1 bg-transparent"
        >
          <Copy className="h-3 w-3" />
          复制
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={collaborativeDeleteSelected}
          className="flex-1 h-8 text-xs gap-1 bg-transparent"
        >
          <Trash2 className="h-3 w-3" />
          删除
        </Button>
      </div>

      {/* 元素属性控制 */}
      <div className="space-y-4">
        {/* 文本特定属性控制 */}
        {isTextSelection && (
          <>
            {/* 字体选择 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                字体
              </label>
              <select
                value={defaultFontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>

            {/* 字号选择 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                字号
              </label>
              <input
                type="number"
                value={defaultFontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                min="8"
                max="72"
                className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
              />
            </div>

            {/* 文本颜色 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                文本颜色
              </label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full p-0 relative"
                    >
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: defaultFillColor }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="grid grid-cols-6 gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleFillColorChange(color)}
                          className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={defaultFillColor}
                      onChange={(e) => handleFillColorChange(e.target.value)}
                      className="w-full h-8 mt-2 rounded border border-border cursor-pointer"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 背景颜色 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                背景颜色
              </label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full p-0 relative"
                    >
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: defaultBackgroundColor }}
                      />
                      {defaultBackgroundColor === "transparent" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs">T</span>
                        </div>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="grid grid-cols-6 gap-1">
                      {["transparent", ...PRESET_COLORS].map((color) => (
                        <button
                          key={color}
                          onClick={() => handleBackgroundColorChange(color)}
                          className="w-8 h-8 rounded border border-border hover:scale-110 transition-transform relative"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {color === "transparent" && (
                            <div className="absolute inset-0 flex items-center justify-center text-xs">
                              T
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <input
                      type="color"
                      value={
                        defaultBackgroundColor === "transparent"
                          ? "#ffffff"
                          : defaultBackgroundColor
                      }
                      onChange={(e) =>
                        handleBackgroundColorChange(e.target.value)
                      }
                      className="w-full h-8 mt-2 rounded border border-border cursor-pointer"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 文本样式 (B I U S) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                文本样式
              </label>
              <div className="flex gap-1">
                <Button
                  variant={firstShape?.isbold ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTextStyle("isbold")}
                  className="flex-1 h-8 text-xs"
                >
                  B
                </Button>
                <Button
                  variant={firstShape?.isitalic ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTextStyle("isitalic")}
                  className="flex-1 h-8 text-xs"
                >
                  I
                </Button>
                <Button
                  variant={firstShape?.isunderline ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTextStyle("isunderline")}
                  className="flex-1 h-8 text-xs"
                >
                  U
                </Button>
                <Button
                  variant={firstShape?.isstrikethrough ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTextStyle("isstrikethrough")}
                  className="flex-1 h-8 text-xs"
                >
                  S
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 图片滤镜控制 */}
        {!isMultiSelect &&
          selectedShapes[0] &&
          selectedShapes[0].type === "image" && (
            <div className="property-group">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                滤镜
              </label>
              <select
                value={selectedShapes[0].filter}
                onChange={(e) =>
                  collaborativeUpdateShape(selectedShapes[0].id, {
                    filter: e.target.value as ImageFilter,
                  })
                }
                className="w-full h-8 px-2 text-sm border border-border rounded bg-background"
              >
                <option value="none">无滤镜</option>
                <option value="grayscale">灰度滤镜</option>
                <option value="sepia">褐色滤镜</option>
                <option value="invert">反转滤镜</option>
              </select>
            </div>
          )}

        {/* 颜色 */}
        {!isTextSelection && !isImageSelection && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                颜色
              </label>
              <div className="flex gap-2">
                <ColorPickerForProperties
                  onStrokeColorChange={handleStrokeColorChange}
                  onFillColorChange={handleFillColorChange}
                  initialColor={defaultStrokeColor}
                />
              </div>
            </div>

            {/* 边框宽度 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                边框宽度
              </label>
              <StrokeWidthPickerForProperties
                onWidthChange={handleStrokeWidthChange}
                initialWidth={defaultStrokeWidth}
              />
            </div>
          </>
        )}

        {/* 透明度 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            透明度: {Math.round(opacity * 100)}%
          </label>
          <Slider
            value={[opacity * 100]}
            onValueChange={handleOpacityChange}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
        </div>

        {/* 旋转 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            旋转角度: {Math.round(rotation)}°
          </label>
          <Slider
            value={[rotation]}
            onValueChange={handleRotationChange}
            max={360}
            min={0}
            step={1}
            className="w-full"
          />
        </div>

        {/* 位置（只有一个元素被选中时出现） */}
        {!isMultiSelect && selectedShapes[0] && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              位置
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">X</label>
                <input
                  type="number"
                  value={Math.round(selectedShapes[0].x)}
                  onChange={(e) =>
                    collaborativeUpdateShape(selectedShapes[0].id, {
                      x: Number(e.target.value),
                    })
                  }
                  className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Y</label>
                <input
                  type="number"
                  value={Math.round(selectedShapes[0].y)}
                  onChange={(e) =>
                    collaborativeUpdateShape(selectedShapes[0].id, {
                      y: Number(e.target.value),
                    })
                  }
                  className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* 大小（只有一个元素选中时出现） */}
        {!isMultiSelect &&
          selectedShapes[0] &&
          selectedShapes[0].width !== undefined && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                大小
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">W</label>
                  <input
                    type="number"
                    value={Math.round(selectedShapes[0].width || 0)}
                    onChange={(e) =>
                      collaborativeUpdateShape(selectedShapes[0].id, {
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">H</label>
                  <input
                    type="number"
                    value={Math.round(selectedShapes[0].height || 0)}
                    onChange={(e) =>
                      collaborativeUpdateShape(selectedShapes[0].id, {
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full h-7 px-2 text-xs border border-border rounded bg-background"
                  />
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
