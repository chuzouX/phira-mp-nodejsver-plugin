# Phira Multiplayer Server — Plugin SDK

本仓库为 [phira-mp-nodejsver](https://github.com/chuzouX/phira-mp-nodejsver) 服务端的**插件开发工具包**。

社区开发者无需服务端源码，只需本仓库中的类型声明文件和示例即可开发插件。

---

## 快速开始

### JavaScript 插件（推荐入门）

最简单的方式 — 直接编写 `.js` 文件，无需编译：

1. 在服务端 `plugins/` 下创建插件目录
2. 编写 `index.js`
3. 启动服务器，自动加载

```js
// plugins/my-plugin/index.js

/** @type {PhiraPlugin.PluginModule} */
module.exports = {
  name: 'my-plugin',

  init(api) {
    api.logger.info('[my-plugin] 已加载');

    // 监听玩家认证事件
    api.events.on('player:auth:success', ({ user }) => {
      api.logger.info('[my-plugin] 欢迎 ' + user.name + '!');
    });

    // 注册 HTTP 路由（需要 ENABLE_WEB_SERVER=true）
    api.registerRoute('get', '/api/my-plugin/hello', (_req, res) => {
      res.json({ message: 'hello', players: api.protocolHandler.getSessionCount() });
    });

    // 注册控制台命令（/greet 张三）
    api.registerCommand('greet', (name) => {
      api.logger.info('[my-plugin] 你好, ' + (name || '世界') + '!');
    });
  },

  destroy() {
    // 清理资源（可选）
  }
};
```

如需 JSDoc 类型提示，下载本仓库的 `plugin-api.d.ts` 放在项目中，编辑器会自动识别 `PhiraPlugin.*` 命名空间。

### TypeScript 插件

适合大型插件，拥有完整类型检查：

**1. 获取类型声明**

```bash
# 下载 plugin-api.d.ts 到你的插件项目
curl -o plugin-api.d.ts https://raw.githubusercontent.com/chuzouX/phira-mp-nodejsver-plugin/main/plugin-api.d.ts
```

**2. 配置 tsconfig.json**

可直接复制本仓库的 `tsconfig.example.json`：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./",
    "rootDir": "./",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["plugin-api.d.ts", "**/*.ts"],
  "exclude": ["node_modules", "**/*.js"]
}
```

**3. 编写插件**

```ts
import type { PluginModule, PluginApi } from 'phira-plugin-api';

const pluginModule: PluginModule = {
  name: 'my-plugin',

  init(api: PluginApi) {
    api.logger.info('[my-plugin] 已加载');
  },

  destroy() {},
};

export default pluginModule;
```

**4. 编译并部署**

```bash
npx tsc
```

将生成的 `index.js` 和资源文件放入服务端的 `plugins/my-plugin/` 目录即可。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `plugin-api.d.ts` | 独立类型声明，包含插件开发所需的全部类型定义 |
| `tsconfig.example.json` | TypeScript 插件推荐配置 |
| `example/index.js` | JS 示例插件（即用型，直接复制到 `plugins/` 即可运行） |
| `example/index.ts` | TS 示例插件（开发参考，需编译后使用） |

---

## 插件生命周期

```
服务器启动
  → TCP / HTTP 服务就绪
  → 联邦节点启动（如已启用）
  → 按目录名字母序扫描 plugins/
  → 对每个插件: require(index.js) → 调用 init(api)
  → 控制台就绪

服务器关闭
  → 对每个插件: 调用 destroy()
  → 联邦停止 → TCP / HTTP 停止
```

- 服务端优先加载 `index.js`
- 加载顺序由目录名决定，可通过前缀控制（如 `00-base`、`01-dashboard`）
- `init` 支持 `async`
- `destroy` 中应清理所有资源

---

## PluginApi 参考

### 上下文属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `config` | `ServerConfig` | 服务器配置（只读） |
| `logger` | `Logger` | 日志记录器（`info` / `debug` / `warn` / `error` / `ban` / `command`） |
| `roomManager` | `RoomManager` | 房间管理器 |
| `protocolHandler` | `ProtocolHandler` | 协议处理器（管理玩家会话） |
| `networkServer` | `NetworkServer` | TCP 服务器实例 |
| `httpServer` | `HttpServer \| undefined` | HTTP 服务器（`ENABLE_WEB_SERVER=false` 时为 `undefined`） |
| `banManager` | `BanManager` | 封禁管理器 |
| `federationManager` | `FederationManager \| undefined` | 联邦管理器（未启用时为 `undefined`） |
| `pluginName` | `string` | 当前插件名称 |

### 事件总线 (`api.events`)

```js
// 监听事件，返回取消函数
const unsub = api.events.on('player:auth:success', ({ user }) => {
  api.logger.info('玩家 ' + user.name + ' 已认证');
});
unsub(); // 取消监听

// 触发自定义事件
api.events.emit('custom:my-event', { data: 123 });
await api.events.emitAsync('custom:my-event', { data: 123 });
```

### HTTP 路由

需要 `ENABLE_WEB_SERVER=true`。

```js
api.registerRoute('get', '/api/my-plugin/status', (req, res) => {
  res.json({ ok: true });
});
// 支持: get, post, put, patch, delete, options, head, use

// 挂载静态文件
const path = require('path');
api.serveStatic('/my-plugin', path.join(__dirname, 'public'));

// 获取 Express 实例
const app = api.getExpressApp();
```

### 控制台命令

```js
api.registerCommand('greet', (name) => {
  api.logger.info('你好, ' + (name || '世界') + '!');
});
// 控制台输入: /greet 张三
```

### 数据包处理器

```js
api.registerPacketHandler({
  commandType: 0x10,
  handler: async ({ connectionId, command }) => {
    api.logger.debug('收到数据包来自 ' + connectionId);
  },
});
```

### WebSocket / 房间广播

```js
// 向所有 WebSocket 客户端广播（需 websocket 插件）
api.broadcastWs('my-event', { message: 'hello' });

// 向指定房间广播协议命令
api.broadcastToRoom(roomId, serverCommand);
```

### 插件配置

配置以 YAML 格式存储在 `config/<plugin-name>/config.yaml`。

```js
const cfg = api.readPluginConfig();           // 读取（不存在返回 undefined）
api.writePluginConfig({ greeting: '你好' });  // 写入（自动创建目录）
const dir = api.getPluginConfigDir();          // → "config/my-plugin"
```

---

## 事件参考

| 事件名 | 载荷 | 触发时机 |
|--------|------|----------|
| `player:connect` | `{ connectionId, ip }` | TCP 连接建立 |
| `player:auth:success` | `{ connectionId, user, ip }` | 认证成功 |
| `player:disconnect` | `{ connectionId, userId?, user?, ip? }` | 断开连接 |
| `room:beforeCreate` | `{ connectionId, userId, roomId }` | 房间创建前 |
| `room:create` | `{ room, user, connectionId }` | 房间创建后 |
| `room:join` | `{ room, user, connectionId }` | 玩家加入房间 |
| `room:leave` | `{ roomId, userId, userName, connectionId }` | 玩家离开房间 |
| `room:gameStart` | `{ room, triggeredBy, mode }` | 游戏开始 |
| `room:gameEnd` | `{ room, rankings }` | 游戏结束 |
| `protocol:beforeHandle` | `{ connectionId, command }` | 协议命令处理前 |
| `protocol:afterHandle` | `{ connectionId, command }` | 协议命令处理后 |
| `chat:message` | `{ room, userId, content, connectionId }` | 聊天消息 |
| `custom:*` | `any` | 自定义事件 |

`user` 为 `UserInfo`（含 `id`, `name` 等），`room` 为 `Room`，`command` 为 `ClientCommand`。

`room:gameStart` 的 `mode`：`'ready'`（全员准备）、`'solo-confirm'`（单人确认）、`'force'`（管理员强制）。

---

## 相关链接

- [phira-mp-nodejsver](https://github.com/chuzouX/phira-mp-nodejsver) — 服务端主仓库
- [Phira](https://phira.moe) — Phira 音游
