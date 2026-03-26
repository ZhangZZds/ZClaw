# MyClaw 架构设计文档 v1.0

## 一、产品定位

**MyClaw = 全能型个人 AI 助手**

核心特性：
- 多 Agent 协作（动态创建不限）
- 多渠道接入（Web/TUI/飞书/微信/可扩展）
- 任务自动化
- 记忆与知识管理

---

## 二、核心概念设计

### 2.1 聊天室（Room）设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Chat Room                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Room ID: room-001                                        ││
│  │ 协作模式: team                                            ││
│  │ 工作目录: ~/projects/my-app                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Agents (独立实例):                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Coder-1 │ │ Reviewer│ │ Tester  │ │ Leader  │          │
│  │(qwen3)  │ │(glm-5)  │ │(kimi)   │ │(qwen-max)│          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  上下文隔离: 每个实例有独立的对话历史和记忆                    │
└─────────────────────────────────────────────────────────────┘
```

**设计要点**:
1. 每个聊天室有独立的协作模式（创建时指定）
2. 添加 Agent 到聊天室 = 创建该 Agent 的独立实例
3. 聊天室对应一个工作目录
4. Agent 实例之间上下文完全隔离
5. 每个 Agent 只看到 @ 给他的信息（防止无限递归）

### 2.2 协作模式设计

#### 模式 1: 并行模式（Parallel）
```
用户: @coder @reviewer 帮我实现用户登录功能

┌─────────┐     ┌─────────┐
│ Coder   │     │ Reviewer│
│(独立响应)│     │(独立响应)│
└─────────┘     └─────────┘
     │               │
     └───────┬───────┘
             ▼
         用户收到多个回复
```

#### 模式 2: 流水线模式（Pipeline）
```
用户: 实现用户登录功能

Task → [Coder] → [Reviewer] → [Tester] → Done
        编码        评审        测试

每个阶段完成后自动流转到下一个 Agent
```

#### 模式 3: 团队模式（Team）
```
用户: 实现用户登录功能

         ┌─────────────────┐
         │  Team Leader    │
         │  (协调、汇总)    │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Coder   │ │ Reviewer│ │ Tester  │
└─────────┘ └─────────┘ └─────────┘

- Team Leader 看到所有对话
- 安排和汇总工作
- Agent 间可互相讨论
```

#### 模式 4: 决策模式（Decision）
```
用户: 这个架构方案是否可行？

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Agent A │ │ Agent B │ │ Agent C │
│(支持)   │ │(反对)   │ │(中立)   │
└─────────┘ └─────────┘ └─────────┘
     │           │           │
     └───────────┼───────────┘
                 ▼
           投票/辩论结果
```

#### 模式 5: 自主循环模式（Ralph Loop）
```
用户: 完成 PRD 中的所有任务

┌─────────────────────────────────────┐
│          Ralph Loop Cycle           │
│  ┌─────────────────────────────┐    │
│  │ 1. 读取任务列表              │    │
│  │ 2. 选择下一个任务            │    │
│  │ 3. Agent 执行任务            │    │
│  │ 4. 标记完成                  │    │
│  │ 5. 检查是否全部完成          │    │
│  │    - 否 → 回到步骤 1         │    │
│  │    - 是 → 结束               │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 2.3 Agent 设计

```
Agent Instance
├── id: string                    # 实例 ID（聊天室内唯一）
├── baseAgentId: string           # 基础 Agent ID
├── roomId: string                # 所属聊天室
├── model: string                 # LLM 模型
├── context: ChatContext          # 独立上下文
├── memory: MemoryStore           # 独立记忆
├── tools: Tool[]                 # 可用工具
└── prompts:                      # 提示词配置
    ├── soul.md                   # 人格设定
    ├── memory.md                 # 记忆摘要
    └── AGENTS.md                 # 行为规范
```

---

## 三、系统架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Channel Layer                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │   Web   │ │   TUI   │ │  Feishu │ │ WeChat  │ │  ...  │ │
│  │(WebSocket)│(Terminal)│(WebSocket)│(Callback)│(Plugin)│ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘ │
└───────┼──────────┼──────────┼──────────┼──────────┼─────┘
        │          │          │          │          │
        └──────────┴──────────┼──────────┴──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      Gateway Layer                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │   Message   │   Session   │   Event     │   Config    │ │
│  │   Router    │   Manager   │   Handler   │   Manager   │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Room Manager                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Room Registry                                          │  │
│  │  - Create/Destroy Rooms                                │  │
│  │  - Manage Collaboration Mode                           │  │
│  │  - Agent Instance Lifecycle                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Agent Runtime                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Collaboration Orchestrator                             │  │
│  │  - Parallel / Pipeline / Team / Decision / Ralph      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Agent Instance Manager                                 │  │
│  │  - Context Isolation                                   │  │
│  │  - Memory Management                                   │  │
│  │  - Tool Invocation                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Tool System                                            │  │
│  │  Built-in: File | Web | Search | Shell | ...          │  │
│  │  Plugins: weather | translate | ...                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      LLM Provider Layer                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Qwen    │ │ GLM     │ │ Kimi    │ │ MiniMax │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      Storage Layer                           │
│  ┌─────────────┬─────────────┬─────────────┐               │
│  │   SQLite    │  File Store │   Memory    │               │
│  │  (metadata) │ (prompts)   │  (vectors)  │               │
│  └─────────────┴─────────────┴─────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
myclaw/
├── src/
│   ├── core/                      # 核心模块
│   │   ├── types.ts               # 类型定义
│   │   ├── gateway/               # Gateway 层
│   │   │   ├── router.ts          # 消息路由
│   │   │   ├── session.ts         # 会话管理
│   │   │   └── events.ts          # 事件处理
│   │   ├── room/                  # 聊天室管理
│   │   │   ├── manager.ts         # 房间管理器
│   │   │   ├── agent-instance.ts  # Agent 实例
│   │   │   └── collaboration/     # 协作模式
│   │   │       ├── parallel.ts    # 并行模式
│   │   │       ├── pipeline.ts    # 流水线模式
│   │   │       ├── team.ts        # 团队模式
│   │   │       ├── decision.ts    # 决策模式
│   │   │       └── ralph-loop.ts  # 自主循环
│   │   ├── agent/                 # Agent 运行时
│   │   │   ├── instance.ts        # 实例管理
│   │   │   ├── context.ts         # 上下文隔离
│   │   │   ├── memory.ts          # 记忆系统
│   │   │   └── prompts/           # 提示词管理
│   │   │       ├── soul.ts        # 人格
│   │   │       ├── memory.ts      # 记忆摘要
│   │   │       └── agents.ts      # 行为规范
│   │   ├── tools/                 # 工具系统
│   │   │   ├── registry.ts        # 工具注册
│   │   │   ├── builtin/           # 内置工具
│   │   │   │   ├── file.ts
│   │   │   │   ├── web.ts
│   │   │   │   ├── search.ts
│   │   │   │   └── shell.ts
│   │   │   └── plugins/           # 插件工具
│   │   └── llm/                   # LLM 层
│   │       ├── provider.ts        # 提供者抽象
│   │       ├── dashscope.ts       # 阿里云百炼
│   │       └── openai.ts          # OpenAI 兼容
│   ├── channels/                  # 渠道适配器
│   │   ├── base.ts                # 基类
│   │   ├── web/                   # Web 渠道
│   │   ├── tui/                   # TUI 渠道
│   │   ├── feishu/                # 飞书渠道
│   │   └── wechat/                # 微信渠道
│   ├── config/                    # 配置管理
│   │   ├── manager.ts             # 配置管理器
│   │   ├── agents.ts              # Agent 配置
│   │   ├── models.ts              # 模型配置
│   │   └── prompts/               # 提示词模板
│   ├── storage/                   # 存储层
│   │   ├── sqlite.ts              # SQLite
│   │   ├── file-store.ts          # 文件存储
│   │   └── memory-store.ts        # 记忆存储
│   └── index.ts                   # 入口
├── config/                        # 配置文件
│   ├── agents/                    # Agent 定义
│   │   ├── assistant/
│   │   │   ├── agent.json
│   │   │   ├── soul.md
│   │   │   └── AGENTS.md
│   │   ├── coder/
│   │   ├── writer/
│   │   └── analyst/
│   ├── models.json                # 模型配置
│   └── default.json               # 默认配置
├── web/                           # Web 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
├── tui/                           # TUI 终端界面
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── docs/                          # 文档
├── tests/                         # 测试
├── package.json
└── tsconfig.json
```

---

## 四、核心模块设计

### 4.1 聊天室与 Agent 实例

```typescript
// types.ts
interface Room {
  id: string;
  name: string;
  workDir: string;                    // 工作目录
  collaborationMode: CollaborationMode;
  agentInstances: Map<string, AgentInstance>;
  messages: Message[];
  createdAt: number;
}

type CollaborationMode = 
  | 'parallel'    // 并行
  | 'pipeline'    // 流水线
  | 'team'        // 团队
  | 'decision'    // 决策
  | 'ralph-loop'; // 自主循环

interface AgentInstance {
  id: string;                         // 实例 ID
  baseAgentId: string;                // 基础 Agent ID
  roomId: string;
  model: string;
  context: ChatContext;               // 独立上下文
  memory: MemoryStore;                // 独立记忆
  tools: string[];                    // 工具白名单
  prompts: {
    soul: string;
    memory: string;
    agents: string;
  };
}

interface BaseAgent {
  id: string;
  name: string;
  avatar: string;
  defaultModel: string;
  defaultPrompts: {
    soul: string;
    agents: string;
  };
  defaultTools: string[];
}
```

### 4.2 消息路由

```typescript
// gateway/router.ts
class MessageRouter {
  async route(message: Message, room: Room): Promise<void> {
    const mode = room.collaborationMode;
    
    // 1. 解析 @mentions
    const mentions = this.parseMentions(message.content);
    
    // 2. 根据协作模式分发
    switch (mode) {
      case 'parallel':
        await this.routeParallel(room, message, mentions);
        break;
      case 'team':
        await this.routeTeam(room, message, mentions);
        break;
      case 'pipeline':
        await this.routePipeline(room, message);
        break;
      case 'decision':
        await this.routeDecision(room, message, mentions);
        break;
      case 'ralph-loop':
        await this.routeRalphLoop(room, message);
        break;
    }
  }
  
  private parseMentions(content: string): string[] {
    // @agent1 @agent2 → ['agent1', 'agent2']
    const regex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }
}
```

### 4.3 团队模式实现

```typescript
// room/collaboration/team.ts
class TeamCollaboration {
  private leader: AgentInstance;
  private members: AgentInstance[];
  
  async handleMessage(room: Room, message: Message, mentions: string[]): Promise<void> {
    // 没有指定接收人 → 广播给所有人
    if (mentions.length === 0) {
      await this.broadcast(room, message);
      return;
    }
    
    // 指定了接收人 → 只发给这些人
    for (const agentId of mentions) {
      const instance = room.agentInstances.get(agentId);
      if (instance) {
        await this.sendToAgent(room, instance, message);
      }
    }
  }
  
  private async broadcast(room: Room, message: Message): Promise<void> {
    // Leader 先处理
    const leaderResponse = await this.leader.process(message);
    
    // Leader 决定分发给哪些成员
    const assignments = this.parseAssignments(leaderResponse);
    
    for (const [agentId, task] of assignments) {
      const instance = room.agentInstances.get(agentId);
      if (instance) {
        await this.sendToAgent(room, instance, {
          ...message,
          content: `[Leader 分配]: ${task}`,
        });
      }
    }
  }
  
  // 防止无限递归
  private maxRecursionDepth = 3;
  private recursionCount = new Map<string, number>();
  
  async sendToAgent(room: Room, instance: AgentInstance, message: Message): Promise<void> {
    const key = `${message.id}:${instance.id}`;
    const count = this.recursionCount.get(key) || 0;
    
    if (count >= this.maxRecursionDepth) {
      console.warn(`Max recursion depth reached for ${instance.id}`);
      return;
    }
    
    this.recursionCount.set(key, count + 1);
    
    // Agent 只看到 @ 给他的信息
    const filteredMessage = this.filterMessageForAgent(message, instance);
    
    const response = await instance.process(filteredMessage);
    await this.broadcastResponse(room, instance, response);
  }
}
```

### 4.4 Agent 配置系统

```typescript
// config/manager.ts
class ConfigManager {
  private configDir: string;
  
  // 加载所有基础 Agent
  async loadBaseAgents(): Promise<BaseAgent[]> {
    const agents: BaseAgent[] = [];
    const agentDirs = await fs.readdir(path.join(this.configDir, 'agents'));
    
    for (const dir of agentDirs) {
      const agent = await this.loadAgent(path.join(this.configDir, 'agents', dir));
      agents.push(agent);
    }
    
    return agents;
  }
  
  // 加载单个 Agent
  private async loadAgent(dir: string): Promise<BaseAgent> {
    const config = JSON.parse(await fs.readFile(path.join(dir, 'agent.json'), 'utf-8'));
    const soul = await fs.readFile(path.join(dir, 'soul.md'), 'utf-8');
    const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf-8');
    
    return {
      id: config.id,
      name: config.name,
      avatar: config.avatar,
      defaultModel: config.defaultModel,
      defaultPrompts: { soul, agents },
      defaultTools: config.tools,
    };
  }
  
  // 创建 Agent 实例
  async createInstance(baseAgent: BaseAgent, roomId: string): Promise<AgentInstance> {
    return {
      id: `${baseAgent.id}-${Date.now()}`,
      baseAgentId: baseAgent.id,
      roomId,
      model: baseAgent.defaultModel,
      context: { messages: [] },
      memory: new MemoryStore(),
      tools: baseAgent.defaultTools,
      prompts: { ...baseAgent.defaultPrompts, memory: '' },
    };
  }
}
```

### 4.5 记忆系统

```typescript
// agent/memory.ts
class MemoryStore {
  private shortTerm: Message[] = [];        // 短期记忆（会话内）
  private longTerm: LongTermMemory[] = [];  // 长期记忆（结构化）
  
  // 添加短期记忆
  addShortTerm(message: Message): void {
    this.shortTerm.push(message);
    
    // 超过限制时压缩
    if (this.shortTerm.length > 50) {
      this.compress();
    }
  }
  
  // 压缩短期记忆
  private compress(): void {
    const summary = this.summarize(this.shortTerm.slice(0, 30));
    this.longTerm.push({
      type: 'summary',
      content: summary,
      timestamp: Date.now(),
    });
    this.shortTerm = this.shortTerm.slice(30);
  }
  
  // 获取上下文
  getContext(): ChatContext {
    return {
      messages: [
        // 长期记忆摘要
        ...this.longTerm.map(m => ({
          role: 'system' as const,
          content: `[历史记忆] ${m.content}`,
        })),
        // 短期记忆
        ...this.shortTerm.map(m => ({
          role: m.from === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
      ],
    };
  }
}

interface LongTermMemory {
  type: 'summary' | 'fact' | 'preference';
  content: string;
  tags?: string[];
  timestamp: number;
}
```

### 4.6 工具系统

```typescript
// tools/registry.ts
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private plugins: Map<string, ToolPlugin> = new Map();
  
  // 注册内置工具
  registerBuiltin(): void {
    this.register(new FileTool());
    this.register(new WebTool());
    this.register(new SearchTool());
    this.register(new ShellTool());
  }
  
  // 加载插件
  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    for (const tool of plugin.tools) {
      this.tools.set(tool.name, tool);
    }
    this.plugins.set(plugin.name, plugin);
  }
  
  // 获取 Agent 可用的工具
  getToolsForAgent(whitelist: string[]): Tool[] {
    if (whitelist.includes('*')) {
      return Array.from(this.tools.values());
    }
    return whitelist
      .map(id => this.tools.get(id))
      .filter(Boolean) as Tool[];
  }
}
```

---

## 五、渠道适配器设计

### 5.1 渠道基类

```typescript
// channels/base.ts
abstract class ChannelAdapter {
  abstract name: string;
  
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  
  abstract sendMessage(roomId: string, message: Message): Promise<void>;
  
  protected onMessage: (roomId: string, message: Message) => void;
  
  protected broadcast: (message: Message) => void;
}
```

### 5.2 飞书适配器

```typescript
// channels/feishu/index.ts
import * as lark from '@larksuiteoapi/node-sdk';

class FeishuChannel extends ChannelAdapter {
  name = 'feishu';
  private client: lark.Client;
  
  async start(): Promise<void> {
    this.client = new lark.Client({
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
    });
    
    // 订阅消息事件
    this.client.on('im.message.receive_v1', this.handleMessage.bind(this));
  }
  
  private async handleMessage(event: lark.Event): Promise<void> {
    const message = this.parseEvent(event);
    
    // 映射飞书群组到 Room
    const roomId = this.mapChatToRoom(message.chatId);
    
    this.onMessage(roomId, message);
  }
  
  async sendMessage(roomId: string, message: Message): Promise<void> {
    const chatId = this.mapRoomToChat(roomId);
    
    await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: this.formatMessage(message) }),
      },
    });
  }
}
```

---

## 六、配置文件设计

### 6.1 Agent 配置

```json
// config/agents/coder/agent.json
{
  "id": "coder",
  "name": "程序员",
  "avatar": "👨‍💻",
  "defaultModel": "qwen3-coder-next",
  "tools": ["file", "shell", "web", "search"]
}
```

```markdown
<!-- config/agents/coder/soul.md -->
# 程序员

你的名字是程序员。你是一个专业的软件工程师。

## 技能
- 编写高质量代码
- 调试和排错
- 代码审查和优化

## 行为准则
- 代码使用 markdown 代码块格式
- 给出具体的实现方案
- 考虑边界情况和错误处理
```

```markdown
<!-- config/agents/coder/AGENTS.md -->
# 行为规范

## 通信
- 收到 @coder 的消息时响应
- 不主动发起对话
- 完成任务后简洁汇报

## 协作
- 在团队模式下，接受 Leader 的任务分配
- 完成后向 Leader 汇报

## 工具使用
- 使用 file 工具读写文件
- 使用 shell 工具执行命令
- 使用 web 工具获取网络资源
```

### 6.2 模型配置

```json
// config/models.json
{
  "models": {
    "qwen3.5-plus": {
      "name": "Qwen3.5 Plus",
      "provider": "dashscope",
      "baseUrl": "https://coding.dashscope.aliyuncs.com/v1",
      "maxTokens": 4096,
      "supportsVision": true
    },
    "qwen3-coder-next": {
      "name": "Qwen3 Coder Next",
      "provider": "dashscope",
      "maxTokens": 8192
    },
    "glm-5": {
      "name": "GLM-5",
      "provider": "dashscope",
      "maxTokens": 4096
    }
  },
  "defaultModel": "qwen3.5-plus"
}
```

---

## 七、开发路线图

### Phase 1: 核心重构 (2 周)
- [ ] 重构目录结构
- [ ] 实现 Room 和 Agent Instance 模型
- [ ] 实现并行模式
- [ ] Agent 配置系统（配置文件加载）

### Phase 2: 协作模式 (2 周)
- [ ] 实现团队模式
- [ ] 实现流水线模式
- [ ] 实现决策模式
- [ ] 消息路由与递归防护

### Phase 3: 记忆与工具 (2 周)
- [ ] 短期记忆实现
- [ ] 结构化长期记忆
- [ ] 内置工具（file, shell, web）
- [ ] 插件系统

### Phase 4: 渠道集成 (2 周)
- [ ] Web 渠道优化
- [ ] 飞书渠道实现
- [ ] TUI 渠道实现

### Phase 5: 高级功能 (2 周)
- [ ] Ralph Loop 模式
- [ ] Web 配置界面
- [ ] 部署脚本

---

## 八、技术选型总结

| 层级 | 技术 | 说明 |
|------|------|------|
| 语言 | TypeScript | 与 opencode 一致 |
| 运行时 | Node.js 20+ | ESM 模块 |
| Web 框架 | Express + WebSocket | 实时通信 |
| TUI 框架 | Ink / blessed | 终端 UI |
| 存储主库 | SQLite (better-sqlite3) | 轻量级，本地友好 |
| 文件存储 | Node fs | 提示词、配置 |
| LLM SDK | fetch 原生调用 | 灵活适配多模型 |
| 测试 | Vitest | 单元测试 |
| 构建 | tsx / tsc | TypeScript 执行 |