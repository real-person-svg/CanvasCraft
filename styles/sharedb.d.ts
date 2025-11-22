// 正确的Sharedb模块类型声明
declare module "sharedb/lib/client" {
  // 定义ShareDB作为一个值，同时包含命名空间
  interface ShareDB {
    Connection: new (socket: any) => ShareDB.Connection;
    types: { register: (name: string, type: any) => void };
  }

  // 保持命名空间定义，以便在类型注解中使用
  namespace ShareDB {
    interface Connection {
      get<D = any>(collection: string, id: string): Doc<D>;
      close(): void;
    }

    interface Doc<D = any> {
      data: D | null;
      subscribed: boolean;
      subscribe(callback: (err?: Error) => void): void;
      unsubscribe(): void;
      on(event: string, callback: (...args: any[]) => void): void;
      create(data: D): void;
      submitOp(ops: any[]): void;
    }
  }

  // 导出ShareDB作为一个值
  const ShareDB: ShareDB;
  export = ShareDB;
}

// ReconnectingWebSocket模块的类型声明
declare module "reconnecting-websocket" {
  class ReconnectingWebSocket {
    constructor(url: string, protocols?: string | string[]);
    send(data: string): void;
    close(code?: number, reason?: string): void;
    onopen?: (event: Event) => void;
    onclose?: (event: Event) => void;
    onmessage?: (event: MessageEvent) => void;
    onerror?: (event: Event) => void;
    readyState: number;
  }
  export = ReconnectingWebSocket;
}
