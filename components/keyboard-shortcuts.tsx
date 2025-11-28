"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/lib/canvas-store";

export function KeyboardShortcuts() {
  const {
    tool,
    setTool,
    undo,
    redo,
    deleteSelected,
    clearSelection,
    clearPaths,
    clearShapes,
    stageScale,
    setStageScale,
    setStagePos,
    snapEnabled,
    setSnapEnabled,
    importImage,
    shapes,
    setSelectedIds,
  } = useCanvasStore();

  const handleImagesClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
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
      }
    };
    input.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止在输入框中触发快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // 撤销/重做快捷键
      if (isCtrl && e.key === "z" && !isShift) {
        e.preventDefault();
        undo();
        return;
      }
      if (isCtrl && (e.key === "y" || (e.key === "z" && isShift))) {
        e.preventDefault();
        redo();
        return;
      }
      if (isCtrl && e.key === "s") {
        e.preventDefault();
        setSnapEnabled(!snapEnabled);
        return;
      }

      // 工具选择快捷键
      if (!isCtrl) {
        switch (e.key) {
          case "v":
          case "1":
            setTool("select");
            break;
          case "h":
          case "2":
            setTool("hand");
            break;
          case "p":
          case "3":
            setTool("pen");
            break;
          case "l":
          case "4":
            setTool("line");
            break;
          case "r":
          case "5":
            setTool("rectangle");
            break;
          case "c":
          case "6":
            setTool("circle");
            break;
          case "a":
          case "7":
            setTool("arrow");
            break;
          case "t":
          case "8":
            setTool("text");
            break;
          case "i":
          case "9":
            setTool("image");
            handleImagesClick();
            break;
        }
      }

      // 删除选中的形状（Delete/Backspace）
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // 退出选中的形状（Esc）
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // 全选（Ctrl+A）
      if (isCtrl && e.key === "a") {
        e.preventDefault();
        setSelectedIds(shapes.map((shape) => shape.id));
        return;
      }

      // 清空画布（Ctrl+Shift+Delete）
      if (isCtrl && isShift && e.key === "Delete") {
        e.preventDefault();
        if (confirm("清空画布?")) {
          clearPaths();
          clearShapes();
          clearSelection();
        }
        return;
      }

      // 缩放控制（使用 Ctrl）
      if (isCtrl) {
        switch (e.key) {
          case "=":
          case "+":
            e.preventDefault();
            setStageScale(Math.min(5, stageScale * 1.2));
            break;
          case "-":
            e.preventDefault();
            setStageScale(Math.max(0.1, stageScale / 1.2));
            break;
          case "0":
            e.preventDefault();
            setStageScale(1);
            setStagePos({ x: 0, y: 0 });
            break;
          case "1":
            e.preventDefault();
            setStageScale(1);
            setStagePos({ x: 0, y: 0 });
            break;
        }
      }

      // 缩放控制（不使用 Ctrl）
      if (!isCtrl) {
        switch (e.key) {
          case "+":
          case "=":
            e.preventDefault();
            setStageScale(Math.min(5, stageScale * 1.2));
            break;
          case "-":
            e.preventDefault();
            setStageScale(Math.max(0.1, stageScale / 1.2));
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    tool,
    setTool,
    undo,
    redo,
    deleteSelected,
    clearSelection,
    clearPaths,
    clearShapes,
    stageScale,
    setStageScale,
    setStagePos,
  ]);

  return null; // 不需要渲染任何内容，只用于监听键盘事件
}
