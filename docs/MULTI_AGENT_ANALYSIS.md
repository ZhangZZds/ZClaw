# 多 Agent 交互实现分析

## 一、各项目多 Agent 实现对比

### 1. OpenClaw — Subagent 模式

**核心工具**:
- `sessions_spawn` — 生成新的子 Agent
- `sessions_send` — 向其他 Agent 发送消息
- `sessions_list` — 列出活跃的 Agent
- `sessions_history` — 查看会话历史

**架构**:
```
┌─────────────────────────────────────────────────────┐
│                 Main Session                         │
│  ┌───────────────────────────────────────────────┐  │
│  │              Subagent Registry                 │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │ Agent 1 │ │ Agent 2 │ │ Agent 3 │        │  │
│  │  │(child)  │ │(child)  │ │(child)  │        │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘        │  │
│  │       │           │           │              │  │
│  │       └───────────┼───────────┘              │  │
│  │                   │                          │  │
│  │                   ▼                          │  │
│  │         sessions_send / sessions_spawn       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**关键实现** (`subagent-spawn.ts`):
```typescript
type SpawnSubagentParams = {
  task: string;          // 任务描述
  label?: string;        // Agent 标签
  agentId?: string;      // Agent ID
  model?: string;        // 模型选择
  thinking?: string;     // 思考级别
  runTimeoutSeconds?: number;
  thread?: boolean;      // 是否保持线程
  mode?: "run" | "session";  // 运行模式
  sandbox?: "inherit" | "require";
  attachments?: Array<{...}>;  // 附件
};
```

**特点**:
- ✅ 支持深度嵌套（最多 15 层）
- ✅ 支持附件传递
- ✅ 支持独立的模型配置
- ✅ 支持沙箱隔离
- ✅ 自动清理机制

---

### 2. Clowder AI — A2A 协议模式

**核心机制**:
- `@mention` 路由 — 行首 @agent_name 触发消息路由
- A2A Protocol — 基于 Google Agent-to-Agent 协议

**架构**:
```
┌──────────────────────────────────────────────────┐
│                  User (CVO)                       │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              A2A Router                           │
│  ┌────────────────────────────────────────────┐  │
│  │ parseA2AMentions(text, currentCatId)       │  │
│  │ → 检测 @mention → 路由到目标 Agent         │  │
│  └────────────────────────────────────────────┘  │
└────┬─────────────┬──────────────┬───────────┬────┘
     │             │              │           │
┌────▼───┐   ┌────▼─────┐   ┌───▼────┐   ┌──▼────┐
│ XianXian│  │ YanYan   │   │ShuoShuo│   │ opencode│
│ (Claude)│  │ (GPT)    │   │(Gemini)│   │(multi) │
└─────────┘  └──────────┘   └────────┘   └────────┘
```

**关键实现** (`a2a-mentions.ts`):
```typescript
// 行首 @mention 检测
export function parseA2AMentions(text: string, currentCatId?: CatId): CatId[] {
  // 1. 剥离围栏代码块
  const stripped = text.replace(/```[\s\S]*?```/g, '');
  
  // 2. 长匹配优先 + token boundary
  // 避免 @opus-45 误命中 @opus
  
  // 3. 行首匹配
  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (!normalized.startsWith('@')) continue;
    
    // 匹配 Agent
    for (const entry of entries) {
      if (normalized.startsWith(entry.pattern)) {
        found.push(entry.catId);
      }
    }
  }
  
  return found;  // 最多返回 2 个目标
}
```

**A2A 协议类型** (`a2a.ts`):
```typescript
interface A2ATask {
  id: string;
  status: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
}

interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];  // text | file | data
}
```

**特点**:
- ✅ 自然语言触发（@mention）
- ✅ 行首即路由，无需动作词
- ✅ 支持多个 Agent 同时路由
- ✅ 身份持久化（每个 Agent 有独立人格）
- ✅ 符合 A2A Protocol 规范

---

### 3. FlashClaw — Agent Manager 插件模式

**核心工具**:
- `agent_list` — 列出所有 Agent
- `agent_send` — 向指定 Agent 发送消息

**架构**:
```
┌──────────────────────────────────────────────────┐
│              Agent Registry (Plugin)              │
│  ┌────────────────────────────────────────────┐  │
│  │ loadAgentsFromFile() → agents.json         │  │
│  │ resolveAgent(ctx) → 匹配 Agent             │  │
│  │ filterToolsByAgent() → 工具白名单          │  │
│  └────────────────────────────────────────────┘  │
└────┬─────────────┬──────────────┬───────────────┘
     │             │              │
┌────▼───┐   ┌────▼─────┐   ┌───▼────┐
│ main   │   │ work     │   │ life   │
│(默认)  │   │(工作)    │   │(生活)  │
└────────┘   └──────────┘   └────────┘
```

**关键实现** (`agent-manager/index.ts`):
```typescript
// Agent 配置
interface MultiAgentConfig {
  id: string;
  name: string;
  soul: string;           // 人格文件路径
  model?: string;         // 可选模型
  tools: string[];        // 工具白名单
  default?: boolean;
  bindings?: {            // 绑定规则
    channel?: string;
    group?: string;
    peer?: string;
  }[];
}

// 路由匹配
function resolveAgent(ctx: RouteContext): MultiAgentConfig {
  // Level 1: peer 精确匹配
  // Level 2: channel + group 匹配
  // Level 3: channel 匹配
  // Fallback: default Agent
}

// 跨 Agent 通信
async function executeAgentSend(params, context) {
  const targetAgent = getAgentById(agentId);
  const result = await coreApi.chat({
    message,
    group: `agent-${targetAgent.id}-${Date.now()}`,
    platform: 'agent-internal',
  });
  return { success: true, data: result };
}
```

**特点**:
- ✅ 插件化设计，核心极简
- ✅ 多级路由匹配
- ✅ 工具白名单
- ✅ 简单易学

---

## 二、实现模式对比

| 特性 | OpenClaw | Clowder AI | FlashClaw |
|------|----------|------------|-----------|
| **触发方式** | 工具调用 | @mention | 工具调用 |
| **Agent 生成** | sessions_spawn | 预定义 | agents.json |
| **消息路由** | 会话键 | A2A Router | 绑定规则 |
| **身份持久化** | ✅ | ✅ | ✅ |
| **工具隔离** | ✅ | ✅ | ✅ 白名单 |
| **深度限制** | 15 层 | 2 个目标 | 无 |
| **协议规范** | 自定义 | A2A Protocol | 自定义 |
| **学习曲线** | 陡峭 | 中等 | 平缓 |

---

## 三、推荐实现方案

基于分析，推荐采用 **FlashClaw 的简化版 + Clowder AI 的 A2A 路由**:

### 核心设计

```typescript
// 1. Agent 定义
interface Agent {
  id: string;
  name: string;
  systemPrompt: string;   // 人格设定
  model?: string;         // 可选模型
  tools?: string[];       // 可选工具白名单
}

// 2. 消息结构
interface Message {
  id: string;
  from: string;           // 'user' | agentId
  to: string;             // 'user' | agentId | 'all'
  content: string;
  timestamp: number;
}

// 3. 路由逻辑
function routeMessage(message: Message, agents: Agent[]): Agent[] {
  // 1. 检测 @mention
  const mentions = parseMentions(message.content);
  
  // 2. 如果没有 mention，发送给默认 Agent
  if (mentions.length === 0) {
    return [getDefaultAgent(agents)];
  }
  
  // 3. 返回 mention 的 Agent
  return mentions.map(id => getAgentById(agents, id)).filter(Boolean);
}

// 4. Agent 间通信
async function agentToAgent(from: Agent, to: Agent, message: string): Promise<string> {
  // 创建独立上下文
  const context = {
    messages: [
      { role: 'system', content: to.systemPrompt },
      { role: 'user', content: `[${from.name}]: ${message}` }
    ]
  };
  
  // 调用 LLM
  const response = await llm.chat(context);
  return response;
}
```

---

## 四、实现要点

### 1. 会话隔离
- 每个 Agent 有独立的会话上下文
- Agent 间通信时创建临时上下文

### 2. 消息路由
- @mention 触发路由
- 支持多 Agent 并行处理

### 3. 状态管理
- 内存存储（简单场景）
- 或 SQLite 持久化

### 4. 并发控制
- 限制同时运行的 Agent 数量
- 超时保护