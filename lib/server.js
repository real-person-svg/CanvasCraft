const http = require("http");
const ShareDB = require("sharedb");
const WebSocketJSONStream = require("@teamwork/websocket-json-stream");
const WebSocket = require("ws");
const express = require("express");

const app = express();
const server = http.createServer(app);

// 配置WebSocket服务器选项以提高性能
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // 设置较低的压缩级别以减少CPU使用
      level: 1,
    },
    // 禁用服务器端上下文接管
    serverNoContextTakeover: true,
    // 禁用客户端上下文接管
    clientNoContextTakeover: true,
  },
  // 设置心跳检测
  heartbeat: {
    interval: 30000, // 30秒
    timeout: 60000, // 60秒
  },
});

// 创建接口，返回当前连接数
app.get("/api/connection-count", (req, res) => {
  res.json({ count: wss.clients.size });
});

// 初始化ShareDB实例
const share = new ShareDB({
  // 添加垃圾回收配置
  gc: { interval: 3600000 }, // 每小时运行一次垃圾回收
});

// 启用JSON0类型
share.use("json0");

// 处理WebSocket连接
wss.on("connection", (ws) => {
  // 为每个连接创建一个流
  const stream = new WebSocketJSONStream(ws);

  // 添加错误处理
  stream.on("error", (err) => {
    console.error("Stream error:", err);
  });

  // 让ShareDB监听这个流
  share.listen(stream);
});

// 添加WebSocket错误处理
wss.on("error", (err) => {
  console.error("WebSocket Server error:", err);
});

// 记录连接数
wss.on("connection", () => {
  console.log(`连接数: ${wss.clients.size}`);
  // 连接建立时清除任何等待关闭的定时器
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  // if (isCollaborating === false) {
  //   console.log("只有一个客户端开启协作模式，正在关闭服务器...");
  //   gracefulShutdown();
  // }
});

let closeTimer = null;

wss.on("close", () => {
  const clientCount = wss.clients.size;
  console.log(`连接数: ${clientCount}`);

  // 当所有客户端断开连接时，启动关闭定时器
  if (clientCount === 1) {
    console.log("客户端已断开连接，将在15秒后自动关闭服务器...");
    closeTimer = setTimeout(() => {
      console.log("只有一个客户端已关闭协作模式，正在关闭服务器...");
      gracefulShutdown();
    }, 15000); // 15秒延迟，确保临时断开的连接有时间重连
  }
});

// 添加HTTP服务器错误处理
server.on("error", (err) => {
  console.error("Server error:", err);

  // 区分不同类型的错误
  if (err.code === "EADDRINUSE") {
    console.error("端口8080已被占用，请关闭其他占用该端口的程序");
  }
});

// 优雅关闭服务器
function gracefulShutdown() {
  console.log("正在关闭服务器...");

  // 关闭所有WebSocket连接
  wss.clients.forEach((client) => {
    client.close();
  });

  // 关闭HTTP服务器
  server.close(() => {
    console.log("服务器已关闭");
    process.exit(0);
  });
}

// 处理SIGTERM信号
process.on("SIGTERM", () => {
  gracefulShutdown();
});

// 启动服务器
server.listen(8080, () => {
  console.log("ShareDB服务器运行在 ws://localhost:8080");
});
