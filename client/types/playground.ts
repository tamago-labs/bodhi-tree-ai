export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  mcpSettings: MCPSettings;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolResults?: ToolResult[];
  hasToolCalls?: boolean;
}

export interface ToolResult {
  id?: string;
  toolId: string;
  name: string;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  serverName?: string;
}

export interface MCPSettings {
  enabledServers: string[];
  selectedModel: 'claude-sonnet-4' | 'claude-haiku';
}

export interface MCPServer {
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: number;
  enabled: boolean;
  registered: boolean;
  lastSeen?: string;
  error?: string;
}

export interface MCPStatus {
  healthy: boolean;
  connectedServers: string[];
  registeredServers: string[];
  serviceUrl: string;
  error?: string;
}

export interface StreamingChunk {
  type?: 'text' | 'tool_start' | 'tool_result' | 'tool_progress' | 'tool_complete' | 'tool_error';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    input?: any;
    output?: any;
    error?: string;
  };
  toolResult?: {
    toolId: string;
    input?: any;
    output?: any;
    error?: string;
  };
}
