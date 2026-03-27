import * as lark from '@larksuiteoapi/node-sdk';
import { ChannelAdapter, Message, SendMessageOptions, SendMessageResult } from '../base.js';
import express from 'express';

interface FeishuConfig {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
}

export class FeishuChannel extends ChannelAdapter {
  name = 'feishu';
  private client: lark.Client;
  private config: FeishuConfig;
  private chatToRoomMap: Map<string, string> = new Map();
  private roomToChatMap: Map<string, string> = new Map();
  private expressApp?: express.Application;

  constructor(config: FeishuConfig) {
    super();
    this.config = config;
    this.client = new lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
    });
  }

  async start(): Promise<void> {
    console.log('[FeishuChannel] Starting...');
    
    if (this.config.verificationToken) {
      this.setupWebhook();
    }

    console.log('[FeishuChannel] Started');
  }

  async stop(): Promise<void> {
    console.log('[FeishuChannel] Stopping...');
    console.log('[FeishuChannel] Stopped');
  }

  private setupWebhook(): void {
    this.expressApp = express();
    this.expressApp.use(express.json());

    this.expressApp.post('/api/feishu/webhook', async (req, res) => {
      try {
        const { challenge, header, event } = req.body;

        if (challenge) {
          res.send(challenge);
          return;
        }

        if (header?.event_type === 'im.message.receive_v1') {
          await this.handleMessage(req.body);
        }

        res.send('ok');
      } catch (error) {
        console.error('[FeishuChannel] Webhook error:', error);
        res.status(500).send('error');
      }
    });

    const PORT = process.env.FEISHU_WEBHOOK_PORT || 3001;
    this.expressApp.listen(PORT, () => {
      console.log(`[FeishuChannel] Webhook listening on port ${PORT}`);
    });
  }

  private async handleMessage(body: Record<string, unknown>): Promise<void> {
    try {
      const message = this.parseEvent(body);
      if (message) {
        await this.processMessage(message);
      }
    } catch (error) {
      console.error('[FeishuChannel] Error handling message:', error);
    }
  }

  private parseEvent(body: Record<string, unknown>): Message | null {
    const event = body.event as Record<string, unknown> | undefined;
    if (!event) return null;

    const message = event.message as Record<string, unknown> | undefined;
    const sender = event.sender as Record<string, unknown> | undefined;
    
    if (!message || !sender) {
      return null;
    }

    const content = this.extractMessageContent(message);
    
    return {
      id: String(message.message_id || ''),
      channelId: String(message.chat_id || ''),
      from: String((sender.sender_id as Record<string, unknown>)?.open_id || ''),
      content,
      timestamp: Number(message.create_time || Date.now()) / 1000,
      type: 'text',
      metadata: {
        eventType: String((body.header as Record<string, unknown>)?.event_type || ''),
      },
    };
  }

  private extractMessageContent(message: Record<string, unknown>): string {
    const msgType = message.msg_type as string;
    const contentRaw = message.content as string;
    
    try {
      const content = JSON.parse(contentRaw) as Record<string, unknown>;
      
      if (msgType === 'text') {
        return String(content.text || '');
      }
      
      if (msgType === 'post') {
        return this.parsePostContent(content);
      }
      
      if (msgType === 'image') {
        return `[Image: ${content.image_key}]`;
      }
      
      if (msgType === 'file') {
        return `[File: ${content.file_key}]`;
      }
      
      return contentRaw;
    } catch {
      return contentRaw;
    }
  }

  private parsePostContent(content: Record<string, unknown>): string {
    const post = content.post as Record<string, unknown> | undefined;
    if (!post) return '';
    
    const zhCn = (post.zh_cn as Record<string, unknown>[]) || [];
    const texts: string[] = [];
    
    for (const row of zhCn) {
      const tag = row.tag as string;
      
      if (tag === 'text') {
        texts.push(String(row.text || ''));
      } else if (tag === 'a') {
        texts.push(String(row.text || ''));
      } else if (tag === 'at') {
        texts.push(`@${row.user_name || 'someone'}`);
      }
    }
    
    return texts.join('\n');
  }

  async sendMessage(
    channelId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      const msgType = options?.type === 'image' ? 'image' : 'text';
      
      const messageContent = msgType === 'text' 
        ? { text: content }
        : { image_key: content };

      const response = await this.client.im.message.create({
        params: { receive_id_type: 'chat_id' },
        data: {
          receive_id: channelId,
          msg_type: msgType,
          content: JSON.stringify(messageContent),
        },
      });

      return {
        success: true,
        messageId: (response.data as Record<string, unknown>)?.message_id as string,
      };
    } catch (error) {
      console.error('[FeishuChannel] Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  registerRoomMapping(chatId: string, roomId: string): void {
    this.chatToRoomMap.set(chatId, roomId);
    this.roomToChatMap.set(roomId, chatId);
  }

  getRoomId(chatId: string): string | undefined {
    return this.chatToRoomMap.get(chatId);
  }

  getChatId(roomId: string): string | undefined {
    return this.roomToChatMap.get(roomId);
  }
}
