import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

// AWS Bedrock configuration
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

// Model configurations
export const MODEL_CONFIGS = {
  'claude-sonnet-4': {
    id: 'apac.anthropic.claude-sonnet-4-20250514-v1:0',
    maxTokens: 4000,
    temperature: 0.7,
  },
  'claude-haiku': {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    maxTokens: 4096,
    temperature: 0.7,
  },
} as const;

export type ModelId = keyof typeof MODEL_CONFIGS;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: ModelId;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  mcpServers?: string[];
}

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'error';
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    input: any;
  };
  toolResult?: {
    toolId: string;
    output?: any;
    error?: string;
  };
  error?: string;
}

/**
 * Create a streaming chat completion with AWS Bedrock
 */
export async function* createChatStream(
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<StreamChunk> {
  const {
    model = 'claude-sonnet-4',
    temperature = 0.7,
    maxTokens,
    systemPrompt,
    mcpServers = []
  } = options;

  const modelConfig = MODEL_CONFIGS[model];
  
  try {
    // Prepare the request payload for Claude
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens || modelConfig.maxTokens,
      temperature,
      system: systemPrompt || `You are a helpful AI assistant with access to Web3 data through MCP (Model Context Protocol) servers. 
When users ask about blockchain data, DeFi protocols, token prices, or other Web3-related information, use the available MCP tools to gather real-time data.

Guidelines:
- Always use MCP tools when available for Web3 data queries
- Explain complex concepts clearly
- Provide actionable insights when possible
- If tools fail, explain the issue and suggest alternatives
- Be helpful, accurate, and comprehensive

Available MCP servers: ${mcpServers.join(', ') || 'None configured'}`,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelConfig.id,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    
    if (!response.body) {
      throw new Error('No response body received from Bedrock');
    }

    let accumulatedContent = '';
    
    for await (const chunk of response.body) {
      if (chunk.chunk?.bytes) {
        const decodedChunk = new TextDecoder().decode(chunk.chunk.bytes);
        
        try {
          const lines = decodedChunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content_block_delta' && data.delta?.text) {
                accumulatedContent += data.delta.text;
                yield {
                  type: 'text',
                  content: data.delta.text
                };
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing chunk:', parseError);
          yield {
            type: 'error',
            error: 'Failed to parse response chunk'
          };
        }
      }
    }

    // If MCP servers are available, we would process tool calls here
    // For now, this is a placeholder for future MCP integration
    if (mcpServers.length > 0 && accumulatedContent) {
      // TODO: Implement MCP tool calling logic
      // This would involve:
      // 1. Parsing the AI response for tool calls
      // 2. Executing MCP server tools
      // 3. Streaming tool results back
    }

  } catch (error) {
    console.error('Error in createChatStream:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a simple chat completion (non-streaming)
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  let fullResponse = '';
  
  for await (const chunk of createChatStream(messages, options)) {
    if (chunk.type === 'text') {
      fullResponse += chunk.content;
    } else if (chunk.type === 'error') {
      throw new Error(chunk.error);
    }
  }
  
  return fullResponse;
}

/**
 * Test AWS Bedrock connection
 */
export async function testBedrockConnection(): Promise<boolean> {
  try {
    const testMessages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Hello, can you respond with just "Connection successful"?'
      }
    ];
    
    const response = await createChatCompletion(testMessages, {
      model: 'claude-haiku',
      maxTokens: 50
    });
    
    return response.toLowerCase().includes('connection successful');
  } catch (error) {
    console.error('Bedrock connection test failed:', error);
    return false;
  }
}

/**
 * Get available models
 */
export function getAvailableModels(): ModelId[] {
  return Object.keys(MODEL_CONFIGS) as ModelId[];
}

/**
 * Get model configuration
 */
export function getModelConfig(model: ModelId) {
  return MODEL_CONFIGS[model];
}

/**
 * Format messages for API
 */
export function formatMessages(messages: ChatMessage[]): string {
  return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
}

/**
 * Validate API configuration
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
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
