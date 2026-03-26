import { v4 as uuid } from 'uuid';
import type { Agent, AppState, Room, Message, ChatContext, LLMConfig, AgentUpdatePayload } from './types.js';
import type { LLMClient } from './llm.js';

const DEFAULT_MODELS: Record<string, string> = {
  'assistant': 'qwen3.5-plus',
  'coder': 'qwen3-coder-next',
  'writer': 'qwen3-max-2026-01-23',
  'analyst': 'glm-5',
};

export class AgentManager {
  private state: AppState;
  private llmClient: LLMClient;
  private onMessage: (message: Message) => void;
  
  constructor(
    state: AppState,
    llmClient: LLMClient,
    onMessage?: (message: Message) => void
  ) {
    this.state = state;
    this.llmClient = llmClient;
    this.onMessage = onMessage || (() => {});
    
    this.initDefaultAgents();
  }
  
  private initDefaultAgents(): void {
    const defaultAgents: Agent[] = [
      {
        id: 'assistant',
        name: '小助手',
        avatar: '🤖',
        systemPrompt: '你的名字是小助手。你是一个友好、乐于助人的AI助手，总是尽力帮助用户解决问题。回答简洁明了。',
        model: DEFAULT_MODELS['assistant'],
        isActive: true,
      },
      {
        id: 'coder',
        name: '程序员',
        avatar: '👨‍💻',
        systemPrompt: '你的名字是程序员。你是一个专业的软件工程师，擅长写代码、调试和解决技术问题。回答问题时会给出具体的代码示例，代码使用 markdown 代码块格式。',
        model: DEFAULT_MODELS['coder'],
        isActive: true,
      },
      {
        id: 'writer',
        name: '作家',
        avatar: '✍️',
        systemPrompt: '你的名字是作家。你是一个富有创意的写作专家，擅长文案、故事创作和内容优化。文笔优美，表达清晰。',
        model: DEFAULT_MODELS['writer'],
        isActive: true,
      },
      {
        id: 'analyst',
        name: '分析师',
        avatar: '📊',
        systemPrompt: '你的名字是分析师。你是一个数据分析师，擅长数据分析、逻辑推理和洞察发现。回答问题时会给出结构化的分析。',
        model: DEFAULT_MODELS['analyst'],
        isActive: true,
      },
    ];
    
    for (const agent of defaultAgents) {
      this.state.agents.set(agent.id, agent);
    }
  }
  
  getAgent(id: string): Agent | undefined {
    return this.state.agents.get(id);
  }
  
  getAllAgents(): Agent[] {
    return Array.from(this.state.agents.values());
  }
  
  addAgent(agent: Omit<Agent, 'id'>): Agent {
    const newAgent: Agent = {
      ...agent,
      id: uuid(),
    };
    this.state.agents.set(newAgent.id, newAgent);
    return newAgent;
  }
  
  updateAgent(payload: AgentUpdatePayload): Agent | null {
    const agent = this.state.agents.get(payload.agentId);
    if (!agent) {
      return null;
    }
    
    const updatedAgent: Agent = {
      ...agent,
      ...payload.updates,
      id: agent.id,
    };
    
    this.state.agents.set(agent.id, updatedAgent);
    return updatedAgent;
  }
  
  removeAgent(id: string): boolean {
    return this.state.agents.delete(id);
  }
  
  parseMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const agentId = match[1];
      if (this.state.agents.has(agentId)) {
        mentions.push(agentId);
      }
    }
    
    return mentions;
  }
  
  async processUserMessage(
    roomId: string,
    userId: string,
    content: string,
    mentionAgentIds?: string[]
  ): Promise<Message[]> {
    const room = this.state.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    
    const userMessage: Message = {
      id: uuid(),
      roomId,
      from: userId,
      to: 'agents',
      content,
      timestamp: Date.now(),
      type: 'text',
    };
    
    room.messages.push(userMessage);
    this.onMessage(userMessage);
    
    const mentions = mentionAgentIds || this.parseMentions(content);
    const targetAgents = mentions.length > 0
      ? mentions.map(id => this.state.agents.get(id)).filter(Boolean) as Agent[]
      : [this.state.agents.get('assistant')!];
    
    const responses: Message[] = [];
    
    for (const agent of targetAgents) {
      const response = await this.generateAgentResponse(roomId, agent, content, userId);
      responses.push(response);
    }
    
    return responses;
  }
  
  async generateAgentResponse(
    roomId: string,
    agent: Agent,
    userMessage: string,
    fromUserId: string
  ): Promise<Message> {
    const room = this.state.rooms.get(roomId)!;
    const contextKey = `${roomId}:${agent.id}`;
    
    let context = this.state.contexts.get(contextKey);
    if (!context) {
      context = {
        messages: [
          { role: 'system', content: agent.systemPrompt },
        ],
      };
      this.state.contexts.set(contextKey, context);
    }
    
    context.messages.push({ role: 'user', content: userMessage });
    
    const modelConfig: Partial<LLMConfig> = {
      model: agent.model,
    };
    
    const response = await this.llmClient.chat(context, modelConfig);
    
    context.messages.push({ role: 'assistant', content: response });
    
    if (context.messages.length > 20) {
      context.messages = [
        context.messages[0],
        ...context.messages.slice(-16),
      ];
    }
    
    const message: Message = {
      id: uuid(),
      roomId,
      from: agent.id,
      to: fromUserId,
      content: response,
      timestamp: Date.now(),
      type: 'text',
    };
    
    room.messages.push(message);
    this.onMessage(message);
    
    return message;
  }
  
  async agentToAgent(
    roomId: string,
    fromAgent: Agent,
    toAgent: Agent,
    message: string
  ): Promise<Message> {
    const room = this.state.rooms.get(roomId)!;
    
    const contextKey = `${roomId}:${toAgent.id}:a2a`;
    let context = this.state.contexts.get(contextKey);
    if (!context) {
      context = {
        messages: [
          { role: 'system', content: toAgent.systemPrompt },
        ],
      };
      this.state.contexts.set(contextKey, context);
    }
    
    const a2aPrompt = `[${fromAgent.name}对你说]: ${message}`;
    context.messages.push({ role: 'user', content: a2aPrompt });
    
    const modelConfig: Partial<LLMConfig> = {
      model: toAgent.model,
    };
    
    const response = await this.llmClient.chat(context, modelConfig);
    context.messages.push({ role: 'assistant', content: response });
    
    const responseMessage: Message = {
      id: uuid(),
      roomId,
      from: toAgent.id,
      to: fromAgent.id,
      content: response,
      timestamp: Date.now(),
      type: 'text',
    };
    
    room.messages.push(responseMessage);
    this.onMessage(responseMessage);
    
    return responseMessage;
  }
}