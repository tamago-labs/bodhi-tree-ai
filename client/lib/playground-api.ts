import { MCPServer, MCPStatus, ToolResult } from '@/types/playground';
import { directAIChatService } from './direct-chat-service';
import { AIAgent } from '@/types';

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://bgnbm6hwk8.ap-southeast-1.awsapprunner.com';
const MCP_API_KEY = process.env.NEXT_PUBLIC_MCP_API_KEY || '';

export class PlaygroundAPI {
  // MCP Server API calls
  static async getMCPStatus(): Promise<MCPStatus> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (MCP_API_KEY) {
        headers['Authorization'] = `Bearer ${MCP_API_KEY}`;
      }

      const response = await fetch(`${MCP_SERVER_URL}/api/mcp`, {
        method: 'GET',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        return data.status;
      } else {
        throw new Error(data.error || 'Failed to get MCP status');
      }
    } catch (error) {
      console.error('Error getting MCP status:', error);
      return {
        healthy: false,
        connectedServers: [],
        registeredServers: [],
        serviceUrl: MCP_SERVER_URL,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getMCPServers(): Promise<MCPServer[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (MCP_API_KEY) {
        headers['Authorization'] = `Bearer ${MCP_API_KEY}`;
      }

      const response = await fetch(`${MCP_SERVER_URL}/api/mcp/servers`, {
        method: 'GET',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        return data.servers.map((server: any) => ({
          name: server.name,
          description: server.description || '',
          status: server.connected ? 'connected' : (server.error ? 'error' : 'disconnected'),
          tools: server.tools || 0,
          enabled: server.connected, // Enable connected servers by default
          registered: server.registered,
          lastSeen: server.lastSeen,
          error: server.error
        }));
      } else {
        throw new Error(data.error || 'Failed to get MCP servers');
      }
    } catch (error) {
      console.error('Error getting MCP servers:', error);
      return [];
    }
  }

  static async getMCPServerTools(): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (MCP_API_KEY) {
        headers['Authorization'] = `Bearer ${MCP_API_KEY}`;
      }

      const response = await fetch(`${MCP_SERVER_URL}/api/mcp/tools`, {
        method: 'GET',
        headers
      });
      const data = await response.json();
      
      if (data.success) {
        return data.tools;
      } else {
        throw new Error(data.error || 'Failed to get MCP tools');
      }
    } catch (error) {
      console.error('Error getting MCP tools:', error);
      return {};
    }
  }

  static async callMCPTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (MCP_API_KEY) {
        headers['Authorization'] = `Bearer ${MCP_API_KEY}`;
      }

      const response = await fetch(`${MCP_SERVER_URL}/api/mcp/tools/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serverName,
          toolName,
          arguments: args
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.result;
      } else {
        throw new Error(data.error || 'Tool call failed');
      }
    } catch (error) {
      console.error('Error calling MCP tool:', error);
      throw error;
    }
  }

  // AI Chat API calls - using direct service
  static async *streamChatMessage(
    messages: any[],
    currentMessage: string,
    selectedModel: string = 'claude-sonnet-4',
    enabledServers: string[] = []
  ): AsyncGenerator<any, void, unknown> {
    try {
      // Create agent configuration
      const agent: AIAgent = {
        id: 'playground-agent',
        name: 'Playground Agent',
        systemPrompt: `You are a helpful AI assistant with access to Web3 data through MCP (Model Context Protocol) servers. 
When users ask about blockchain data, DeFi protocols, token prices, or other Web3-related information, use the available MCP tools to gather real-time data.

Guidelines:
- Always use MCP tools when available for Web3 data queries
- Explain complex concepts clearly
- Provide actionable insights when possible
- If tools fail, explain the issue and suggest alternatives
- Be helpful, accurate, and comprehensive

Available MCP servers: ${enabledServers.join(', ') || 'None configured'}`,
        model: selectedModel === 'claude-sonnet-4' ? 'apac.anthropic.claude-sonnet-4-20250514-v1:0' : 'anthropic.claude-3-haiku-20240307-v1:0',
        temperature: 0.7,
        maxTokens: 4000
      };

      // Convert messages to the expected format
      const chatHistory = messages.map((msg: any) => ({
        id: Date.now().toString() + Math.random(),
        content: msg.content,
        sender: msg.role as 'user' | 'agent',
        timestamp: Date.now()
      }));

      // Stream chat using direct service
      const stream = directAIChatService.streamChat(agent, chatHistory, currentMessage, enabledServers);
      
      for await (const chunk of stream) {
        // Convert to the format expected by the playground
        yield {
          type: chunk.type,
          content: chunk.content,
          toolCall: chunk.toolCall
        };
      }
    } catch (error) {
      console.error('Error streaming chat message:', error);
      yield {
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Utility functions
  static extractServerName(toolName: string): string {
    // Tool names are in format "serverName__toolName"
    const parts = toolName.split('__');
    return parts.length > 1 ? parts[0] : 'unknown';
  }

  static formatToolOutput(output: any): string {
    if (typeof output === 'string') {
      return output;
    }
    
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  }

  static isDefaultServer(serverName: string): boolean {
    const defaultServers = ['nodit', 'agent-base'];
    return defaultServers.includes(serverName);
  }

  // Health check
  static async healthCheck(): Promise<{ mcp: boolean; ai: boolean }> {
    const results = { mcp: false, ai: false };

    try {
      // Check MCP server
      const mcpResponse = await fetch(`${MCP_SERVER_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      results.mcp = mcpResponse.ok;
    } catch (error) {
      console.error('MCP health check failed:', error);
    }

    try {
      // Check AI service using direct service
      const validation = directAIChatService.validateConfig();
      results.ai = validation.isValid;
    } catch (error) {
      console.error('AI health check failed:', error);
    }

    return results;
  }

  // Streaming response parser
  static parseStreamingChunk(chunk: string): any {
    try {
      if (chunk.startsWith('data: ')) {
        const data = chunk.slice(6);
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error parsing streaming chunk:', error);
      return null;
    }
  }

  // Tool result formatter for display
  static formatToolResult(toolResult: ToolResult): {
    title: string;
    content: string;
    status: 'success' | 'error' | 'pending' | 'running';
    duration?: string;
  } {
    const status = toolResult.status === 'completed' ? 'success' : 
                   toolResult.status === 'error' ? 'error' : 
                   toolResult.status;

    const title = `${toolResult.name} (${toolResult.serverName || 'Unknown Server'})`;
    
    let content = '';
    if (toolResult.error) {
      content = `Error: ${toolResult.error}`;
    } else if (toolResult.output) {
      content = this.formatToolOutput(toolResult.output);
    } else if (toolResult.status === 'pending' || toolResult.status === 'running') {
      content = 'Processing...';
    }

    const duration = toolResult.duration ? 
      `${(toolResult.duration / 1000).toFixed(2)}s` : undefined;

    return { title, content, status, duration };
  }
}
