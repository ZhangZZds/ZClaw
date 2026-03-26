export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  maxTokens?: number;
  supportsVision?: boolean;
  supportsThinking?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', provider: 'openai', supportsVision: true, supportsThinking: true },
  { id: 'qwen3-max-2026-01-23', name: 'Qwen3 Max', provider: 'openai' },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', provider: 'openai' },
  { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', provider: 'openai' },
  { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', provider: 'openai', supportsThinking: true },
  { id: 'glm-5', name: 'GLM-5', provider: 'openai', supportsThinking: true },
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'openai', supportsThinking: true },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'openai', supportsVision: true, supportsThinking: true },
  { id: 'mock', name: '模拟模式 (Mock)', provider: 'openai' },
];

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  systemPrompt: string;
  model: string;
  tools?: string[];
  isActive: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface Room {
  id: string;
  name: string;
  agents: string[];
  messages: Message[];
  createdAt: number;
}

export interface ChatContext {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface AppState {
  agents: Map<string, Agent>;
  rooms: Map<string, Room>;
  contexts: Map<string, ChatContext>;
  modelConfig: LLMConfig;
}

export interface WSMessage {
  type: 'join' | 'leave' | 'chat' | 'agent_add' | 'agent_remove' | 'agent_list' | 'room_list' | 'model_config' | 'agent_update';
  payload: unknown;
}

export interface ChatPayload {
  roomId: string;
  content: string;
  mentionAgentIds?: string[];
}

export interface AgentAddPayload {
  roomId: string;
  agentId: string;
}

export interface AgentUpdatePayload {
  agentId: string;
  updates: Partial<Agent>;
}

export interface ModelConfigPayload {
  apiKey?: string;
  baseUrl?: string;
}