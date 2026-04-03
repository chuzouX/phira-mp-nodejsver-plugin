/**
 * 示例插件 — 展示插件系统核心 API 的用法
 *
 * 使用方式:
 *   将整个 example 目录复制到服务端的 plugins/ 目录下，启动服务器即可自动加载。
 *
 * 目录结构:
 *   plugins/example/index.js       <- 插件入口
 *   config/example/config.yaml     <- 插件配置（首次运行自动生成）
 */

const unsubscribers = [];

/** @type {PhiraPlugin.PluginModule} */
module.exports = {
  name: 'example',

  init(api) {
    const cfg = api.readPluginConfig() || {};
    const greeting = cfg.greeting || '你好';
    api.logger.info('[示例插件] 已加载，问候语: "' + greeting + '"');

    unsubscribers.push(
      api.events.on('player:auth:success', ({ user }) => {
        api.logger.info('[示例插件] ' + greeting + ', ' + user.name + '!');
      }),
    );

    unsubscribers.push(
      api.events.on('room:create', ({ room, user }) => {
        api.logger.info('[示例插件] ' + user.name + ' 创建了房间 ' + room.name);
      }),
    );

    unsubscribers.push(
      api.events.on('chat:message', ({ room, userId, content }) => {
        api.logger.debug('[示例插件] 房间 ' + room.name + ' 中用户 ' + userId + ' 说: ' + content);
      }),
    );

    api.registerRoute('get', '/api/example/hello', (_req, res) => {
      res.json({
        message: greeting,
        onlinePlayers: api.protocolHandler.getSessionCount(),
        roomCount: api.roomManager.listRooms().length,
      });
    });

    api.registerCommand('hello', (name) => {
      api.logger.info('[示例插件] ' + greeting + ', ' + (name || '世界') + '!');
    });

    if (!cfg.greeting) {
      api.writePluginConfig({ greeting: greeting });
      api.logger.info('[示例插件] 已生成默认配置到 ' + api.getPluginConfigDir() + '/config.yaml');
    }
  },

  destroy() {
    unsubscribers.forEach((unsub) => unsub());
    unsubscribers.length = 0;
  },
};
