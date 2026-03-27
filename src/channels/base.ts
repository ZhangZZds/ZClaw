export interface Message {
  id: string;
  channelId: string;
  from: string;
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'file' | 'video';
  metadata?: Record<string, unknown>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessageHandler {
  (message: Message): Promise<void>;
}

export abstract class ChannelAdapter {
  abstract name: string;
  protected onMessageHandler?: MessageHandler;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract sendMessage(channelId: string, content: string, options?: SendMessageOptions): Promise<SendMessageResult>;

  onMessage(handler: MessageHandler): void {
    this.onMessageHandler = handler;
  }

  protected async processMessage(message: Message): Promise<void> {
    if (this.onMessageHandler) {
      await this.onMessageHandler(message);
    }
  }
}

export interface SendMessageOptions {
  type?: 'text' | 'image' | 'file' | 'video';
  metadata?: Record<string, unknown>;
}
