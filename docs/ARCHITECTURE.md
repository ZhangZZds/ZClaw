# MyClaw 架构设计文档

## 一、多 Agent 交互实现分析

### 1.1 OpenClaw — Subagent 模式

**核心工具**:
- `sessions_spawn` — 生成新的子 Agent
- `sessions_send` — 向其他 Agent 发送消息
- `sessions_list` — 列出活跃的 Agent

**实现位置**: `reference/openclaw/src/agents/subagent-spawn.ts`

**关键特点**:
```typescript
// 子 Agent 生成参数
type SpawnSubagentParams = {
  task: string;              // 任务描述
  agentId?: string;          // Agent ID
  model?: string;            // 模型选择
  thread?: boolean;          // 保持线程
  mode?: "run" | "session";  // 运行模式
  attachments?: Array<{...}>; // 附件
};

// 深度限制：最多 15 层嵌套
export const DEFAULT_SUBAGENT_MAX_SPAWN_DEPTH = 15;
```

---

### 1.2 Clowder AI — A2A 协议模式

**核心机制**:
- `@mention` 路由 — 行首 @agent_name 触发消息路由
- 基于 Google A2A Protocol 规范

**实现位置**: `reference/clowder-ai/packages/api/src/domains/cats/services/agents/routing/a2a-mentions.ts`

**关键特点**:
```typescript
// @mention 解析规则
export function parseA2AMentions(text: string, currentCatId?: CatId): CatId[] {
  // 1. 剥离围栏代码块
  const stripped = text.replace(/```[\s\S]*?```/g, '');
  
  // 2. 行首匹配 + token boundary
  // 避免 @opus-45 误命中 @opus
  
  // 3. 最多返回 2 个目标 Agent
  const MAX_A2A_MENTION_TARGETS = 2;
  
  return found;
}

// A2A 协议类型
interface A2ATask {
  id: string;
  status: 'submitted' | 'working' | 'completed' | 'failed';
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
}
```

---

### 1.3 FlashClaw — Agent Manager 插件模式

**核心工具**:
- `agent_list` — 列出所有 Agent
- `agent_send` — 向指定 Agent 发送消息

**实现位置**: `reference/flashclaw/community-plugins/agent-manager/index.ts`

**关键特点**:
```typescript
// Agent 配置
interface MultiAgentConfig {
  id: string;
  name: string;
  soul: string;           // 人格文件
  tools: string[];        // 工具白名单
  bindings?: {            // 路由绑定
    channel?: string;
    group?: string;
    peer?: string;
  }[];
}

// 路由匹配（3级优先级）
function resolveAgent(ctx: RouteContext): MultiAgentConfig {
  // Level 1: peer 精确匹配
  // Level 2: channel + group 匹配  
  // Level 3: channel 匹配
  // Fallback: default Agent
}

// 跨 Agent 通信
async function executeAgentSend(params, context) {
  const result = await coreApi.chat({
    message,
    group: `agent-${targetAgent.id}-${Date.now()}`,
    platform: 'agent-internal',
  });
  return result;
}
```

---

## 二、MyClaw 实现方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Server                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Message Router                        │ │
│  │  parseMentions(content) → Agent[]                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ 小助手   │   │ 程序员   │   │ 作家     │
    │ @assistant│   │ @coder  │   │ @writer  │
    └──────────┘   └──────────┘   └──────────┘
```

### 2.2 核心模块

| 模块 | 文件 | 职责 |
|------|------|------|
| **类型定义** | `types.ts` | Agent, Message, Room 等类型 |
| **LLM 客户端** | `llm.ts` | Mock/OpenAI 客户端 |
| **Agent 管理** | `agent-manager.ts` | Agent 生命周期、消息处理 |
| **房间管理** | `room-manager.ts` | 房间创建、Agent 加入/移除 |
| **主服务** | `index.ts` | Express + WebSocket 服务器 |

### 2.3 消息流程

```
用户输入: "@coder 帮我写个排序函数"
           │
           ▼
┌─────────────────────────────────────┐
│ 1. parseMentions() → ["coder"]     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ 2. generateAgentResponse(coder)    │
│    - 构建上下文 (system + history)  │
│    - 调用 LLM                       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ 3. broadcast(response)             │
│    - 发送给所有 WebSocket 客户端    │
└─────────────────────────────────────┘
```

### 2.4 Agent 间通信（A2A）

```typescript
// Agent A 向 Agent B 发送消息
async agentToAgent(
  roomId: string,
  fromAgent: Agent,    // Agent A
  toAgent: Agent,      // Agent B
  message: string
): Promise<Message> {
  // 1. 获取/创建 Agent B 的独立上下文
  const contextKey = `${roomId}:${toAgent.id}:a2a`;
  
  // 2. 构建消息
  const a2aPrompt = `[${fromAgent.name}对你说]: ${message}`;
  
  // 3. 调用 LLM
  const response = await this.llmClient.chat(context);
  
  // 4. 广播响应
  return responseMessage;
}
```

---

## 三、使用指南

### 3.1 启动服务

```bash
# 安装依赖
npm install

# 启动（Mock LLM）
npm run dev

# 启动（真实 LLM）
LLM_API_KEY=sk-xxx npm run dev
```

### 3.2 使用 @mention

| 输入 | 行为 |
|------|------|
| `你好` | 默认呼叫 `@assistant` |
| `@coder 帮我写代码` | 呼叫程序员 |
| `@writer @analyst 分析这段文案` | 同时呼叫作家和分析师 |

### 3.3 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET | 获取所有 Agent |
| `/api/rooms` | GET | 获取所有房间 |
| `/api/rooms/:id/agents` | POST | 添加 Agent |
| `/api/rooms/:id/agents/:agentId` | DELETE | 移除 Agent |

### 3.4 WebSocket 消息类型

```typescript
// 发送消息
{ type: 'chat', payload: { roomId, content, mentionAgentIds? } }

// 添加 Agent
{ type: 'agent_add', payload: { roomId, agentId } }

// 接收消息
{ type: 'message', payload: Message }
```

---

## 四、扩展方向

### 4.1 飞书集成
- 参考 `reference/flashclaw/community-plugins/feishu/`
- 使用 `@larksuiteoapi/node-sdk`

### 4.2 多模态支持
- 图片：上传 → 理解
- 语音：ASR → 文本 → 回复 → TTS

### 4.3 记忆系统
- 短期记忆：会话上下文
- 长期记忆：SQLite 持久化

### 4.4 工具系统
- 文件操作
- 网页搜索
- 代码执行