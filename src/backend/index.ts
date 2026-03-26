import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { AppState, Message, WSMessage, ChatPayload, AgentAddPayload, AgentUpdatePayload, ModelConfigPayload } from './types.js';
import { AVAILABLE_MODELS } from './types.js';
import { createLLMClient } from './llm.js';
import { AgentManager } from './agent-manager.js';
import { RoomManager } from './room-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const modelConfig = {
  provider: process.env.LLM_PROVIDER || 'dashscope',
  apiKey: process.env.LLM_API_KEY || '',
  baseUrl: process.env.LLM_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1',
  model: process.env.LLM_MODEL || 'qwen3.5-plus',
};

const state: AppState = {
  agents: new Map(),
  rooms: new Map(),
  contexts: new Map(),
  modelConfig,
};

const clients = new Map<string, WebSocket>();

function broadcast(message: Message): void {
  const payload = JSON.stringify({
    type: 'message',
    payload: message,
  });
  
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function broadcastAgentUpdate(): void {
  const payload = JSON.stringify({
    type: 'agent_list',
    payload: agentManager.getAllAgents(),
  });
  
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

const llmClient = createLLMClient(modelConfig);
const agentManager = new AgentManager(state, llmClient, broadcast);
const roomManager = new RoomManager(state, broadcast);

const frontendPath = join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use(express.json());

app.get('/api/agents', (req, res) => {
  res.json(agentManager.getAllAgents());
});

app.patch('/api/agents/:agentId', (req, res) => {
  const payload: AgentUpdatePayload = {
    agentId: req.params.agentId,
    updates: req.body,
  };
  const updated = agentManager.updateAgent(payload);
  if (updated) {
    broadcastAgentUpdate();
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.get('/api/models', (req, res) => {
  res.json(AVAILABLE_MODELS);
});

app.get('/api/config', (req, res) => {
  res.json({
    modelConfig: {
      baseUrl: state.modelConfig.baseUrl,
      hasApiKey: !!state.modelConfig.apiKey,
    },
    availableModels: AVAILABLE_MODELS,
  });
});

app.post('/api/config', (req, res) => {
  const payload = req.body as ModelConfigPayload;
  
  if (payload.apiKey) {
    state.modelConfig.apiKey = payload.apiKey;
  }
  if (payload.baseUrl) {
    state.modelConfig.baseUrl = payload.baseUrl;
  }
  
  res.json({ success: true });
});

app.get('/api/rooms', (req, res) => {
  res.json(roomManager.getAllRooms().map(room => ({
    id: room.id,
    name: room.name,
    agents: room.agents,
    messageCount: room.messages.length,
  })));
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const messages = roomManager.getRoomMessages(req.params.roomId, 100);
  res.json(messages);
});

app.post('/api/rooms/:roomId/agents', (req, res) => {
  const { agentId } = req.body;
  const success = roomManager.addAgentToRoom(req.params.roomId, agentId);
  res.json({ success });
});

app.delete('/api/rooms/:roomId/agents/:agentId', (req, res) => {
  const success = roomManager.removeAgentFromRoom(req.params.roomId, req.params.agentId);
  res.json({ success });
});

wss.on('connection', (ws) => {
  const clientId = uuid();
  clients.set(clientId, ws);
  
  console.log(`Client connected: ${clientId}`);
  
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { clientId },
  }));
  
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      agents: agentManager.getAllAgents(),
      rooms: roomManager.getAllRooms().map(r => ({
        id: r.id,
        name: r.name,
        agents: r.agents,
      })),
      models: AVAILABLE_MODELS,
      modelConfig: {
        baseUrl: state.modelConfig.baseUrl,
        hasApiKey: !!state.modelConfig.apiKey,
      },
    },
  }));
  
  ws.on('message', async (data) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());
      
      switch (msg.type) {
        case 'chat': {
          const payload = msg.payload as ChatPayload;
          await agentManager.processUserMessage(
            payload.roomId,
            clientId,
            payload.content,
            payload.mentionAgentIds
          );
          break;
        }
        
        case 'agent_add': {
          const payload = msg.payload as AgentAddPayload;
          roomManager.addAgentToRoom(payload.roomId, payload.agentId);
          break;
        }
        
        case 'agent_remove': {
          const payload = msg.payload as AgentAddPayload;
          roomManager.removeAgentFromRoom(payload.roomId, payload.agentId);
          break;
        }
        
        case 'agent_update': {
          const payload = msg.payload as AgentUpdatePayload;
          agentManager.updateAgent(payload);
          broadcastAgentUpdate();
          break;
        }
        
        case 'model_config': {
          const payload = msg.payload as ModelConfigPayload;
          if (payload.apiKey) {
            state.modelConfig.apiKey = payload.apiKey;
          }
          if (payload.baseUrl) {
            state.modelConfig.baseUrl = payload.baseUrl;
          }
          break;
        }
        
        case 'agent_list': {
          ws.send(JSON.stringify({
            type: 'agent_list',
            payload: agentManager.getAllAgents(),
          }));
          break;
        }
        
        case 'room_list': {
          ws.send(JSON.stringify({
            type: 'room_list',
            payload: roomManager.getAllRooms().map(r => ({
              id: r.id,
              name: r.name,
              agents: r.agents,
            })),
          }));
          break;
        }
      }
    } catch (err) {
      console.error('Message handling error:', err);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`MyClaw server running at http://localhost:${PORT}`);
  console.log('Available agents:', agentManager.getAllAgents().map(a => `${a.name}(${a.model})`).join(', '));
  console.log('Model config:', state.modelConfig.apiKey ? 'API Key configured' : 'Using mock mode');
});