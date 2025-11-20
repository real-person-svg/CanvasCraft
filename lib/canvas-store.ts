import { create } from "zustand";
import type { CanvasPath, CanvasShape, Tool } from "@/types/canvas";

interface CanvasStore {
  // 基础工具和状态
  tool: Tool;
  setTool: (tool: Tool) => void;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;

  // 绘图和显示属性
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;
  rotation: number;
  setRotation: (rotation: number) => void;

  // 显示选项
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enable: boolean) => void;

  // 画布内容
  paths: CanvasPath[];
  shapes: CanvasShape[];
  currentPath: number[];
  setCurrentPath: (path: number[]) => void;

  // 操作方法
  addPath: (path: CanvasPath) => void;
  addShape: (shape: CanvasShape) => void;
  updateShape: (id: string, updates: Partial<CanvasShape>) => void;
  deleteShape: (id: string) => void;
  deletePath: (id: string) => void;
  clearPaths: () => void;
  clearShapes: () => void;
  clearCanvas: () => void;

  // 选择管理
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  // 画布变换
  stagePos: { x: number; y: number };
  setStagePos: (pos: { x: number; y: number }) => void;
  stageScale: number;
  setStageScale: (scale: number) => void;

  // 画布操作
  fitToScreen: () => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // 历史记录
  history: { paths: CanvasPath[]; shapes: CanvasShape[] }[];
  historyIndex: number;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 本地存储 - 支持单文件和多文件存储
  saveToLocalStorage: (name?: string) => void;
  loadFromLocalStorage: (name?: string) => boolean;
  getSavedDrawings: () => string[];
  deleteSavedDrawing: (name: string) => void;

  // 图像功能
  importImage: (
    src: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
  updateImage: (id: string, updates: Partial<CanvasShape>) => void;

  // 主题相关
  updateStrokeForTheme: (isDark: boolean) => void;
}

// 初始化数据加载
const loadInitialData = () => {
  if (typeof window === "undefined") {
    return { paths: [], shapes: [] };
  }

  try {
    const savedData = localStorage.getItem("CanvasCraft-canvas-data");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.paths && parsed.shapes) {
        return { paths: parsed.paths, shapes: parsed.shapes };
      }
    }
  } catch (error) {
    console.error("Failed to load initial data from localStorage:", error);
  }

  return { paths: [], shapes: [] };
};

const initialData = loadInitialData();

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // 基础工具和状态
  tool: "pen",
  setTool: (tool) => set({ tool }),
  isDrawing: false,
  setIsDrawing: (isDrawing) => set({ isDrawing }),

  // 绘图和显示属性
  strokeColor: "#000000",
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  strokeWidth: 2,
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  fillColor: "transparent",
  setFillColor: (fillColor) => set({ fillColor }),
  opacity: 1,
  setOpacity: (opacity) => set({ opacity }),
  rotation: 0,
  setRotation: (rotation) => set({ rotation }),

  // 显示选项
  showGrid: true,
  setShowGrid: (showGrid) => set({ showGrid }),
  snapEnabled: true,
  setSnapEnabled: (enable) => set({ snapEnabled: enable }),

  // 画布内容
  paths: initialData.paths,
  shapes: initialData.shapes,
  currentPath: [],
  setCurrentPath: (currentPath) => set({ currentPath }),

  // 操作方法
  addPath: (path) => {
    set((state) => ({ paths: [...state.paths, path] }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  addShape: (shape) => {
    set((state) => ({ shapes: [...state.shapes, shape] }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
    }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  deletePath: (id) => {
    set((state) => ({
      paths: state.paths.filter((path) => path.id !== id),
    }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  clearPaths: () => {
    set({ paths: [] });
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  clearShapes: () => {
    set({ shapes: [] });
    get().saveToHistory();
    get().saveToLocalStorage();
  },
  clearCanvas: () => {
    set({ paths: [], shapes: [], selectedIds: [] });
    get().saveToHistory();
    get().saveToLocalStorage();
  },

  // 选择管理
  selectedIds: [],
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  addToSelection: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds
        : [...state.selectedIds, id],
    }));
  },
  removeFromSelection: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    }));
  },
  clearSelection: () => set({ selectedIds: [] }),
  deleteSelected: () => {
    const { selectedIds } = get();
    set((state) => ({
      shapes: state.shapes.filter((shape) => !selectedIds.includes(shape.id)),
      paths: state.paths.filter((path) => !selectedIds.includes(path.id)),
      selectedIds: [],
    }));
    get().saveToHistory();
    get().saveToLocalStorage();
  },

  // 画布变换
  stagePos: { x: 0, y: 0 },
  setStagePos: (stagePos) => set({ stagePos }),
  stageScale: 1,
  setStageScale: (stageScale) => set({ stageScale }),

  // 画布操作
  fitToScreen: () => {
    set({ stagePos: { x: 0, y: 0 }, stageScale: 1 });
  },
  resetZoom: () => {
    set({ stageScale: 1 });
  },
  zoomIn: () => {
    const currentScale = get().stageScale;
    const newScale = Math.min(currentScale * 1.2, 5); // Max zoom 5x
    set({ stageScale: newScale });
  },
  zoomOut: () => {
    const currentScale = get().stageScale;
    const newScale = Math.max(currentScale / 1.2, 0.1); // Min zoom 0.1x
    set({ stageScale: newScale });
  },

  // 历史记录
  history:
    initialData.paths.length > 0 || initialData.shapes.length > 0
      ? [{ paths: initialData.paths, shapes: initialData.shapes }]
      : [],
  historyIndex:
    initialData.paths.length > 0 || initialData.shapes.length > 0 ? 0 : -1,
  saveToHistory: () => {
    const { paths, shapes, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ paths: [...paths], shapes: [...shapes] });

    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      set({ historyIndex: historyIndex + 1 });
    }

    set({ history: newHistory });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        paths: [...prevState.paths],
        shapes: [...prevState.shapes],
        historyIndex: historyIndex - 1,
        selectedIds: [],
      });
      get().saveToLocalStorage();
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        paths: [...nextState.paths],
        shapes: [...nextState.shapes],
        historyIndex: historyIndex + 1,
        selectedIds: [],
      });
      get().saveToLocalStorage();
    }
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // 本地存储 - 支持单文件和多文件存储
  saveToLocalStorage: (name?: string) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const { paths, shapes } = get();
      const dataToSave = { paths, shapes };

      // 如果提供了名称，使用多文件存储模式
      if (name) {
        const exportData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          paths,
          shapes,
        };
        const jsonData = JSON.stringify(exportData, null, 2);
        const savedDrawings = JSON.parse(
          localStorage.getItem("excalidraw-drawings") || "{}"
        );
        savedDrawings[name] = {
          data: jsonData,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(
          "excalidraw-drawings",
          JSON.stringify(savedDrawings)
        );
      } else {
        // 否则使用单文件存储模式
        localStorage.setItem(
          "CanvasCraft-canvas-data",
          JSON.stringify(dataToSave)
        );
      }
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
    }
  },
  loadFromLocalStorage: (name?: string) => {
    try {
      // Check if we're in the browser (client-side)
      if (typeof window === "undefined") {
        return false;
      }

      // 如果提供了名称，使用多文件加载模式
      if (name) {
        const savedDrawings = JSON.parse(
          localStorage.getItem("excalidraw-drawings") || "{}"
        );
        const drawing = savedDrawings[name];

        if (drawing && drawing.data) {
          // 直接解析数据
          const data = JSON.parse(drawing.data);

          // Validate data structure
          if (
            !data.paths ||
            !data.shapes ||
            !Array.isArray(data.paths) ||
            !Array.isArray(data.shapes)
          ) {
            return false;
          }

          set({
            paths: data.paths,
            shapes: data.shapes,
            selectedIds: [],
          });

          get().saveToHistory();
          return true;
        }
        return false;
      } else {
        // 否则使用单文件加载模式
        const savedData = localStorage.getItem("CanvasCraft-canvas-data");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.paths && parsed.shapes) {
            set({
              paths: parsed.paths,
              shapes: parsed.shapes,
              selectedIds: [],
            });
            get().saveToHistory();
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      return false;
    }
  },
  getSavedDrawings: () => {
    try {
      // Check if we're in the browser (client-side)
      if (typeof window === "undefined") {
        return [];
      }
      const savedDrawings = JSON.parse(
        localStorage.getItem("excalidraw-drawings") || "{}"
      );
      return Object.keys(savedDrawings).sort((a, b) => {
        const timeA = new Date(savedDrawings[a].timestamp).getTime();
        const timeB = new Date(savedDrawings[b].timestamp).getTime();
        return timeB - timeA; // Most recent first
      });
    } catch (error) {
      console.error("Failed to get saved drawings:", error);
      return [];
    }
  },
  deleteSavedDrawing: (name: string) => {
    try {
      // Check if we're in the browser (client-side)
      if (typeof window === "undefined") {
        return;
      }
      const savedDrawings = JSON.parse(
        localStorage.getItem("excalidraw-drawings") || "{}"
      );
      delete savedDrawings[name];
      localStorage.setItem(
        "excalidraw-drawings",
        JSON.stringify(savedDrawings)
      );
    } catch (error) {
      console.error("Failed to delete saved drawing:", error);
    }
  },

  // 图像功能
  importImage: (src, x, y, width, height) => {
    const newShape: CanvasShape = {
      id: Math.random().toString(36).substring(7),
      type: "image",
      x,
      y,
      width,
      height,
      src,
      stroke: "#000000",
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      filter: "none",
    };
    get().addShape(newShape);
  },
  updateImage: (id, updates) => {
    const shapeIndex = get().shapes.findIndex((s) => s.id === id);
    if (shapeIndex !== -1) {
      get().updateShape(id, updates);
    }
  },

  // 主题相关
  updateStrokeForTheme: (isDark) => {
    const currentColor = get().strokeColor;
    // Only update if using default black or white colors
    if (currentColor === "#000000" || currentColor === "#ffffff") {
      set({ strokeColor: isDark ? "#ffffff" : "#000000" });
    }
  },
}));
