# 飞书渠道集成指南

## 概述

MyClaw 飞书渠道插件允许你通过飞书聊天机器人与 MyClaw 智能助手进行交互。

## 功能特性

- ✅ 接收飞书群消息
- ✅ 发送文本消息到飞书群
- ✅ 支持图片消息
- ✅ 支持富文本 (post) 消息解析
- ✅ 聊天室与飞书群映射
- ✅ Webhook 事件订阅

## 前置条件

1. 飞书开放平台应用
2. 公网可访问的服务器（用于接收 webhook）
3. Node.js 20+

## 配置步骤

### 1. 创建飞书开放平台应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`

### 2. 配置应用权限

在飞书开放平台为应用添加以下权限：

- 发送消息
- 接收消息
- 群组机器人

### 3. 配置事件订阅

1. 在应用管理页面，进入 "事件订阅"
2. 开启事件订阅，获取 `Verification Token`
3. 配置订阅地址（你的服务器地址 + `/api/feishu/webhook`）
4. 订阅以下事件：
   - `im.message.receive_v1` - 接收消息事件

### 4. 配置环境变量

在项目根目录创建或编辑 `.env` 文件：

```bash
# 飞书配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxx
FEISHU_VERIFICATION_TOKEN=xxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxx  # 可选，如果开启了消息加密
FEISHU_WEBHOOK_PORT=3001  # Webhook 监听端口
```

### 5. 配置飞书渠道

编辑 `config/feishu.json`:

```json
{
  "enabled": true,
  "appId": "${FEISHU_APP_ID}",
  "appSecret": "${FEISHU_APP_SECRET}",
  "verificationToken": "${FEISHU_VERIFICATION_TOKEN}",
  "encryptKey": "${FEISHU_ENCRYPT_KEY}",
  "debug": false,
  "roomMappings": {
    "chat_id_1": "room_id_1",
    "chat_id_2": "room_id_2"
  }
}
```

## 使用方法

### 启动服务

```bash
npm install
npm run dev
```

### 映射飞书群到聊天室

在代码中调用：

```typescript
const feishuChannel = channelManager.getChannel('feishu') as FeishuChannel;
feishuChannel.registerRoomMapping('chat_id_from_feishu', 'room_id_in_myclaw');
```

### 发送消息

用户可以在飞书群中@机器人发送消息，机器人会自动响应。

## 消息格式

### 文本消息
直接输入文本即可。

### 富文本消息
飞书富文本消息会自动转换为纯文本格式。

### 图片/文件消息
会显示为占位符，如 `[Image: image_key]`。

## 故障排查

### 收不到消息

1. 检查飞书开放平台的事件订阅配置是否正确
2. 确认服务器可以公网访问
3. 检查 webhook 地址配置是否正确
4. 查看服务器日志确认 webhook 是否收到请求

### 发送消息失败

1. 检查 App Secret 是否正确
2. 确认机器人已添加到飞书群
3. 检查网络连接

## 技术架构

```
┌─────────────┐
│   飞书群    │
│  (用户消息) │
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────────────────┐
│  Webhook Server (:3001) │
│  /api/feishu/webhook    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   FeishuChannel         │
│  - 解析消息              │
│  - 映射到 Room           │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   AgentManager          │
│  - 调用 Agent 处理        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   FeishuChannel         │
│  - 发送响应到飞书群       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│   飞书群    │
│  (机器人响应)│
└─────────────┘
```

## 下一步

- [ ] 支持消息加密
- [ ] 支持更多消息类型（视频、音频）
- [ ] 支持飞书名片消息
- [ ] 支持消息回复/引用
- [ ] 支持消息编辑/删除

## 参考文档

- [飞书开放平台文档](https://open.feishu.cn/document/ukTMukTMukTM/ukDNz4SO0MjL5QzM)
- [MyClaw 架构设计文档](./ARCHITECTURE.md)
