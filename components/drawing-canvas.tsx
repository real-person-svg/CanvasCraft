"use client";

import type React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import { useTheme } from "next-themes";
import { DrawingToolbar } from "./drawing-toolbar";
import { PropertiesPanel } from "./properties-panel";
import { CanvasOperations } from "./canvas-operations";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { ShortcutsHelp } from "./shortcuts-help";
import { CustomDialog } from "./custom-dialog";
import type { CanvasShape, CanvasPath } from "@/types/canvas";
import type { GuideLine } from "@/types/canvas";
import { pointToLineDistance } from "@/lib/utils";

// 画笔压感模拟
function getStroke(points: number[][], options: any = {}) {
  const { size = 8, thinning = 0.5, simulatePressure = true } = options;

  const inputPoints = points.map((point, i) => {
    const pressure = simulatePressure
      ? Math.min(1, 1 - Math.abs(i - points.length / 2) / (points.length / 2))
      : 0.5;
    return [point[0], point[1], pressure];
  });

  const strokePoints: number[][] = [];

  for (let i = 0; i < inputPoints.length; i++) {
    const [x, y, pressure] = inputPoints[i];
    const currentSize = size * (1 - thinning * (1 - pressure));

    if (i === 0) {
      strokePoints.push([x - currentSize / 2, y - currentSize / 2]);
      strokePoints.push([x + currentSize / 2, y - currentSize / 2]);
    } else {
      const prevPoint = inputPoints[i - 1];
      const angle = Math.atan2(y - prevPoint[1], x - prevPoint[0]);
      const perpAngle = angle + Math.PI / 2;

      strokePoints.push([
        x + (Math.cos(perpAngle) * currentSize) / 2,
        y + (Math.sin(perpAngle) * currentSize) / 2,
      ]);
    }
  }

  for (let i = inputPoints.length - 1; i >= 0; i--) {
    const [x, y, pressure] = inputPoints[i];
    const currentSize = size * (1 - thinning * (1 - pressure));
    const angle =
      i > 0
        ? Math.atan2(y - inputPoints[i - 1][1], x - inputPoints[i - 1][0])
        : 0;
    const perpAngle = angle - Math.PI / 2;

    strokePoints.push([
      x + (Math.cos(perpAngle) * currentSize) / 2,
      y + (Math.sin(perpAngle) * currentSize) / 2,
    ]);
  }

  return strokePoints;
}

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastPanPoint, setLastPanPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [currentPath, setCurrentPath] = useState<number[][]>([]);
  const [currentShape, setCurrentShape] = useState<CanvasShape | null>(null);
  const [editingText, setEditingText] = useState<{
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
  } | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [tempGuides, setTempGuides] = useState<GuideLine[]>([]); // 临时吸附提示线
  const [snapDistance, setSnapDistance] = useState(1); // 吸附距离(像素)

  const [erasedElements, setErasedElements] = useState<string[]>([]); // 已擦除的元素ID列表
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false); // 鼠标是否按下

  const { resolvedTheme } = useTheme();

  const {
    tool,
    paths,
    shapes,
    selectedIds,
    stagePos,
    stageScale,
    strokeColor,
    strokeWidth,
    fillColor,
    opacity,
    showGrid,
    rotation,
    setSelectedIds,
    clearSelection,
    setStagePos,
    setStageScale,
    snapEnabled,
    canvasId,
    isCollaborating,
    isCollabLoading,
    collabError,
    initializeCollaboration,
    toggleCollaboration,
    collaborativeAddPath,
    collaborativeAddShape,
    collaborativeUpdatePath,
    collaborativeUpdateShape,
    collaborativeDeleteSelected,
    collaborativeClearCanvas,
    disconnectCollaboration,
    eraseSelected,
  } = useCanvasStore();

  // 初始化协同服务（仅创建实例，不自动连接）
  useEffect(() => {
    initializeCollaboration(canvasId); // 初始化服务实例（未连接状态）

    return () => {
      // 组件卸载时强制清理
      disconnectCollaboration();
    };
  }, [canvasId]);

  // 监听窗口尺寸变化，更新画布尺寸
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 获取画布坐标
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - stagePos.x) / stageScale,
        y: (clientY - rect.top - stagePos.y) / stageScale,
      };
    },
    [stagePos, stageScale]
  );

  // 查找当前鼠标位置的形状，实现形状碰撞检测
  const findShapeAtPosition = useCallback(
    (x: number, y: number): CanvasShape | null => {
      // 这样可以确保最上层的形状被选中
      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        if (
          x >= shape.x &&
          x <= shape.x + (shape.width || 0) &&
          y >= shape.y &&
          y <= shape.y + (shape.height || 0)
        ) {
          return shape;
        }
      }
      return null;
    },
    [shapes]
  );

  // 新增：查找当前鼠标位置的路径
  const findPathAtPosition = useCallback(
    (x: number, y: number): CanvasPath | null => {
      // 从后往前遍历，确保最上层的路径被选中
      for (let i = paths.length - 1; i >= 0; i--) {
        const path = paths[i];
        const points = path.points;

        // 检查路径的每个线段
        for (let j = 0; j < points.length - 3; j += 2) {
          const x1 = points[j];
          const y1 = points[j + 1];
          const x2 = points[j + 2];
          const y2 = points[j + 3];

          // 计算点到线段的距离
          const distance = pointToLineDistance(x, y, x1, y1, x2, y2);

          // 如果距离小于路径宽度的一半（考虑缩放），则认为点在路径上
          const hitDistance = path.strokeWidth / 2 / stageScale;
          if (distance <= hitDistance) {
            return path;
          }
        }
      }
      return null;
    },
    [paths, stageScale]
  );

  // 获取当前鼠标位置的调整句柄
  const getResizeHandle = useCallback(
    (x: number, y: number, shape: CanvasShape): string | null => {
      const handleSize = 8 / stageScale;
      const handles = [
        {
          name: "nw",
          x: shape.x - handleSize / 2,
          y: shape.y - handleSize / 2,
        },
        {
          name: "ne",
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y - handleSize / 2,
        },
        {
          name: "sw",
          x: shape.x - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        },
        {
          name: "se",
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        },
        {
          name: "n",
          x: shape.x + (shape.width || 0) / 2 - handleSize / 2,
          y: shape.y - handleSize / 2,
        },
        {
          name: "s",
          x: shape.x + (shape.width || 0) / 2 - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        },
        {
          name: "w",
          x: shape.x - handleSize / 2,
          y: shape.y + (shape.height || 0) / 2 - handleSize / 2,
        },
        {
          name: "e",
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y + (shape.height || 0) / 2 - handleSize / 2,
        },
      ];

      for (const handle of handles) {
        if (
          x >= handle.x &&
          x <= handle.x + handleSize &&
          y >= handle.y &&
          y <= handle.y + handleSize
        ) {
          return handle.name;
        }
      }
      return null;
    },
    [stageScale]
  );

  // 吸附处理函数（只处理临时辅助线）
  const applySnapping = useCallback(
    (x: number, y: number, shape?: CanvasShape) => {
      if (!snapEnabled) return { x, y };

      let snappedX = x;
      let snappedY = y;
      const tempGuides: GuideLine[] = [];

      // 获取所有可能的吸附点
      const snapPoints = getAllSnapPoints(shape);

      // 处理X轴吸附 verticalSnaps
      const closestX = snapPoints.reduce((closest, pos) => {
        const distance = Math.abs(x - pos.x);
        return distance < Math.abs(x - closest) &&
          distance <= snapDistance / stageScale
          ? pos.x
          : closest;
      }, Infinity);

      if (closestX !== Infinity) {
        snappedX = closestX;
        tempGuides.push({
          id: `temp-v-${Date.now()}`,
          type: "vertical",
          position: snappedX,
          isTemp: true,
        });
      }

      // 处理Y轴吸附 horizontalSnaps
      const closestY = snapPoints.reduce((closest, pos) => {
        const distance = Math.abs(y - pos.y);
        return distance < Math.abs(y - closest) &&
          distance <= snapDistance / stageScale
          ? pos.y
          : closest;
      }, Infinity);

      if (closestY !== Infinity) {
        snappedY = closestY;
        tempGuides.push({
          id: `temp-h-${Date.now()}`,
          type: "horizontal",
          position: snappedY,
          isTemp: true,
        });
      }

      setTempGuides(tempGuides);
      return { x: snappedX, y: snappedY };
    },
    [snapEnabled, snapDistance, stageScale, shapes]
  );

  // 获取所有吸附点
  const getAllSnapPoints = useCallback(
    (currentShape?: CanvasShape) => {
      const points: { x: number; y: number }[] = [];

      // 添加其他形状的边缘和中心点作为吸附点
      shapes.forEach((shape) => {
        // 排除当前正在操作的形状
        if (currentShape && shape.id === currentShape.id) return;

        const { x, y, width = 0, height = 0 } = shape;

        // 边缘
        points.push(
          { x, y }, // 左上角
          { x: x + width, y }, // 右上角
          { x, y: y + height }, // 左下角
          { x: x + width, y: y + height }, // 右下角

          // 中心点
          { x: x + width / 2, y: y + height / 2 },

          // 中线
          { x: x + width / 2, y }, // 上中线
          { x: x + width / 2, y: y + height }, // 下中线
          { x, y: y + height / 2 }, // 左中线
          { x: x + width, y: y + height / 2 } // 右中线
        );
      });

      return points;
    },
    [shapes]
  );

  // 处理点击橡皮擦后鼠标按下事件
  const handleEraserMouseDown = (pos: { x: number; y: number }) => {
    setErasedElements([]);
  };

  // 处理橡皮擦鼠标移动
  const handleEraserMouseMove = (pos: { x: number; y: number }) => {
    const hoveredShape = findShapeAtPosition(pos.x, pos.y);
    const hoveredPath = findPathAtPosition(pos.x, pos.y);

    if (hoveredShape !== null && !erasedElements.includes(hoveredShape.id)) {
      // 计算新透明度
      const currentOpacity = hoveredShape.opacity || 1;
      const newOpacity = Math.max(0, currentOpacity - 0.8);
      // 临时更新元素透明度（视觉反馈）
      collaborativeUpdateShape(hoveredShape.id, {
        opacity: newOpacity,
      });
      // 添加到已擦除元素列表，确保只处理一次
      setErasedElements((prev) => [...prev, hoveredShape.id]);
    }

    if (hoveredPath !== null && !erasedElements.includes(hoveredPath.id)) {
      // 计算新透明度
      const currentOpacity = hoveredPath.opacity || 1;
      const newOpacity = Math.max(0, currentOpacity - 0.8);
      // 临时更新路径透明度（视觉反馈）
      collaborativeUpdatePath(hoveredPath.id, {
        opacity: newOpacity,
      });
      // 简单处理：添加已擦除的路径ID
      setErasedElements((prev) => [...prev, hoveredPath.id]);
    }
  };

  // 处理橡皮擦鼠标释放
  const handleEraserMouseUp = () => {
    // 删除经过的元素
    eraseSelected(erasedElements);
    // 重置状态
    setErasedElements([]);
  };

  // 自定义确认对话框
  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setDialogConfig({ title, message, onConfirm, onCancel });
    setShowDialog(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pos = getCanvasCoordinates(e.clientX, e.clientY);

    // 如果双击在现有文本上，开始编辑
    const clickedShape = findShapeAtPosition(pos.x, pos.y);
    if (clickedShape && clickedShape.type === "text") {
      startTextEditing(clickedShape);
      return;
    }

    // 创建新文本
    startTextCreation(pos);
  };

  const startTextCreation = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = pos.x * stageScale + stagePos.x + rect.left;
    const screenY = pos.y * stageScale + stagePos.y + rect.top;

    setEditingText({
      id: Date.now().toString(),
      x: screenX,
      y: screenY,
      text: "",
      fontSize: 16,
    });

    // 这是为了确保输入框已经渲染出来，然后再设置焦点
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 10);
  };

  const startTextEditing = (shape: CanvasShape) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = shape.x * stageScale + stagePos.x + rect.left;
    const screenY = shape.y * stageScale + stagePos.y + rect.top;

    setEditingText({
      id: shape.id,
      x: screenX,
      y: screenY,
      text: shape.text || "",
      fontSize: shape.fontSize || 16,
    });

    setTimeout(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }, 10);
  };

  const completeTextEditing = () => {
    if (!editingText) return;

    if (editingText.text.trim()) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let canvasX = (editingText.x - rect.left - stagePos.x) / stageScale;
      let canvasY = (editingText.y - rect.top - stagePos.y) / stageScale;

      // 如果是编辑现有文本，则更新现有文本
      const existingShape = shapes.find((s) => s.id === editingText.id);

      // 应用吸附
      const snapped = applySnapping(canvasX, canvasY);
      canvasX = snapped.x;
      canvasY = snapped.y;

      if (existingShape) {
        // 更新现有文本内容
        collaborativeUpdateShape(editingText.id, {
          text: editingText.text,
        });
      } else {
        // 创建新文本
        const textShape: CanvasShape = {
          id: editingText.id,
          type: "text",
          x: canvasX,
          y: canvasY,
          text: editingText.text,
          stroke: strokeColor,
          strokeWidth: 0,
          fill: strokeColor,
          opacity,
          fontSize: editingText.fontSize,
          width: editingText.text.length * 8, // 近似宽度
          height: editingText.fontSize,
          rotation: 0,
        };
        collaborativeAddShape(textShape);
      }
    }

    setEditingText(null);
  };

  // 绘制所有内容到画布上
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 创建画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 保存当前画布状态，包括缩放、平移等
    ctx.save();

    // 平移和缩放
    ctx.translate(stagePos.x, stagePos.y);
    ctx.scale(stageScale, stageScale);

    // 是否展示网格视图
    if (showGrid) {
      drawGrid(ctx);
    }

    // 绘制临时吸附提示线
    drawTempGuideLines(ctx);

    // 绘制所有路径
    paths.forEach((path) => drawRealisticPath(ctx, path));

    // 绘制图形
    shapes.forEach((shape) => drawShape(ctx, shape));

    // 绘制画笔路径
    if (isDrawing && tool === "pen" && currentPath.length > 0) {
      drawCurrentRealisticPath(ctx);
    }

    // 绘制当前图形
    if (currentShape) {
      drawShape(ctx, currentShape);
    }

    // 恢复画布状态
    ctx.restore();
  }, [
    canvasRef,
    paths,
    shapes,
    currentPath,
    currentShape,
    isDrawing,
    tool,
    stagePos,
    stageScale,
    strokeColor,
    strokeWidth,
    opacity,
    selectedIds,
    showGrid,
    resolvedTheme,
    rotation,
    isCollaborating, // 添加协同状态作为依赖
    canvasId, // 添加画布ID作为依赖，确保切换画布时重绘
  ]);

  // 只绘制临时吸附提示线
  const drawTempGuideLines = (ctx: CanvasRenderingContext2D) => {
    if (tempGuides.length === 0) return;

    // 绘制临时吸附提示线
    ctx.strokeStyle = "#f59e0b"; // 橙色
    ctx.lineWidth = 1.5 / stageScale;
    ctx.setLineDash([5 / stageScale, 3 / stageScale]);

    tempGuides.forEach((guide) => {
      ctx.beginPath();
      if (guide.type === "horizontal") {
        ctx.moveTo(-10000, guide.position);
        ctx.lineTo(10000, guide.position);
      } else {
        ctx.moveTo(guide.position, -10000);
        ctx.lineTo(guide.position, 10000);
      }
      ctx.stroke();
    });

    ctx.setLineDash([]);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20;
    const isDark = resolvedTheme === "dark";

    // 网格线颜色
    ctx.strokeStyle = isDark ? "#868686" : "#d1d5db";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = isDark ? 0.4 : 0.6;

    const startX = Math.floor(-stagePos.x / stageScale / gridSize) * gridSize;
    const startY = Math.floor(-stagePos.y / stageScale / gridSize) * gridSize;
    const endX = startX + dimensions.width / stageScale + gridSize;
    const endY = startY + dimensions.height / stageScale + gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // 绘制路径
  const drawRealisticPath = (
    ctx: CanvasRenderingContext2D,
    path: CanvasPath
  ) => {
    if (path.points.length < 4) return;

    const points: number[][] = [];
    for (let i = 0; i < path.points.length; i += 2) {
      points.push([path.points[i], path.points[i + 1]]);
    }

    if (points.length < 2) return;

    const strokeOutline = getStroke(points, {
      size: path.strokeWidth * 2,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
    });

    if (strokeOutline.length === 0) return;

    ctx.fillStyle = path.stroke;
    ctx.globalAlpha = path.opacity || 1;

    ctx.beginPath();
    ctx.moveTo(strokeOutline[0][0], strokeOutline[0][1]);

    for (let i = 1; i < strokeOutline.length; i++) {
      ctx.lineTo(strokeOutline[i][0], strokeOutline[i][1]);
    }

    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawCurrentRealisticPath = (ctx: CanvasRenderingContext2D) => {
    if (currentPath.length < 2) return;

    const strokeOutline = getStroke(currentPath, {
      size: strokeWidth * 2,
      thinning: 0.6,
      smoothing: 0.5,
      streamline: 0.5,
    });

    if (strokeOutline.length === 0) return;

    ctx.fillStyle = strokeColor;
    ctx.globalAlpha = opacity;

    ctx.beginPath();
    ctx.moveTo(strokeOutline[0][0], strokeOutline[0][1]);

    for (let i = 1; i < strokeOutline.length; i++) {
      ctx.lineTo(strokeOutline[i][0], strokeOutline[i][1]);
    }

    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // 绘制图形
  const drawShape = (ctx: CanvasRenderingContext2D, shape: CanvasShape) => {
    ctx.strokeStyle = shape.stroke;
    ctx.lineWidth = shape.strokeWidth;
    ctx.fillStyle = shape.fill || "transparent";
    ctx.globalAlpha = shape.opacity || 1;

    const isSelected = selectedIds.includes(shape.id);

    // 计算旋转中心点（对于有宽高的形状）
    const centerX = shape.x + (shape.width || 0) / 2;
    const centerY = shape.y + (shape.height || 0) / 2;

    // 应用旋转变换（箭头和线条可能需要特殊处理）
    const needsRotation =
      shape.rotation !== 0 && shape.type !== "arrow" && shape.type !== "line";

    // 保存当前上下文状态，准备应用旋转
    ctx.save();

    if (needsRotation) {
      ctx.translate(centerX, centerY);
      ctx.rotate((shape.rotation * Math.PI) / 180); // 将角度转换为弧度
      ctx.translate(-centerX, -centerY);
    }

    switch (shape.type) {
      case "rectangle":
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width || 0, shape.height || 0);
        if (shape.fill && shape.fill !== "transparent") ctx.fill();
        ctx.stroke();
        break;
      case "circle":
        const centerX = shape.x + (shape.width || 0) / 2;
        const centerY = shape.y + (shape.height || 0) / 2;
        const radius = Math.abs((shape.width || 0) + (shape.height || 0)) / 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        if (shape.fill && shape.fill !== "transparent") ctx.fill();
        ctx.stroke();
        break;
      case "arrow":
        if (shape.points && shape.points.length >= 4) {
          // 箭头需要单独处理旋转
          if (shape.rotation !== 0) {
            const [x1, y1, x2, y2] = shape.points;
            // 计算箭头的中心点
            const arrowCenterX = (x1 + x2) / 2;
            const arrowCenterY = (y1 + y2) / 2;

            // 保存状态，应用旋转，绘制箭头，然后恢复
            ctx.restore(); // 恢复之前的状态
            ctx.save();
            ctx.translate(arrowCenterX, arrowCenterY);
            ctx.rotate((shape.rotation * Math.PI) / 180);
            ctx.translate(-arrowCenterX, -arrowCenterY);

            drawArrow(ctx, x1, y1, x2, y2);
          } else {
            const [x1, y1, x2, y2] = shape.points;
            drawArrow(ctx, x1, y1, x2, y2);
          }
        }
        break;
      case "text":
        const fontWeight = shape.isbold ? "bold" : "normal";
        const fontStyle = shape.isitalic ? "italic" : "normal";

        ctx.font = `${fontStyle} ${fontWeight} ${shape.fontSize || 16}px ${
          shape.fontFamily || "Arial"
        }`;
        ctx.fillStyle = shape.fill || shape.stroke;

        // 绘制背景
        if (shape.backgroundColor && shape.backgroundColor !== "transparent") {
          const textMetrics = ctx.measureText(shape.text || "");
          ctx.fillStyle = shape.backgroundColor;
          ctx.fillRect(
            shape.x,
            shape.y,
            textMetrics.width,
            (shape.fontSize || 16) * 1.2
          );
          // 重置文本颜色
          ctx.fillStyle = shape.fill || shape.stroke;
        }

        // 绘制文本
        const text = shape.text || "";
        const fontSize = shape.fontSize || 16;
        ctx.fillText(text, shape.x, shape.y + fontSize);

        // 测量文本宽度（用于线条长度）
        const textWidth = ctx.measureText(text).width;

        // 保存当前上下文状态（避免影响其他绘制）
        ctx.save();

        // 设置线条样式（与文本颜色一致，线宽为字体大小的1/10）
        ctx.strokeStyle = shape.fill || shape.stroke;
        ctx.lineWidth = Math.max(1, Math.floor(fontSize / 10));
        ctx.lineCap = "round"; // 线条两端圆润

        // 绘制下划线（文本基线下方）
        if (shape.isunderline) {
          const underlineY = shape.y + fontSize + fontSize / 6; // 位置：文本下方1/5字体高度
          ctx.beginPath();
          ctx.moveTo(shape.x, underlineY);
          ctx.lineTo(shape.x + textWidth, underlineY);
          ctx.stroke();
        }

        // 绘制删除线（文本中间）
        if (shape.isstrikethrough) {
          const strikethroughY = shape.y + fontSize / 1.5; // 位置：文本垂直居中
          ctx.beginPath();
          ctx.moveTo(shape.x, strikethroughY);
          ctx.lineTo(shape.x + textWidth, strikethroughY);
          ctx.stroke();
        }

        // 恢复上下文状态
        ctx.restore();
        break;
      case "image":
        ctx.save();
        ctx.globalAlpha = shape.opacity || 1;
        switch (shape.filter) {
          case "grayscale":
            ctx.filter = "grayscale(100%)";
            break;
          case "sepia":
            ctx.filter = "sepia(100%)";
            break;
          case "invert":
            ctx.filter = "invert(100%)";
            break;
          default:
            ctx.filter = "none";
            break;
        }
        const img = new Image();
        img.src = shape.src || "";
        ctx.drawImage(
          img,
          shape.x,
          shape.y,
          shape.width || 100,
          shape.height || 100
        );
        ctx.restore(); // 恢复滤镜设置
        break;
      case "line":
        // 线条处理类似箭头
        if (shape.points && shape.points.length >= 4) {
          // 保存当前状态
          ctx.save();

          if (shape.rotation !== 0) {
            const [x1, y1, x2, y2] = shape.points;
            const lineCenterX = (x1 + x2) / 2;
            const lineCenterY = (y1 + y2) / 2;

            // 应用旋转
            ctx.translate(lineCenterX, lineCenterY);
            ctx.rotate((shape.rotation * Math.PI) / 180);
            ctx.translate(-lineCenterX, -lineCenterY);
          }

          const [x1, y1, x2, y2] = shape.points;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // 恢复状态
          ctx.restore();
        }
        break;
    }

    if (isSelected) {
      // 为选中的元素绘制边框和调整手柄
      ctx.save();

      // 只有选中的元素需要旋转
      if (needsRotation) {
        ctx.translate(centerX, centerY);
        ctx.rotate((shape.rotation * Math.PI) / 1);
        ctx.translate(-centerX, -centerY);
      }

      ctx.strokeStyle = "#007acc";
      ctx.lineWidth = 2 / stageScale;
      ctx.setLineDash([5 / stageScale, 5 / stageScale]);
      ctx.strokeRect(
        shape.x - 5 / stageScale,
        shape.y - 5 / stageScale,
        (shape.width || 0) + 10 / stageScale,
        (shape.height || 0) + 10 / stageScale
      );
      ctx.setLineDash([]);

      // 调整手柄大小
      const handleSize = 8 / stageScale;
      const handles = [
        { x: shape.x - handleSize / 2, y: shape.y - handleSize / 2 }, // nw
        {
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y - handleSize / 2,
        }, // ne
        {
          x: shape.x - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        }, // sw
        {
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        }, // se
        {
          x: shape.x + (shape.width || 0) / 2 - handleSize / 2,
          y: shape.y - handleSize / 2,
        }, // n
        {
          x: shape.x + (shape.width || 0) / 2 - handleSize / 2,
          y: shape.y + (shape.height || 0) - handleSize / 2,
        }, // s
        {
          x: shape.x - handleSize / 2,
          y: shape.y + (shape.height || 0) / 2 - handleSize / 2,
        }, // w
        {
          x: shape.x + (shape.width || 0) - handleSize / 2,
          y: shape.y + (shape.height || 0) / 2 - handleSize / 2,
        }, // e
      ];

      ctx.fillStyle = "#007acc";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 / stageScale;

      handles.forEach((handle) => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
      });

      ctx.restore();
    }

    // 恢复选中框的上下文状态
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  // 绘制箭头
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const headLength = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle - Math.PI / 6),
      y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + Math.PI / 6),
      y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // 当依赖项发生变化时重新绘制
  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsMouseDown(true);
    const pos = getCanvasCoordinates(e.clientX, e.clientY);

    if (tool === "hand") {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // 新增橡皮擦工具处理
    if (tool === "eraser") {
      handleEraserMouseDown(pos);
      return;
    }

    if (tool === "select") {
      // 检查是否在调整手柄上
      for (const id of selectedIds) {
        const shape = shapes.find((s) => s.id === id);
        if (shape) {
          const handle = getResizeHandle(pos.x, pos.y, shape);
          if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
            setStartPos(pos);
            return;
          }
        }
      }
      const clickedShape = findShapeAtPosition(pos.x, pos.y);
      if (clickedShape) {
        if (!selectedIds.includes(clickedShape.id)) {
          if (e.shiftKey) {
            setSelectedIds([...selectedIds, clickedShape.id]);
          } else {
            setSelectedIds([clickedShape.id]);
          }
        }

        // 开始拖拽
        setIsDragging(true);
        setStartPos(pos);
        setDragOffset({
          x: pos.x - clickedShape.x,
          y: pos.y - clickedShape.y,
        });
      } else {
        // 当点到空位置时，清除选择
        if (!e.shiftKey) {
          clearSelection();
        }
      }
      return;
    }

    // 如果不是选择工具，开始绘制
    if (tool === "pen") {
      setIsDrawing(true);
      setCurrentPath([[pos.x, pos.y]]);
    } else if (tool === "text") {
      startTextCreation(pos);
    } else if (["rectangle", "circle", "arrow", "line"].includes(tool)) {
      setIsDrawing(true);
      setStartPos(pos);
      // 应用吸附到起始点
      const snappedPos = applySnapping(pos.x, pos.y);
      setCurrentShape({
        id: Date.now().toString(),
        type: tool as "rectangle" | "circle" | "arrow" | "line",
        x: snappedPos.x,
        y: snappedPos.y,
        width: 0,
        height: 0,
        stroke: strokeColor,
        strokeWidth,
        fill: tool === "rectangle" || tool === "circle" ? fillColor : undefined,
        opacity,
        points:
          tool === "arrow" || tool === "line"
            ? [snappedPos.x, snappedPos.y, snappedPos.x, snappedPos.y]
            : undefined,
        rotation: 0,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 移动时清除临时辅助线，除非正在拖拽或绘制
    if (!isDragging && !isResizing && !isDrawing) {
      setTempGuides([]);
    }

    // 橡皮擦工具处理
    if (tool === "eraser" && isMouseDown) {
      // 需要添加isMouseDown状态
      const pos = getCanvasCoordinates(e.clientX, e.clientY);
      handleEraserMouseMove(pos);
      return;
    }

    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      setStagePos({
        x: stagePos.x + deltaX,
        y: stagePos.y + deltaY,
      });

      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // 如果是调整大小或拖动，更新形状大小或位置
    if (isResizing && resizeHandle && selectedIds.length === 1 && startPos) {
      const pos = getCanvasCoordinates(e.clientX, e.clientY);
      const shape = shapes.find((s) => s.id === selectedIds[0]);
      if (shape) {
        const deltaX = pos.x - startPos.x;
        const deltaY = pos.y - startPos.y;

        const newShape = { ...shape };

        switch (resizeHandle) {
          case "se":
            newShape.width = (shape.width || 0) + deltaX;
            newShape.height = (shape.height || 0) + deltaY;
            break;
          case "sw":
            newShape.x = shape.x + deltaX;
            newShape.width = (shape.width || 0) - deltaX;
            newShape.height = (shape.height || 0) + deltaY;
            break;
          case "ne":
            newShape.y = shape.y + deltaY;
            newShape.width = (shape.width || 0) + deltaX;
            newShape.height = (shape.height || 0) - deltaY;
            break;
          case "nw":
            newShape.x = shape.x + deltaX;
            newShape.y = shape.y + deltaY;
            newShape.width = (shape.width || 0) - deltaX;
            newShape.height = (shape.height || 0) - deltaY;
            break;
          case "n":
            newShape.y = shape.y + deltaY;
            newShape.height = (shape.height || 0) - deltaY;
            break;
          case "s":
            newShape.height = (shape.height || 0) + deltaY;
            break;
          case "w":
            newShape.x = shape.x + deltaX;
            newShape.width = (shape.width || 0) - deltaX;
            break;
          case "e":
            newShape.width = (shape.width || 0) + deltaX;
            break;
        }
        collaborativeUpdateShape(selectedIds[0], newShape);
        setStartPos(pos);
      }
      return;
    }

    if (isDragging && selectedIds.length > 0 && startPos) {
      const pos = getCanvasCoordinates(e.clientX, e.clientY);
      // 应用吸附
      const snappedPos = applySnapping(
        pos.x - dragOffset.x,
        pos.y - dragOffset.y
      );

      // 移动所有选中的元素
      selectedIds.forEach((id) => {
        const shape = shapes.find((s) => s.id === id);
        if (shape) {
          collaborativeUpdateShape(id, {
            x: snappedPos.x,
            y: snappedPos.y,
          });
        }
      });

      setStartPos({
        x: snappedPos.x + dragOffset.x,
        y: snappedPos.y + dragOffset.y,
      });
      return;
    }

    if (!isDrawing) return;

    const pos = getCanvasCoordinates(e.clientX, e.clientY);

    if (tool === "pen") {
      setCurrentPath((prev) => [...prev, [pos.x, pos.y]]);
    } else if (currentShape && startPos) {
      // 应用吸附到终点
      const snappedPos = applySnapping(pos.x, pos.y, currentShape);
      const updatedShape = { ...currentShape };

      if (tool === "rectangle" || tool === "circle") {
        updatedShape.width = snappedPos.x - startPos.x;
        updatedShape.height = snappedPos.y - startPos.y;
      } else if (tool === "arrow" || tool === "line") {
        updatedShape.points = [
          startPos.x,
          startPos.y,
          snappedPos.x,
          snappedPos.y,
        ];
      }

      setCurrentShape(updatedShape);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    // 新增橡皮擦处理
    if (tool === "eraser") {
      handleEraserMouseUp();
    }

    setIsPanning(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setLastPanPoint(null);
    setTempGuides([]); // 释放鼠标时清除临时辅助线

    if (!isDrawing) return;

    setIsDrawing(false);

    if (tool === "pen" && currentPath.length > 0) {
      const flatPoints: number[] = [];
      currentPath.forEach(([x, y]) => {
        flatPoints.push(x, y);
      });
      collaborativeAddPath({
        id: Date.now().toString(),
        points: flatPoints,
        stroke: strokeColor,
        strokeWidth,
        opacity,
      });
      setCurrentPath([]);
    } else if (currentShape) {
      const hasSize =
        currentShape.width !== 0 ||
        currentShape.height !== 0 ||
        (currentShape.points &&
          currentShape.points.length === 4 &&
          (currentShape.points[0] !== currentShape.points[2] ||
            currentShape.points[1] !== currentShape.points[3]));

      if (hasSize) {
        collaborativeAddShape(currentShape);
      }
      setCurrentShape(null);
    }

    setStartPos(null);
  };

  // 处理滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(5, stageScale + direction * 0.1));

    const mousePointTo = {
      x: (mouseX - stagePos.x) / stageScale,
      y: (mouseY - stagePos.y) / stageScale,
    };

    setStageScale(newScale);
    setStagePos({
      x: mouseX - mousePointTo.x * newScale,
      y: mouseY - mousePointTo.y * newScale,
    });
  };

  // 处理删除键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        showConfirmation(
          "删除元素",
          `是否确认删除${selectedIds.length}个元素?`,
          () => {
            collaborativeDeleteSelected();
          }
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, collaborativeDeleteSelected]);

  const getCursorStyle = () => {
    if (tool === "eraser") {
      return 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13L5 5"/><path d="M7 15l10-10"/><path d="M15 9H9"/></svg>\') 0 24, auto';
    }
    if (isResizing) {
      switch (resizeHandle) {
        case "nw":
        case "se":
          return "nw-resize";
        case "ne":
        case "sw":
          return "ne-resize";
        case "n":
        case "s":
          return "ns-resize";
        case "w":
        case "e":
          return "ew-resize";
        default:
          return "default";
      }
    }

    switch (tool) {
      case "hand":
        return isPanning ? "grabbing" : "grab";
      case "select":
        return "default";
      case "pen":
        return "crosshair";
      case "text":
        return "text";
      default:
        return "crosshair";
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* 快捷键处理 */}
      <KeyboardShortcuts />

      {/* 协同编辑开关按钮（放在画布操作区或顶部工具栏） */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <button
          onClick={toggleCollaboration}
          disabled={isCollabLoading}
          className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5
            ${
              isCollaborating
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }
            ${
              isCollabLoading
                ? "opacity-70 cursor-not-allowed"
                : "cursor-pointer"
            }
            shadow-md border border-transparent hover:border-opacity-50`}
        >
          {isCollabLoading && (
            <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          )}
          {isCollaborating ? "关闭协同编辑" : "开启协同编辑"}
        </button>

        {/* 错误提示 */}
        {collabError && (
          <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md">
            {collabError}
          </span>
        )}
      </div>

      {/* 协同状态指示器（保留原有） */}
      <div className="absolute top-4 right-4 bg-card/80 border border-border rounded-full p-2 shadow-lg">
        {isCollaborating ? (
          <span className="flex items-center text-sm text-green-500">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
            协同编辑已开启
          </span>
        ) : (
          <span className="flex items-center text-sm text-gray-500">
            <span className="w-2 h-2 bg-gray-300 rounded-full mr-1"></span>
            协同编辑已关闭
          </span>
        )}
      </div>

      {/* 工具栏 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <DrawingToolbar />
      </div>

      {/* 属性面板 */}
      <PropertiesPanel />

      {/* 画布操作 */}
      <CanvasOperations
        onClearCanvas={() => {
          showConfirmation("清空画布", "是否确认清空画布?此操作不可逆", () => {
            collaborativeClearCanvas();
            setTempGuides([]); // 清除画布时同时清除临时辅助线
          });
        }}
      />

      {/* 快捷键帮助按钮 */}
      <ShortcutsHelp />

      {/* 选中的提示信息 */}
      {selectedIds.length > 0 && (
        <div className="absolute top-20 left-4 bg-card border border-border rounded-lg p-2 shadow-lg text-sm">
          {selectedIds.length} 个元素已选中
          {selectedIds.length === 1 && " • 拖动以移动 • 使用手柄调整大小"}
        </div>
      )}

      {/* 自定义确认框 */}
      {showDialog && dialogConfig && (
        <CustomDialog
          title={dialogConfig.title}
          message={dialogConfig.message}
          onConfirm={() => {
            dialogConfig.onConfirm();
            setShowDialog(false);
            setDialogConfig(null);
          }}
          onCancel={() => {
            dialogConfig.onCancel?.();
            setShowDialog(false);
            setDialogConfig(null);
          }}
        />
      )}

      {/* 文本编辑 */}
      {editingText && (
        <input
          ref={textInputRef}
          type="text"
          value={editingText.text}
          onChange={(e) =>
            setEditingText({ ...editingText, text: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              completeTextEditing();
            } else if (e.key === "Escape") {
              setEditingText(null);
            }
          }}
          onBlur={completeTextEditing}
          className="absolute z-30 bg-transparent border-2 border-blue-500 outline-none text-foreground"
          style={{
            left: editingText.x,
            top: editingText.y - editingText.fontSize,
            fontSize: editingText.fontSize,
            fontFamily: "Arial",
            minWidth: "100px",
          }}
        />
      )}

      {/* 画布 */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className={`cursor-${getCursorStyle()}`}
        style={{ display: "block", cursor: getCursorStyle() }}
      />
    </div>
  );
}
