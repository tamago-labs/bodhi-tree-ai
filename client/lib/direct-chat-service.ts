import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { AIAgent, ChatMessage, ToolCall, StreamChunk } from '@/types';
import { PlaygroundAPI } from './playground-api';

interface ToolUse {
  id: string;
  name: string;
  input: any;
  inputJson?: string;
}

export class DirectAIChatService {
  private client: BedrockRuntimeClient;

  constructor() {
    const awsConfig = this.getAwsConfig();

    this.client = new BedrockRuntimeClient({
      region: awsConfig.awsRegion,
      credentials: {
        accessKeyId: awsConfig.awsAccessKey,
        secretAccessKey: awsConfig.awsSecretKey,
      }
    });
  }

  private getAwsConfig(): { awsAccessKey: string; awsSecretKey: string; awsRegion: string } {
    return {
      awsAccessKey: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || "",
      awsSecretKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || "",
      awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-1'
    };
  }

  async *streamChat(
    agent: AIAgent,
    chatHistory: ChatMessage[],
    currentMessage: string,
    mcpServers: string[] = []
  ): AsyncGenerator<StreamChunk, { stopReason?: string }, unknown> {
    
    let messages = await this.buildConversationMessages(agent, chatHistory, currentMessage, mcpServers);
    let finalStopReason: string | undefined;

    try {
      while (true) {
        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: agent.maxTokens || 4000,
          temperature: agent.temperature || 0.7,
          messages: messages,
        };

        const command = new InvokeModelWithResponseStreamCommand({
          contentType: "application/json",
          body: JSON.stringify(payload),
          modelId: agent.model || "apac.anthropic.claude-sonnet-4-20250514-v1:0",
        });

        const apiResponse: any = await this.client.send(command);

        let pendingToolUses: ToolUse[] = [];
        let hasToolUse = false;
        let streamedText = '';

        // Process the response stream
        for await (const item of apiResponse.body) {
          if (item.chunk?.bytes) {
            try {
              const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
              const chunkType = chunk.type;

              if (chunkType === "message_delta" && chunk.delta?.stop_reason) {
                finalStopReason = chunk.delta.stop_reason;
              } else if (chunkType === "content_block_start") {
                if (chunk.content_block?.type === 'tool_use') {
                  hasToolUse = true;
                  const toolCall: ToolCall = {
                    id: chunk.content_block.id,
                    name: chunk.content_block.name,
                    input: {},
                    status: 'pending',
                    startTime: Date.now()
                  };
                  
                  pendingToolUses.push({
                    id: chunk.content_block.id,
                    name: chunk.content_block.name,
                    input: {},
                  });
                  
                  yield {
                    type: 'tool_start',
                    content: `\n\n🔧 Using ${chunk.content_block.name}...\n`,
                    toolCall: toolCall
                  };
                }
              } else if (chunkType === "content_block_delta") {
                if (chunk.delta?.type === 'text_delta' && chunk.delta?.text) {
                  yield {
                    type: 'text',
                    content: chunk.delta.text
                  };
                  streamedText += chunk.delta.text;
                } else if (chunk.delta?.type === 'input_json_delta' && chunk.delta?.partial_json) {
                  // Collect tool input
                  const lastTool: any = pendingToolUses[pendingToolUses.length - 1];
                  if (lastTool) {
                    if (!lastTool.inputJson) lastTool.inputJson = '';
                    lastTool.inputJson += chunk.delta.partial_json;
                  }
                }
              } else if (chunkType === "content_block_stop") {
                const lastTool: any = pendingToolUses[pendingToolUses.length - 1];
                if (lastTool && lastTool.inputJson) {
                  try {
                    lastTool.input = JSON.parse(lastTool.inputJson);
                  } catch (parseError) {
                    console.error('Failed to parse tool input JSON:', parseError);
                    lastTool.input = {};
                  }
                }
              }
            } catch (parseError) {
              console.error('Failed to parse chunk:', parseError);
            }
          }
        }

        // If no tools were used, complete
        if (!hasToolUse || pendingToolUses.length === 0) {
          break;
        }

        // Build assistant message content
        const assistantContent: any[] = [];
        if (streamedText.trim()) {
          assistantContent.push({
            type: 'text',
            text: streamedText.trim()
          });
        }

        // Add tool use blocks
        for (const toolUse of pendingToolUses) {
          assistantContent.push({
            type: 'tool_use',
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input
          });
        }

        // Add assistant message
        if (assistantContent.length > 0) {
          messages.push({
            role: 'assistant',
            content: assistantContent
          });
        }

        // Execute tools and add results
        const toolResults: any[] = [];
        for (const toolUse of pendingToolUses) {
          try {
            yield {
              type: 'tool_progress',
              content: `\n🔄 Executing ${toolUse.name}...\n`,
            };

            // Execute MCP tool
            const result = await this.executeMCPTool(toolUse.name, toolUse.input, mcpServers);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            });

            yield {
              type: 'tool_complete',
              content: `✅ ${toolUse.name} completed\n`,
            };
          } catch (error) {
            console.error(`Tool execution error for ${toolUse.name}:`, error);
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: [{
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              }],
              is_error: true
            });

            yield {
              type: 'tool_error',
              content: `❌ ${toolUse.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            };
          }
        }

        // Add tool results message
        if (toolResults.length > 0) {
          messages.push({
            role: 'user',
            content: toolResults
          });
        }
      }

    } catch (error: any) {
      console.error('Direct AI Chat Service: API error:', error);
      throw new Error(`Claude API error: ${error.message}`);
    }

    return { stopReason: finalStopReason };
  }

  private async executeMCPTool(toolName: string, input: any, mcpServers: string[]): Promise<any> {
    if (mcpServers.length === 0) {
      throw new Error('No MCP servers available for tool execution');
    }

    console.log(`Executing MCP tool: ${toolName} with input:`, input);
    console.log(`Available enabled servers:`, mcpServers);
    
    try {
      // Extract server name from tool name (format: "serverName__toolName")
      const serverName = PlaygroundAPI.extractServerName(toolName);
      const actualToolName = toolName.includes('__') ? toolName.split('__')[1] : toolName;
      
      console.log(`Extracted server name: ${serverName}, tool name: ${actualToolName}`);
      
      // Check if the server is in the enabled list (case-insensitive comparison)
      const enabledServer = mcpServers.find(enabled => 
        enabled.toLowerCase() === serverName.toLowerCase() ||
        enabled.toLowerCase().replace(/[^a-z0-9]/g, '') === serverName.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      
      if (!enabledServer) {
        console.error(`Server ${serverName} is not enabled. Available servers: ${mcpServers.join(', ')}`);
        throw new Error(`Server ${serverName} is not enabled. Available servers: ${mcpServers.join(', ')}`);
      }
      
      console.log(`Server ${serverName} is enabled, proceeding with tool call`);
      
      // Call the MCP tool through PlaygroundAPI
      const result = await PlaygroundAPI.callMCPTool(serverName, actualToolName, input);
      
      return {
        tool: toolName,
        serverName: serverName,
        actualToolName: actualToolName,
        input: input,
        result: result,
        timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error(`MCP tool execution failed for ${toolName}:`, error);
      
      return {
        tool: toolName,
        input: input,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        success: false
      };
    }
  }

  private async buildConversationMessages(
    agent: AIAgent, 
    chatHistory: ChatMessage[], 
    currentMessage: string,
    mcpServers: string[]
  ): Promise<any[]> {
    const messages: any[] = [];

    // Add system message with agent's system prompt
    const systemPrompt = await this.buildSystemPrompt(agent, mcpServers);
    
    // Add system prompt as first message
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: systemPrompt }]
    });

    // Add previous conversation history (filter out empty messages)
    for (const msg of chatHistory) {
      if (msg.content && msg.content.trim()) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: [{ type: 'text', text: msg.content }]
        });
      }
    }

    // Add current message
    if (currentMessage && currentMessage.trim()) {
      messages.push({
        role: 'user',
        content: [{ type: 'text', text: currentMessage }]
      });
    }

    return messages;
  }

  private async buildSystemPrompt(agent: AIAgent, mcpServers: string[]): Promise<string> {
    let systemPrompt = agent.systemPrompt || `You are a helpful AI assistant with access to Web3 data through MCP (Model Context Protocol) servers.`;

    // Add MCP context
    if (mcpServers.length > 0) {
      systemPrompt += `\n\nAvailable MCP servers: ${mcpServers.join(', ')}`;
      
      try {
        // Fetch available tools from MCP servers
        const tools = await PlaygroundAPI.getMCPServerTools();
        
        if (tools && Object.keys(tools).length > 0) {
          systemPrompt += `\n\nAvailable MCP tools:\n`;
          
          for (const [serverName, serverTools] of Object.entries(tools as any)) {
            if (mcpServers.includes(serverName) && Array.isArray(serverTools)) {
              systemPrompt += `\n${serverName}:\n`;
              serverTools.forEach((tool: any) => {
                systemPrompt += `  - ${tool.name}: ${tool.description || 'No description'}\n`;
              });
            }
          }
          
          systemPrompt += `\nTool naming convention: Use "serverName__toolName" format when calling tools.`;
        } else {
          systemPrompt += `\n\nYou have access to various Web3 tools through these MCP servers, but the specific tools couldn't be loaded.`;
        }
      } catch (error) {
        console.warn('Could not fetch MCP tools for system prompt:', error);
        systemPrompt += `\n\nYou have access to various Web3 tools through these MCP servers.`;
      }
      
      systemPrompt += `\n\nGuidelines for using MCP tools:
- Tool names are in format "serverName__toolName" 
- Always use MCP tools when available for Web3 data queries
- Explain complex concepts clearly
- Provide actionable insights when possible
- If tools fail, explain the issue and suggest alternatives
- Be helpful, accurate, and comprehensive

Common tool patterns you might have available:
- Token price queries (e.g., "get_token_price")
- Balance checks (e.g., "get_balance") 
- Transaction lookups (e.g., "get_transaction")
- DeFi protocol data (e.g., "get_pool_info", "get_tvl")
- Network statistics (e.g., "get_network_stats")`;
    } else {
      systemPrompt += `\n\nNote: No MCP servers are currently enabled. You can still provide general Web3 information and explanations, but won't have access to real-time data.`;
    }

    return systemPrompt;
  }

  /**
   * Test AWS Bedrock connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testAgent: AIAgent = {
        id: 'test',
        name: 'Test Agent',
        systemPrompt: 'You are a test assistant.',
        model: 'anthropic.claude-3-haiku-20240307-v1:0',
        maxTokens: 50
      };
      
      const testMessages: ChatMessage[] = [];
      
      const response = await this.streamChat(testAgent, testMessages, 'Hello, respond with just "Connection successful"');
      
      let responseText = '';
      for await (const chunk of response) {
        if (chunk.type === 'text') {
          responseText += chunk.content;
        }
      }
      
      return responseText.toLowerCase().includes('connection successful');
    } catch (error) {
      console.error('Bedrock connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID) {
      errors.push('NEXT_PUBLIC_AWS_ACCESS_KEY_ID is not configured');
    }
    
    if (!process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
      errors.push('NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY is not configured');
    }
    
    if (!process.env.NEXT_PUBLIC_AWS_REGION) {
      errors.push('NEXT_PUBLIC_AWS_REGION is not configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const directAIChatService = new DirectAIChatService();
