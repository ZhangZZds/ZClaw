# MyClaw - 个人 AI 助手

一个支持多 Agent 协作的 Web 版个人助手。

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务（使用 Mock LLM）
npm run dev

# 启动服务（使用真实 LLM）
LLM_API_KEY=your-api-key LLM_MODEL=gpt-3.5-turbo npm run dev
```

访问 http://localhost:3000

## 功能

### 1. 聊天大厅
- 实时 WebSocket 通信
- 消息历史记录
- 系统通知

### 2. 机器人管理
- 预置 4 个机器人：小助手、程序员、作家、分析师
- 可动态添加/移除机器人

### 3. 消息路由
- `@机器人名` 呼叫特定机器人
- 不指定时默认呼叫"小助手"
- 支持同时呼叫多个机器人

### 4. Agent 间通信
- 每个机器人有独立的人格和上下文
- 机器人之间可以互相通信

## 使用示例

```
用户: 你好                    → 小助手回复
用户: @coder 帮我写个排序函数   → 程序员回复
用户: @writer @analyst 帮我分析这段文案 → 作家和分析师同时回复
```

## 架构

```
src/
├── backend/
│   ├── index.ts        # 主服务器
│   ├── types.ts        # 类型定义
│   ├── llm.ts          # LLM 客户端
│   ├── agent-manager.ts # Agent 管理
│   └── room-manager.ts # 房间管理
└── frontend/
    ├── index.html      # HTML 页面
    ├── style.css       # 样式
    └── app.js          # 前端逻辑
```

## API

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET | 获取所有 Agent |
| `/api/rooms` | GET | 获取所有房间 |
| `/api/rooms/:id/messages` | GET | 获取房间消息 |
| `/api/rooms/:id/agents` | POST | 添加 Agent 到房间 |
| `/api/rooms/:id/agents/:agentId` | DELETE | 移除 Agent |

### WebSocket 消息

| 类型 | 说明 |
|------|------|
| `init` | 初始化数据 |
| `chat` | 发送消息 |
| `message` | 接收消息 |
| `agent_add` | 添加 Agent |
| `agent_remove` | 移除 Agent |
| `agent_list` | Agent 列表 |
| `room_list` | 房间列表 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `LLM_PROVIDER` | mock | LLM 提供商 |
| `LLM_API_KEY` | - | API 密钥 |
| `LLM_MODEL` | gpt-3.5-turbo | 模型名称 |

## 下一步

1. 添加飞书集成
2. 支持语音/图片
3. 添加记忆系统
4. 添加更多工具