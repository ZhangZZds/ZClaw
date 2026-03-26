# myclaw 私人助手项目 - 架构分析报告

## 一、项目目标

开发一个私人 AI 助手，核心特性：
- **平台对接**: 飞书（Feishu/Lark）
- **消息类型**: 语音/图片/文件/文本
- **多 Agent 协作**: 支持 Agent Team 模式

---

## 二、参考项目概览（个人智能体方向）

| 项目 | Stars | 语言 | 核心特点 | 飞书支持 |
|------|-------|------|----------|---------|
| **OpenClaw** | 334k | TypeScript | 完整个人助手架构，20+ 消息渠道 | ✅ 已有 |
| **MuseBot** | 1.6k | Go | 多平台 Chat Bot，多模态支持 | ✅ 已有 |
| **Clowder AI** | 107 | TypeScript | 多 Agent 协作平台，Web UI | ✅ 已有 |
| **FlashClaw** | 26 | TypeScript | 模块化插件架构，定时任务 | ✅ 原生支持 |

---

## 三、参考项目详细分析

### 3.1 OpenClaw（334k stars）

**定位**: 完整的个人 AI 助手平台

**架构特点**:
```
┌─────────────────────────────────────────────────────────────┐
│                     消息渠道层 (Channels)                      │
│  WhatsApp | Telegram | Slack | Discord | Feishu | ...       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Gateway (控制平面)                          │
│              WebSocket: ws://127.0.0.1:18789                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │   Session   │   Routing   │   Config    │   Cron      │ │
│  │   Manager   │   Engine    │   Manager   │   Scheduler │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtime (Pi)                        │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │  LLM Client │ Tool System │ Memory      │ Context     │ │
│  │  (多模型)   │ (Skills)    │ Manager     │ Engine      │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**关键特性**:
- ✅ 已有飞书渠道实现 (`extensions/feishu/`)
- ✅ 多 Agent 协作 (`sessions_spawn`, `sessions_send`)
- ✅ 语音/图片/文件支持
- ✅ Gateway + Agent Runtime 分离

**技术栈**: TypeScript + Node.js + pnpm

---

### 3.2 MuseBot（1.6k stars）

**定位**: 多平台 AI 聊天机器人

**架构特点**:
```
MuseBot/
├── robot/           # 各平台适配器
│   ├── telegram.go
│   ├── discord.go
│   ├── slack.go
│   ├── lark.go      # 飞书适配器
│   └── ...
├── llm/             # LLM 提供者
│   ├── openai.go
│   ├── deepseek.go
│   ├── gemini.go
│   └── ...
├── rag/             # RAG 支持
├── http/            # Web API
└── main.go
```

**关键特性**:
- ✅ 支持 10+ 平台（Telegram, Discord, Slack, 飞书, 钉钉, 企业微信, QQ, 微信）
- ✅ 支持 7+ LLM（OpenAI, Gemini, DeepSeek, Doubao, OpenRouter 等）
- ✅ 多模态：语音/图片/视频
- ✅ RAG 支持
- ✅ Function Call (MCP 协议转换)

**技术栈**: Go

---

### 3.3 Clowder AI（107 stars）

**定位**: 多 Agent 协作平台，"Build AI teams, not just agents"

**架构特点**:
```
┌──────────────────────────────────────────────────┐
│                  You (CVO)                       │
│          Vision · Decisions · Feedback           │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│              Clowder Platform Layer              │
│   Identity    A2A Router    Skills Framework     │
│   Manager     & Threads     & Manifest           │
│   Memory &    SOP           MCP Callback         │
│   Evidence    Guardian      Bridge               │
└────┬─────────────┬──────────────┬───────────┬────┘
     │             │              │           │
┌────▼───┐   ┌────▼─────┐   ┌───▼────┐   ┌──▼──────────┐
│ Claude │   │ GPT /    │   │ Gemini │   │  opencode   │
│ (Opus) │   │ Codex    │   │ /Others│   │ (any model) │
└────────┘   └──────────┘   └────────┘   └─────────────┘
```

**关键特性**:
- ✅ **多 Agent 协作**: 每个 Agent 有独立的身份、人格、记忆
- ✅ **A2A 通信**: @mention 路由，Agent 间消息传递
- ✅ **飞书支持**: Multi-Platform Gateway
- ✅ **语音伴聊**: 每个 Agent 有独特声音
- ✅ **Web UI**: React + Tailwind

**核心理念**: "Hard Rails. Soft Power. Shared Mission."

**技术栈**: TypeScript + Node.js + Redis + React

---

### 3.4 FlashClaw（26 stars）

**定位**: 闪电般的个人 AI 助手，模块化插件架构

**架构特点**:
```
plugins/                   # 核心插件（3个）
├── anthropic-provider/    # AI Provider
├── memory/                # 长期记忆
└── send-message/          # 发送消息

community-plugins/         # 扩展插件（按需安装）
├── feishu/                # 飞书渠道
├── telegram/              # Telegram 渠道
├── schedule-task/         # 定时任务
├── agent-manager/         # 多 Agent 管理
├── web-search/            # 互联网搜索
└── ...
```

**关键特性**:
- ✅ **乐高式架构**: 通讯渠道和工具都是可插拔的插件
- ✅ **热加载**: 运行时加载插件，无需重启
- ✅ **飞书原生支持**
- ✅ **定时任务**: cron/interval/once
- ✅ **多 Agent**: agent-manager 插件

**技术栈**: TypeScript + Node.js

---

## 四、架构对比分析

| 维度 | OpenClaw | MuseBot | Clowder AI | FlashClaw |
|------|----------|---------|------------|-----------|
| **语言** | TypeScript | Go | TypeScript | TypeScript |
| **飞书支持** | ✅ Extension | ✅ 原生 | ✅ Gateway | ✅ 原生 |
| **多 Agent** | ✅ sessions_spawn | ❌ | ✅ 核心特性 | ✅ 插件 |
| **语音** | ✅ Voice Wake | ✅ ASR/TTS | ✅ 伴聊模式 | ❌ |
| **图片** | ✅ | ✅ | ✅ | ✅ |
| **插件系统** | ✅ Skills | ❌ | ✅ Skills | ✅ 核心 |
| **Web UI** | ✅ | ✅ | ✅ | ✅ |
| **复杂度** | 高 | 中 | 中高 | 低 |
| **学习曲线** | 陡峭 | 平缓 | 中等 | 平缓 |

---

## 五、推荐的 myclaw 架构

基于以上分析，推荐采用以下架构：

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Feishu Channel Adapter                    │
│         (参考 MuseBot/lark.go + FlashClaw/feishu)            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Gateway Layer                           │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│  │   Message   │   Session   │   Event     │   Config    │ │
│  │   Router    │   Manager   │   Handler   │   Manager   │ │
│  └─────────────┴─────────────┴─────────────┴─────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtime Layer                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Agent Orchestrator                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │  │
│  │  │ Agent 1 │ │ Agent 2 │ │ Agent 3 │ │ Agent N │     │  │
│  │  │(Planner)│ │(Coder)  │ │(Research)│ │(Writer)│     │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Tool System                          │  │
│  │  File | Browser | Search | Voice | Image | Custom     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      LLM Provider Layer                      │
│    OpenAI | Anthropic | DeepSeek | Qwen | Local Models      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 技术选型建议

| 层级 | 推荐技术 | 原因 |
|------|----------|------|
| 语言 | TypeScript | 参考 OpenClaw/Clowder/FlashClaw |
| 渠道 SDK | @larksuiteoapi/node-sdk | 飞书官方 SDK |
| 框架 | 参考 FlashClaw 插件架构 | 简单、灵活、易学习 |
| 多 Agent | 参考 Clowder AI A2A 模式 | 身份持久化、消息路由 |
| LLM 接口 | 参考 MuseBot 多 Provider | 支持 7+ LLM |
| 存储 | SQLite | 轻量级，参考 FlashClaw |

### 5.3 核心目录结构

```
myclaw/
├── src/
│   ├── adapters/
│   │   └── feishu/          # 飞书适配器
│   │       ├── client.ts    # API 客户端
│   │       ├── handler.ts   # 事件处理
│   │       ├── message.ts   # 消息类型
│   │       └── types.ts     # 类型定义
│   ├── gateway/
│   │   ├── router.ts        # 消息路由
│   │   ├── session.ts       # 会话管理
│   │   └── config.ts        # 配置管理
│   ├── agents/
│   │   ├── base.ts          # Agent 基类
│   │   ├── orchestrator.ts  # Agent 编排器
│   │   ├── registry.ts      # Agent 注册
│   │   └── tools/           # 工具定义
│   ├── llm/
│   │   ├── provider.ts      # LLM 提供者抽象
│   │   └── models/          # 模型配置
│   ├── media/
│   │   ├── voice.ts         # 语音处理 (ASR/TTS)
│   │   ├── image.ts         # 图片处理
│   │   └── file.ts          # 文件处理
│   └── utils/
│       ├── logger.ts        # 日志
│       └── storage.ts       # 存储
├── plugins/                 # 插件目录（参考 FlashClaw）
├── tests/
├── docs/
└── config/
```

---

## 六、关键功能实现参考

### 6.1 飞书集成

| 功能 | 参考项目 | 文件位置 |
|------|----------|----------|
| 消息接收 | FlashClaw | `community-plugins/feishu/` |
| 图片处理 | MuseBot | `robot/lark.go` |
| 语音处理 | MuseBot | `robot/lark.go` |
| 事件订阅 | OpenClaw | `extensions/feishu/` |

### 6.2 多 Agent 协作

| 功能 | 参考项目 | 实现方式 |
|------|----------|----------|
| Agent 注册 | FlashClaw | `agent-manager` 插件 |
| A2A 通信 | Clowder AI | @mention 路由 |
| 身份持久化 | Clowder AI | Identity Manager |
| 工具白名单 | FlashClaw | Agent 配置 |

### 6.3 多模态支持

| 功能 | 参考项目 | 实现方式 |
|------|----------|----------|
| 语音识别 | MuseBot | ASR (Volcano Engine) |
| 语音合成 | MuseBot | TTS |
| 图片理解 | MuseBot | Vision API |
| 文件处理 | OpenClaw | Media Pipeline |

---

## 七、开发路线图

### Phase 1: 基础框架 (2周)
- [ ] 项目初始化
- [ ] 飞书适配器 (文本消息)
- [ ] 基础 Gateway
- [ ] 单 Agent 对话

### Phase 2: 多媒体支持 (2周)
- [ ] 图片消息处理
- [ ] 语音消息处理 (ASR/TTS)
- [ ] 文件处理

### Phase 3: 多 Agent (3周)
- [ ] Agent 基类设计
- [ ] Agent 注册中心
- [ ] Agent 协作模式
- [ ] Agent 通信协议

### Phase 4: 高级功能 (2周)
- [ ] 记忆系统
- [ ] 插件系统
- [ ] Web UI

---

## 八、参考资源

- OpenClaw: `reference/openclaw/`
- MuseBot: `reference/MuseBot/`
- Clowder AI: `reference/clowder-ai/`
- FlashClaw: `reference/flashclaw/`
- 飞书开放平台: https://open.feishu.cn/