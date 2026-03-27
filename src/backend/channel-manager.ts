import { ChannelAdapter, Message as ChannelMessage } from '../channels/base.js';

interface ChannelRegistry {
  channels: Map<string, ChannelAdapter>;
}

export class ChannelManager {
  private channels: Map<string, ChannelAdapter> = new Map();
  private onMessageHandler?: (message: ChannelMessage) => Promise<void>;

  registerChannel(channel: ChannelAdapter): void {
    this.channels.set(channel.name, channel);
    
    channel.onMessage(async (message) => {
      if (this.onMessageHandler) {
        await this.onMessageHandler(message);
      }
    });
    
    console.log(`[ChannelManager] Registered channel: ${channel.name}`);
  }

  unregisterChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.stop();
      this.channels.delete(channelName);
      console.log(`[ChannelManager] Unregistered channel: ${channelName}`);
    }
  }

  getChannel(channelName: string): ChannelAdapter | undefined {
    return this.channels.get(channelName);
  }

  getAllChannels(): ChannelAdapter[] {
    return Array.from(this.channels.values());
  }

  async startAllChannels(): Promise<void> {
    for (const channel of this.channels.values()) {
      try {
        await channel.start();
      } catch (error) {
        console.error(`[ChannelManager] Failed to start channel ${channel.name}:`, error);
      }
    }
  }

  async stopAllChannels(): Promise<void> {
    for (const channel of this.channels.values()) {
      try {
        await channel.stop();
      } catch (error) {
        console.error(`[ChannelManager] Failed to stop channel ${channel.name}:`, error);
      }
    }
  }

  onMessage(handler: (message: ChannelMessage) => Promise<void>): void {
    this.onMessageHandler = handler;
  }
}
