class MyClawApp {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.agents = [];
    this.models = [];
    this.roomAgents = [];
    this.currentRoomId = 'lobby';
    this.currentEditAgent = null;
    this.rooms = [];
    this.currentRoomMode = 'parallel';
    
    this.elements = {
      agentList: document.getElementById('agent-list'),
      roomAgents: document.getElementById('room-agents'),
      messages: document.getElementById('messages'),
      inputForm: document.getElementById('input-form'),
      messageInput: document.getElementById('message-input'),
      connectionStatus: document.getElementById('connection-status'),
      mentionHint: document.getElementById('mention-hint'),
      roomName: document.getElementById('room-name'),
      roomModeBadge: document.getElementById('room-mode-badge'),
      apiKeyInput: document.getElementById('api-key-input'),
      saveConfigBtn: document.getElementById('save-config-btn'),
      configStatus: document.getElementById('config-status'),
      roomList: document.getElementById('room-list'),
      newRoomName: document.getElementById('new-room-name'),
      roomModeSelect: document.getElementById('room-mode-select'),
      createRoomBtn: document.getElementById('create-room-btn'),
      modal: document.getElementById('agent-modal'),
      modalAgentName: document.getElementById('modal-agent-name'),
      modalAgentNameInput: document.getElementById('modal-agent-name-input'),
      modalAgentModel: document.getElementById('modal-agent-model'),
      modalAgentPrompt: document.getElementById('modal-agent-prompt'),
      modalClose: document.getElementById('modal-close'),
      modalCancel: document.getElementById('modal-cancel'),
      modalSave: document.getElementById('modal-save'),
    };
    
    this.init();
  }
  
  init() {
    this.connect();
    this.bindEvents();
  }
  
  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    this.ws.onopen = () => {
      this.elements.connectionStatus.textContent = '已连接';
      this.elements.connectionStatus.classList.add('connected');
    };
    
    this.ws.onclose = () => {
      this.elements.connectionStatus.textContent = '已断开';
      this.elements.connectionStatus.classList.remove('connected');
      setTimeout(() => this.connect(), 3000);
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'connected':
        this.clientId = data.payload.clientId;
        break;
        
      case 'init':
        this.agents = data.payload.agents;
        this.models = data.payload.models || [];
        this.rooms = data.payload.rooms || [];
        this.renderAgentList();
        this.renderRoomList();
        
        if (data.payload.modelConfig) {
          if (data.payload.modelConfig.hasApiKey) {
            this.elements.configStatus.textContent = '✓ API Key 已配置';
            this.elements.configStatus.className = 'config-status success';
          } else {
            this.elements.configStatus.textContent = '⚠ 未配置 API Key，使用模拟模式';
            this.elements.configStatus.className = 'config-status warning';
          }
        }
        
        const room = data.payload.rooms?.find(r => r.id === this.currentRoomId) || data.payload.rooms?.[0];
        if (room) {
          this.roomAgents = room.agents;
          this.currentRoomMode = room.collaborationMode || 'parallel';
          this.updateRoomModeBadge();
          this.renderRoomAgents();
        }
        break;
        
      case 'message':
        this.appendMessage(data.payload);
        break;
        
      case 'agent_list':
        this.agents = data.payload;
        this.renderAgentList();
        this.renderRoomAgents();
        break;
        
      case 'room_list':
        this.rooms = data.payload;
        this.renderRoomList();
        const currentRoom = this.rooms.find(r => r.id === this.currentRoomId);
        if (currentRoom) {
          this.roomAgents = currentRoom.agents;
          this.currentRoomMode = currentRoom.collaborationMode || 'parallel';
          this.updateRoomModeBadge();
          this.renderRoomAgents();
        }
        break;
    }
  }
  
  bindEvents() {
    this.elements.inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    this.elements.messageInput.addEventListener('input', () => {
      this.updateMentionHint();
    });
    
    this.elements.saveConfigBtn.addEventListener('click', () => {
      this.saveConfig();
    });
    
    this.elements.modalClose.addEventListener('click', () => {
      this.closeModal();
    });
    
    this.elements.modalCancel.addEventListener('click', () => {
      this.closeModal();
    });
    
    this.elements.modalSave.addEventListener('click', () => {
      this.saveAgentConfig();
    });
    
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) {
        this.closeModal();
      }
    });
    
    this.elements.createRoomBtn.addEventListener('click', () => {
      this.createRoom();
    });
  }
  
  createRoom() {
    const name = this.elements.newRoomName.value.trim();
    const collaborationMode = this.elements.roomModeSelect.value;
    
    if (!name) {
      alert('请输入房间名称');
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'room_create',
      payload: {
        name,
        collaborationMode,
      },
    }));
    
    this.elements.newRoomName.value = '';
  }
  
  renderAgentList() {
    this.elements.agentList.innerHTML = this.agents.map(agent => {
      const inRoom = this.roomAgents.includes(agent.id);
      const model = this.models.find(m => m.id === agent.model);
      const modelName = model ? model.name : agent.model;
      
      return `
        <div class="agent-item ${inRoom ? 'in-room' : ''}" data-agent-id="${agent.id}">
          <span class="agent-avatar">${agent.avatar}</span>
          <div class="agent-info">
            <div class="agent-name">${agent.name}</div>
            <div class="agent-model">${modelName}</div>
          </div>
          <div class="agent-actions">
            <button class="config-btn" onclick="app.openAgentConfig('${agent.id}')">⚙️</button>
            ${inRoom 
              ? `<button onclick="app.removeAgent('${agent.id}')">移出</button>`
              : `<button onclick="app.addAgent('${agent.id}')">加入</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  }
  
  renderRoomAgents() {
    const roomAgentObjects = this.agents.filter(a => this.roomAgents.includes(a.id));
    
    this.elements.roomAgents.innerHTML = roomAgentObjects.length > 0
      ? roomAgentObjects.map(agent => {
        const model = this.models.find(m => m.id === agent.model);
        const modelName = model ? model.name : agent.model;
        
        return `
          <div class="agent-item in-room" data-agent-id="${agent.id}">
            <span class="agent-avatar">${agent.avatar}</span>
            <div class="agent-info">
              <div class="agent-name">${agent.name}</div>
              <div class="agent-model">${modelName}</div>
            </div>
          </div>
        `;
      }).join('')
      : '<p style="color: var(--text-muted); font-size: 14px;">暂无机器人，请从上方添加</p>';
    
    this.renderAgentList();
  }
  
  renderRoomList() {
    this.elements.roomList.innerHTML = this.rooms.map(room => {
      const modeLabels = {
        parallel: '并行模式',
        team: '团队模式',
        decision: '决策模式',
        pipeline: '流水线模式',
        'ralph-loop': '自主循环模式',
      };
      
      return `
        <div class="room-item ${room.id === this.currentRoomId ? 'active' : ''}" data-room-id="${room.id}">
          <div class="room-info" onclick="app.switchRoom('${room.id}')">
            <span class="room-name">${room.name}</span>
            <span class="room-mode">${modeLabels[room.collaborationMode] || '并行模式'}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  updateRoomModeBadge() {
    const modeLabels = {
      parallel: '并行模式',
      team: '团队模式',
      decision: '决策模式',
      pipeline: '流水线模式',
      'ralph-loop': '自主循环模式',
    };
    
    this.elements.roomModeBadge.textContent = modeLabels[this.currentRoomMode] || '并行模式';
  }
  
  switchRoom(roomId) {
    this.currentRoomId = roomId;
    const room = this.rooms.find(r => r.id === roomId);
    if (room) {
      this.roomAgents = room.agents;
      this.currentRoomMode = room.collaborationMode || 'parallel';
      this.updateRoomModeBadge();
      this.elements.roomName.textContent = room.name;
      this.renderRoomAgents();
      this.renderRoomList();
      this.loadRoomMessages();
    }
  }
  
  loadRoomMessages() {
    fetch(`/api/rooms/${this.currentRoomId}/messages`)
      .then(res => res.json())
      .then(messages => {
        this.elements.messages.innerHTML = '';
        messages.forEach(msg => this.appendMessage(msg));
      });
  }
  
  openAgentConfig(agentId) {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    this.currentEditAgent = agent;
    
    this.elements.modalAgentName.textContent = `配置 ${agent.name}`;
    this.elements.modalAgentNameInput.value = agent.name;
    this.elements.modalAgentPrompt.value = agent.systemPrompt;
    
    this.elements.modalAgentModel.innerHTML = this.models.map(model => 
      `<option value="${model.id}" ${model.id === agent.model ? 'selected' : ''}>${model.name}</option>`
    ).join('');
    
    this.elements.modal.classList.add('active');
  }
  
  closeModal() {
    this.elements.modal.classList.remove('active');
    this.currentEditAgent = null;
  }
  
  saveAgentConfig() {
    if (!this.currentEditAgent) return;
    
    const updates = {
      name: this.elements.modalAgentNameInput.value,
      model: this.elements.modalAgentModel.value,
      systemPrompt: this.elements.modalAgentPrompt.value,
    };
    
    this.ws.send(JSON.stringify({
      type: 'agent_update',
      payload: {
        agentId: this.currentEditAgent.id,
        updates,
      },
    }));
    
    this.closeModal();
  }
  
  saveConfig() {
    const apiKey = this.elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.elements.configStatus.textContent = '请输入 API Key';
      this.elements.configStatus.className = 'config-status warning';
      return;
    }
    
    this.ws.send(JSON.stringify({
      type: 'model_config',
      payload: {
        apiKey,
        baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
      },
    }));
    
    this.elements.configStatus.textContent = '✓ 配置已保存';
    this.elements.configStatus.className = 'config-status success';
    this.elements.apiKeyInput.value = '';
  }
  
  addAgent(agentId) {
    this.ws.send(JSON.stringify({
      type: 'agent_add',
      payload: {
        roomId: this.currentRoomId,
        agentId,
      },
    }));
    this.roomAgents.push(agentId);
    this.renderRoomAgents();
  }
  
  removeAgent(agentId) {
    this.ws.send(JSON.stringify({
      type: 'agent_remove',
      payload: {
        roomId: this.currentRoomId,
        agentId,
      },
    }));
    this.roomAgents = this.roomAgents.filter(id => id !== agentId);
    this.renderRoomAgents();
  }
  
  updateMentionHint() {
    const input = this.elements.messageInput.value;
    const mentionMatch = input.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const prefix = mentionMatch[1].toLowerCase();
      const matches = this.agents.filter(a => 
        a.id.toLowerCase().startsWith(prefix) || 
        a.name.toLowerCase().includes(prefix)
      );
      
      if (matches.length > 0) {
        this.elements.mentionHint.textContent = `可呼叫: ${matches.map(a => `@${a.id}`).join(', ')}`;
      } else {
        this.elements.mentionHint.textContent = `可呼叫: ${this.agents.map(a => `@${a.id}`).join(', ')}`;
      }
    } else {
      this.elements.mentionHint.textContent = '';
    }
  }
  
  sendMessage() {
    const content = this.elements.messageInput.value.trim();
    if (!content) return;
    
    const mentionMatch = content.match(/@(\w+)/g);
    const mentionAgentIds = mentionMatch 
      ? mentionMatch.map(m => m.slice(1)).filter(id => this.agents.some(a => a.id === id))
      : undefined;
    
    this.ws.send(JSON.stringify({
      type: 'chat',
      payload: {
        roomId: this.currentRoomId,
        content,
        mentionAgentIds,
      },
    }));
    
    this.appendMessage({
      id: Date.now().toString(),
      roomId: this.currentRoomId,
      from: this.clientId,
      to: 'agents',
      content,
      timestamp: Date.now(),
      type: 'text',
    });
    
    this.elements.messageInput.value = '';
    this.elements.mentionHint.textContent = '';
  }
  
  appendMessage(message) {
    const isUser = message.from === this.clientId;
    const isSystem = message.from === 'system';
    const agent = this.agents.find(a => a.id === message.from);
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isUser ? 'from-user' : ''} ${isSystem ? 'from-system' : ''} ${agent ? 'from-agent' : ''}`;
    
    const avatar = isSystem ? '📢' : (agent ? agent.avatar : '👤');
    const name = isSystem ? '系统' : (agent ? agent.name : '你');
    const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messageEl.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-name">${name}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${this.escapeHtml(message.content)}</div>
      </div>
    `;
    
    this.elements.messages.appendChild(messageEl);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const app = new MyClawApp();