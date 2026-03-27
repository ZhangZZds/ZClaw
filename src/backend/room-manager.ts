import { v4 as uuid } from 'uuid';
import type { AppState, Room, Message } from './types.js';

export class RoomManager {
  private state: AppState;
  private onMessage: (message: Message) => void;
  
  constructor(state: AppState, onMessage?: (message: Message) => void) {
    this.state = state;
    this.onMessage = onMessage || (() => {});
    
    this.createDefaultRoom();
  }
  
  private createDefaultRoom(): void {
    const defaultRoom: Room = {
      id: 'lobby',
      name: '大厅',
      agents: ['assistant'],
      messages: [],
      createdAt: Date.now(),
      collaborationMode: 'parallel',
    };
    
    this.state.rooms.set(defaultRoom.id, defaultRoom);
    
    const welcomeMessage: Message = {
      id: uuid(),
      roomId: defaultRoom.id,
      from: 'system',
      to: 'all',
      content: '欢迎来到 MyClaw 聊天大厅！使用 @助手名 来呼叫特定的机器人。',
      timestamp: Date.now(),
      type: 'system',
    };
    
    defaultRoom.messages.push(welcomeMessage);
  }
  
  createRoom(name: string, collaborationMode: 'parallel' | 'team' | 'pipeline' | 'decision' | 'ralph-loop' = 'parallel'): Room {
    const room: Room = {
      id: uuid(),
      name,
      agents: [],
      messages: [],
      createdAt: Date.now(),
      collaborationMode,
    };
    
    this.state.rooms.set(room.id, room);
    return room;
  }
  
  getRoom(id: string): Room | undefined {
    return this.state.rooms.get(id);
  }
  
  getAllRooms(): Room[] {
    return Array.from(this.state.rooms.values());
  }
  
  addAgentToRoom(roomId: string, agentId: string): boolean {
    const room = this.state.rooms.get(roomId);
    const agent = this.state.agents.get(agentId);
    
    if (!room || !agent) {
      return false;
    }
    
    if (room.agents.includes(agentId)) {
      return true;
    }
    
    room.agents.push(agentId);
    
    const joinMessage: Message = {
      id: uuid(),
      roomId,
      from: 'system',
      to: 'all',
      content: `${agent.name} 加入了房间`,
      timestamp: Date.now(),
      type: 'system',
    };
    
    room.messages.push(joinMessage);
    this.onMessage(joinMessage);
    
    return true;
  }
  
  removeAgentFromRoom(roomId: string, agentId: string): boolean {
    const room = this.state.rooms.get(roomId);
    const agent = this.state.agents.get(agentId);
    
    if (!room || !agent) {
      return false;
    }
    
    const index = room.agents.indexOf(agentId);
    if (index === -1) {
      return false;
    }
    
    room.agents.splice(index, 1);
    
    const leaveMessage: Message = {
      id: uuid(),
      roomId,
      from: 'system',
      to: 'all',
      content: `${agent.name} 离开了房间`,
      timestamp: Date.now(),
      type: 'system',
    };
    
    room.messages.push(leaveMessage);
    this.onMessage(leaveMessage);
    
    return true;
  }
  
  getRoomMessages(roomId: string, limit?: number): Message[] {
    const room = this.state.rooms.get(roomId);
    if (!room) {
      return [];
    }
    
    if (limit && room.messages.length > limit) {
      return room.messages.slice(-limit);
    }
    
    return room.messages;
  }
}