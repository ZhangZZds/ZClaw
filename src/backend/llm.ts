import type { LLMConfig, ChatContext } from './types.js';

export interface LLMClient {
  chat(context: ChatContext, config?: Partial<LLMConfig>): Promise<string>;
}

export class MockLLMClient implements LLMClient {
  async chat(context: ChatContext, _config?: Partial<LLMConfig>): Promise<string> {
    const lastMessage = context.messages[context.messages.length - 1];
    const systemMessage = context.messages.find(m => m.role === 'system');
    
    const agentName = systemMessage?.content.match(/你的名字是(.+?)。/)?.[1] || '助手';
    
    await this.delay(500 + Math.random() * 1000);
    
    const responses = [
      `我是${agentName}，收到你的消息："${lastMessage?.content.slice(0, 50)}..."`,
      `${agentName}正在思考中... 你说的"${lastMessage?.content.slice(0, 30)}..."很有意思！`,
      `好的，${agentName}明白了。你提到了：${lastMessage?.content.slice(0, 40)}...`,
      `作为${agentName}，我认为这是一个好问题。让我分析一下...`,
      `${agentName}收到！这个问题我来帮你处理。`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class DashScopeLLMClient implements LLMClient {
  private defaultConfig: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.defaultConfig = config;
  }
  
  async chat(context: ChatContext, config?: Partial<LLMConfig>): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const model = finalConfig.model || 'qwen3.5-plus';
    
    const isMock = model === 'mock' || !finalConfig.apiKey;
    if (isMock) {
      const mockClient = new MockLLMClient();
      return mockClient.chat(context, config);
    }
    
    const baseUrl = finalConfig.baseUrl || 'https://coding.dashscope.aliyuncs.com/v1';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalConfig.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: context.messages,
        max_tokens: 4096,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as { 
      choices: Array<{ message: { content: string } }>;
      error?: { message: string };
    };
    
    if (data.error) {
      throw new Error(`LLM API error: ${data.error.message}`);
    }
    
    return data.choices[0]?.message?.content || '';
  }
}

export function createLLMClient(config?: LLMConfig): LLMClient {
  if (!config?.apiKey || config.apiKey === 'mock') {
    return new MockLLMClient();
  }
  return new DashScopeLLMClient(config);
}