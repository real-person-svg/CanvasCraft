import ShareDB from "sharedb/lib/client";
import ReconnectingWebSocket from "reconnecting-websocket";
import type { CanvasShape, CanvasPath } from "@/types/canvas";

export interface CanvasState {
  paths: CanvasPath[];
  shapes: CanvasShape[];
}

export class CollaborationService {
  private connection: ShareDB.Connection;
  private doc: ShareDB.Doc<CanvasState>;
  private onStateChange: ((state: CanvasState) => void) | null = null;
  private isConnected = false;

  constructor(private canvasId: string) {
    // 连接到WebSocket服务器
    const socket = new ReconnectingWebSocket("ws://localhost:8080");
    this.connection = new ShareDB.Connection(socket as any);

    // 获取或创建文档
    this.doc = this.connection.get("canvases", canvasId);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 文档加载完成
    this.doc.subscribe((err) => {
      if (err) throw err;

      // 如果文档不存在，初始化它
      if (!this.doc.data) {
        this.doc.create({ paths: [], shapes: [] });
      }

      // 初始化时确保 paths 和 shapes 均为数组（新增逻辑）
      if (!Array.isArray(this.doc.data?.paths)) {
        this.doc.submitOp([{ p: ["paths"], oi: [] }]);
      }
      if (!Array.isArray(this.doc.data?.shapes)) {
        this.doc.submitOp([{ p: ["shapes"], oi: [] }]);
      }

      this.isConnected = true;
      this.notifyStateChange();
    });

    // 远程操作触发本地更新
    this.doc.on("op", () => {
      this.notifyStateChange();
    });
  }

  // 订阅文档并初始化（如果需要）
  subscribe(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.doc.subscribe((err) => {
        if (err) {
          reject(err);
          return;
        }
        // 如果文档不存在，初始化它
        if (!this.doc.data) {
          this.doc.create({ paths: [], shapes: [] });
        } else {
          // 订阅时双重校验数组类型（修改逻辑）
          const ops = [];
          if (!Array.isArray(this.doc.data.paths)) {
            ops.push({ p: ["paths"], oi: [] });
          }
          if (!Array.isArray(this.doc.data.shapes)) {
            ops.push({ p: ["shapes"], oi: [] });
          }
          if (ops.length > 0) {
            this.doc.submitOp(ops);
          }
        }
        this.isConnected = true;
        this.notifyStateChange();
        resolve();
      });
    });
  }

  // 新增：统一的状态变化通知方法
  private notifyStateChange() {
    // 确保状态变化回调被调用，即使数据看起来没有变化
    this.onStateChange?.(this.getCurrentState());

    // 为确保触发重渲染，可考虑使用深拷贝创建新对象
    // 这会强制视图识别为新状态而重渲染
    const state = this.getCurrentState();
    const newState = JSON.parse(JSON.stringify(state));
    this.onStateChange?.(newState);
  }

  // 判断是否已连接
  hasConnected(): boolean {
    return this.isConnected;
  }

  // 获取当前画布状态
  getCurrentState(): CanvasState {
    return this.doc.data || { paths: [], shapes: [] };
  }

  // 注册状态变化回调
  onStateChanged(callback: (state: CanvasState) => void) {
    this.onStateChange = callback;
  }

  offStateChanged(callback: (state: CanvasState) => void | null) {
    if (callback === null || this.onStateChange === callback) {
      this.onStateChange = null;
    }
  }

  // 新增：断开连接并清理资源
  disconnect() {
    // 取消文档订阅
    if (this.doc.subscribed) {
      this.doc.unsubscribe();
    }

    // 关闭 ShareDB 连接
    if (this.connection) {
      this.connection.close();
    }

    // 重置状态
    this.isConnected = false;
    this.onStateChange = null;
  }

  // 添加新路径
  addPath(path: CanvasPath) {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 首先检查 paths 是否存在且为数组
      if (!this.doc.data.paths || !Array.isArray(this.doc.data.paths)) {
        // 如果 paths 不存在或不是数组，使用替换操作确保它是一个数组
        this.doc.submitOp([{ p: ["paths"], oi: [path] }]);
      } else {
        // 即使 paths 看起来是数组，我们也使用更安全的方法
        // 1. 先读取当前 paths 数组
        const currentPaths = [...this.doc.data.paths];
        // 2. 添加新路径
        currentPaths.push(path);
        // 3. 使用替换操作整个替换 paths 数组
        this.doc.submitOp([{ p: ["paths"], oi: currentPaths }]);
      }
      this.notifyStateChange();
    } catch (error) {
      console.error("添加路径时出错:", error);
      // 如果出错，尝试直接初始化并添加
      try {
        this.doc.submitOp([{ p: ["paths"], oi: [path] }]);
        this.notifyStateChange();
      } catch (retryError) {
        console.error("重试添加路径失败:", retryError);
      }
    }
  }

  // 添加新形状
  addShape(shape: CanvasShape) {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 首先检查 shapes 是否存在且为数组
      if (!this.doc.data.shapes || !Array.isArray(this.doc.data.shapes)) {
        // 如果 shapes 不存在或不是数组，使用替换操作确保它是一个数组
        this.doc.submitOp([{ p: ["shapes"], oi: [shape] }]);
      } else {
        // 即使 shapes 看起来是数组，我们也使用更安全的方法
        // 1. 先读取当前 shapes 数组
        const currentShapes = [...this.doc.data.shapes];
        // 2. 添加新形状
        currentShapes.push(shape);
        // 3. 使用替换操作整个替换 shapes 数组
        this.doc.submitOp([{ p: ["shapes"], oi: currentShapes }]);
      }
      this.notifyStateChange();
    } catch (error) {
      console.error("添加形状时出错:", error);
      // 如果出错，尝试直接初始化并添加
      try {
        this.doc.submitOp([{ p: ["shapes"], oi: [shape] }]);
        this.notifyStateChange();
      } catch (retryError) {
        console.error("重试添加形状失败:", retryError);
      }
    }
  }

  // 更新路径
  updatePath(id: string, updates: Partial<CanvasPath>) {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 确保 paths 是数组
      if (!this.doc.data.paths || !Array.isArray(this.doc.data.paths)) {
        console.warn("paths 不是数组，无法更新路径");
        return;
      }

      const paths = this.doc.data.paths;
      const index = paths.findIndex((path) => path.id === id);
      if (index === -1) {
        console.warn(`未找到 ID 为 ${id} 的路径`);
        return;
      }

      const targetPath = paths[index];
      if (!targetPath) {
        console.warn(`路径索引 ${index} 对应的对象不存在`);
        return;
      }

      // 为每个要更新的属性创建操作
      const ops: any[] = [];

      // 递归处理深层嵌套对象的函数
      const processUpdates = (
        updates: any,
        target: any,
        basePath: (string | number)[]
      ) => {
        Object.entries(updates).forEach(([key, value]) => {
          const currentPath = [...basePath, key];

          // 检查是否为深层嵌套对象且两边都是对象类型
          if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            target[key] !== null &&
            typeof target[key] === "object" &&
            !Array.isArray(target[key])
          ) {
            // 递归处理嵌套对象
            processUpdates(value, target[key], currentPath);
          } else {
            // 创建更新操作 - 确保路径中的所有元素都是字符串
            const operation: any = {
              p: currentPath.map((item) => String(item)), // 转换所有元素为字符串
              oi: value, // 新值
            };

            // 安全地获取旧值
            if (Object.prototype.hasOwnProperty.call(target, key)) {
              operation.od = target[key]; // 旧值
            }

            ops.push(operation);
          }
        });
      };

      // 开始处理更新，基础路径为 ["paths", index]
      processUpdates(updates, targetPath, ["paths", index]);

      // 提交操作到 ShareDB
      if (ops.length > 0) {
        this.doc.submitOp(ops);
        this.notifyStateChange();
      }
    } catch (error) {
      console.error("更新路径时出错:", error);

      // 尝试更安全的方式：复制整个数组进行修改后替换（回退策略）
      try {
        if (this.doc.data?.paths && Array.isArray(this.doc.data.paths)) {
          const updatedPaths = [...this.doc.data.paths];
          const index = updatedPaths.findIndex((path) => path.id === id);
          if (index !== -1 && updatedPaths[index]) {
            // 创建一个新的路径对象，深度合并现有属性和更新的属性
            const deepMerge = (target: any, source: any): any => {
              const output = { ...target };
              if (
                target &&
                source &&
                typeof target === "object" &&
                typeof source === "object"
              ) {
                Object.keys(source).forEach((key) => {
                  if (
                    source[key] &&
                    typeof source[key] === "object" &&
                    !Array.isArray(source[key])
                  ) {
                    if (!(key in target))
                      Object.assign(output, { [key]: source[key] });
                    else output[key] = deepMerge(target[key], source[key]);
                  } else {
                    Object.assign(output, { [key]: source[key] });
                  }
                });
              }
              return output;
            };

            // 深度合并更新
            updatedPaths[index] = deepMerge(updatedPaths[index], updates);

            // 使用替换操作更新整个数组
            this.doc.submitOp([
              {
                p: ["paths"],
                oi: updatedPaths,
                od: this.doc.data.paths, // 提供旧数组作为上下文
              },
            ]);
            this.notifyStateChange();
          }
        }
      } catch (retryError) {
        console.error("重试更新路径失败:", retryError);
      }
    }
  }

  // 更新形状
  updateShape(id: string, updates: Partial<CanvasShape>) {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 确保 shapes 是数组
      if (!this.doc.data.shapes || !Array.isArray(this.doc.data.shapes)) {
        console.warn("shapes 不是数组，无法更新形状");
        return;
      }

      const shapes = this.doc.data.shapes;
      const index = shapes.findIndex((shape) => shape.id === id);
      if (index === -1) {
        console.warn(`未找到 ID 为 ${id} 的形状`);
        return;
      }

      const targetShape = shapes[index];
      if (!targetShape) {
        console.warn(`形状索引 ${index} 对应的对象不存在`);
        return;
      }

      // 为每个要更新的属性创建操作
      const ops: any[] = [];

      // 递归处理深层嵌套对象的函数
      const processUpdates = (
        updates: any,
        target: any,
        basePath: (string | number)[]
      ) => {
        Object.entries(updates).forEach(([key, value]) => {
          const currentPath = [...basePath, key];

          // 检查是否为深层嵌套对象且两边都是对象类型
          if (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            target[key] !== null &&
            typeof target[key] === "object" &&
            !Array.isArray(target[key])
          ) {
            // 递归处理嵌套对象
            processUpdates(value, target[key], currentPath);
          } else {
            // 创建更新操作 - 确保路径中的所有元素都是字符串
            const operation: any = {
              p: currentPath.map((item) => String(item)), // 转换所有元素为字符串
              oi: value, // 新值
            };

            // 安全地获取旧值
            if (Object.prototype.hasOwnProperty.call(target, key)) {
              operation.od = target[key]; // 旧值
            }

            ops.push(operation);
          }
        });
      };

      // 开始处理更新，基础路径为 ["shapes", index]
      processUpdates(updates, targetShape, ["shapes", index]);

      // 提交操作到 ShareDB
      if (ops.length > 0) {
        this.doc.submitOp(ops);
        this.notifyStateChange();
      }
    } catch (error) {
      console.error("更新形状时出错:", error);

      // 尝试更安全的方式：复制整个数组进行修改后替换（回退策略）
      try {
        if (this.doc.data?.shapes && Array.isArray(this.doc.data.shapes)) {
          const updatedShapes = [...this.doc.data.shapes];
          const index = updatedShapes.findIndex((shape) => shape.id === id);
          if (index !== -1 && updatedShapes[index]) {
            // 创建一个新的形状对象，深度合并现有属性和更新的属性
            const deepMerge = (target: any, source: any): any => {
              const output = { ...target };
              if (
                target &&
                source &&
                typeof target === "object" &&
                typeof source === "object"
              ) {
                Object.keys(source).forEach((key) => {
                  if (
                    source[key] &&
                    typeof source[key] === "object" &&
                    !Array.isArray(source[key])
                  ) {
                    if (!(key in target))
                      Object.assign(output, { [key]: source[key] });
                    else output[key] = deepMerge(target[key], source[key]);
                  } else {
                    Object.assign(output, { [key]: source[key] });
                  }
                });
              }
              return output;
            };

            // 深度合并更新
            updatedShapes[index] = deepMerge(updatedShapes[index], updates);

            // 使用替换操作更新整个数组
            this.doc.submitOp([
              {
                p: ["shapes"],
                oi: updatedShapes,
                od: this.doc.data.shapes, // 提供旧数组作为上下文
              },
            ]);
            this.notifyStateChange();
          }
        }
      } catch (retryError) {
        console.error("重试更新形状失败:", retryError);
      }
    }
  }

  // 删除选中的元素
  deleteSelected(ids: string[]) {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 确保 paths 和 shapes 都是数组
      const safePaths =
        this.doc.data.paths && Array.isArray(this.doc.data.paths)
          ? this.doc.data.paths
          : [];
      const safeShapes =
        this.doc.data.shapes && Array.isArray(this.doc.data.shapes)
          ? this.doc.data.shapes
          : [];

      // 创建新数组，过滤掉要删除的元素
      const newPaths = safePaths.filter((path) => !ids.includes(path.id));
      const newShapes = safeShapes.filter((shape) => !ids.includes(shape.id));

      // 使用替换操作更新整个数组
      const ops = [];
      if (newPaths.length !== safePaths.length) {
        ops.push({ p: ["paths"], oi: newPaths });
      }
      if (newShapes.length !== safeShapes.length) {
        ops.push({ p: ["shapes"], oi: newShapes });
      }

      if (ops.length > 0) {
        this.doc.submitOp(ops);
        this.notifyStateChange();
      }
    } catch (error) {
      console.error("删除元素时出错:", error);

      // 尝试更简单的方式：直接清空并重建（仅作为最后手段）
      try {
        const safePaths =
          this.doc.data.paths && Array.isArray(this.doc.data.paths)
            ? this.doc.data.paths.filter((path) => !ids.includes(path.id))
            : [];
        const safeShapes =
          this.doc.data.shapes && Array.isArray(this.doc.data.shapes)
            ? this.doc.data.shapes.filter((shape) => !ids.includes(shape.id))
            : [];

        this.doc.submitOp([
          { p: ["paths"], oi: safePaths },
          { p: ["shapes"], oi: safeShapes },
        ]);
        this.notifyStateChange();
      } catch (retryError) {
        console.error("重试删除元素失败:", retryError);
      }
    }
  }

  // 清空画布
  clearCanvas() {
    if (!this.hasConnected() || !this.doc.data) return; // 未连接时直接返回

    try {
      // 使用替换操作将 paths 和 shapes 都设置为空数组
      this.doc.submitOp([
        { p: ["paths"], oi: [] },
        { p: ["shapes"], oi: [] },
      ]);
      this.notifyStateChange();
    } catch (error) {
      console.error("清空画布时出错:", error);

      // 尝试分别清空（作为备用方案）
      try {
        // 先清空 paths
        this.doc.submitOp([{ p: ["paths"], oi: [] }]);
        // 再清空 shapes
        this.doc.submitOp([{ p: ["shapes"], oi: [] }]);
        this.notifyStateChange();
      } catch (retryError) {
        console.error("重试清空画布失败:", retryError);
      }
    }
  }
}
