'use client';

import { useState } from 'react';
import { User, Bot, Copy, Check, ChevronDown, ChevronUp, Play, AlertCircle, Database, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType, ToolResult } from '@/types/playground';
import { ToolResultDisplay } from './ToolResultDisplay';
import { ConversationStorage } from '@/lib/storage';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    return ConversationStorage.formatTimestamp(new Date(timestamp));
  };

  // Dynamic tag parser 
  const parseTag = (tagName: string, content?: string): string => {
    // Special handling for JSON content (function_result, data, etc.)
    if (content && (tagName.includes('result') || tagName.includes('data'))) {
      try {
        const jsonData = JSON.parse(content.trim());
        return formatDynamicContent(jsonData);
      } catch (error) {
        // Not JSON, continue with normal processing
      }
    }
    
    // Special handling for thinking/collapsible content
    if (tagName.includes('thinking') || tagName.includes('process')) {
      return content ? `
<details className="mcp-thinking">
<summary className="mcp-thinking-summary">🧠 ${tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</summary>

${content}

</details>
      `.trim() : '';
    }
    
    // Special handling for tools/actions
    if (tagName.includes('tool') || tagName.includes('invoke') || tagName.includes('call')) {
      return content ? `🔧 **${tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:** ${content}` : `🔧 **${tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**`;
    }
    
    // Special handling for lists
    if (tagName.includes('list')) {
      return `📋 **${tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}**`;
    }
    
    // Default handling for any other tag
    const formattedName = tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    if (content) {
      // Try to detect if content is structured data
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(content.trim());
          return `\n**${formattedName}:**\n${formatDynamicContent(jsonData)}\n`;
        } catch (error) {
          // Not JSON, treat as regular content
        }
      }
      
      return `\n**${formattedName}:**\n\`\`\`\n${content.trim()}\n\`\`\`\n`;
    } else {
      return `\n**${formattedName}**\n`;
    }
  };

  // Universal tag processor - handles any tag dynamically
  const preprocessContent = (content: string) => {
    let processed = content;
    
    // Match all tags (both self-closing and with content)
    const tagRegex = /<(\w+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>|<(\w+)(?:\s+[^>]*)?\/>/g;
    
    processed = processed.replace(tagRegex, (match, tagNameWithContent, tagContent, selfClosingTag) => {
      const tagName = tagNameWithContent || selfClosingTag;
      const tagContentToUse = tagNameWithContent ? tagContent : undefined;
      
      return parseTag(tagName, tagContentToUse);
    });
    
    return processed;
  };

  const formatDynamicContent = (data: any): string => {
    // For function_result tags, default to JSON formatting unless it's specific table-friendly data
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      
      // Only format as table for very specific, clean data structures
      if (keys.includes('pools') && Array.isArray(data.pools)) {
        return `🏊 **Pool Data:**\n${formatDynamicTable(data.pools)}`;
      }
      
      // Check if it's a simple array of primitive values
      if (Array.isArray(data)) {
        if (data.length === 0) return '📊 *No data available*';
        
        // Only format as table if it's a clean array of simple objects with consistent keys
        if (data.every(item => typeof item === 'object' && item !== null)) {
          const allKeys = new Set<string>();
          data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
          
          // Only auto-format as table if we have a reasonable number of columns and simple data
          if (allKeys.size <= 8 && allKeys.size > 0) {
            const keysArray = Array.from(allKeys);
            const hasSimpleValues = data.every(item => 
              keysArray.every(key => {
                const value = item[key];
                return typeof value !== 'object' || value === null;
              })
            );
            
            if (hasSimpleValues) {
              return formatDynamicTable(data);
            }
          }
        }
        
        // For complex arrays, show as JSON
        return `📋 **Results:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }
      
      // For all other objects, show as formatted JSON
      return `📄 **Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }
    
    // Primitive value
    return `📄 **Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  };

  const formatDynamicTable = (dataArray: any[]): string => {
    if (dataArray.length === 0) return '📊 *No data available*';
    
    // Collect all possible keys from all objects
    const allKeys = new Set<string>();
    dataArray.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => allKeys.add(key));
      }
    });
    
    const headers = Array.from(allKeys).map(key => 
      key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    );
    
    const rows = dataArray.map(item => {
      if (typeof item !== 'object' || item === null) {
        return headers.map(() => 'N/A');
      }
      
      return headers.map(header => {
        const originalKey = header.toLowerCase().replace(/ /g, '_');
        const value = item[originalKey] || item[header] || 'N/A';
        
        // Format the value
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return String(value);
      });
    });
    
    return createMarkdownTable(headers, rows);
  };

  const formatObjectAsTable = (obj: any): string => {
    const headers = ['Property', 'Value'];
    const rows = Object.entries(obj).map(([key, value]) => [
      key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      typeof value === 'object' && value !== null 
        ? JSON.stringify(value, null, 2) 
        : String(value)
    ]);
    
    return createMarkdownTable(headers, rows);
  };

  const createMarkdownTable = (headers: string[], rows: string[][]): string => {
    // Calculate column widths
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth, 8);
    });
    
    // Format header
    const headerRow = headers.map((header, i) => 
      header.padEnd(colWidths[i])
    ).join(' | ');
    
    const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
    
    // Format data rows
    const dataRows = rows.map(row => 
      row.map((cell, i) => {
        const cellStr = String(cell || 'N/A');
        // Truncate very long cells
        if (cellStr.length > 50) {
          return cellStr.substring(0, 47) + '...';
        }
        return cellStr.padEnd(colWidths[i]);
      }).join(' | ')
    );
    
    return `\n${headerRow}\n${separator}\n${dataRows.join('\n')}\n`;
  };

  const isUser = message.type === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-orange-600 text-white' 
            : 'bg-gray-200 text-gray-700'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-3xl ${isUser ? 'order-1 items-end' : 'order-2 items-start'}`}>
        {/* Message Bubble */}
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-orange-600 text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          {/* Message Text */}
          <div className={`break-words ${isUser ? 'whitespace-pre-wrap' : ''}`}>
            {isUser ? (
              <>
                {message.content}
                {isTyping && !message.content && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                )}
              </>
            ) : (
              <>
                {message.content && (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: ({ className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match;
                          
                          // Handle custom ToolListBadge component
                          if (className === 'language-toollistbadge') {
                            return (
                              <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <Database className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">MCP Tools Available</span>
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">6</span>
                              </div>
                            );
                          }
                          
                          return !isInline ? (
                            <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                        // Handle custom details/summary for MCP thinking
                        details: ({ children, ...props }: any) => {
                          const className = props.className || '';
                          if (className.includes('mcp-thinking')) {
                            return (
                              <details className="mcp-thinking my-3 border border-gray-200 rounded-lg overflow-hidden">
                                {children}
                              </details>
                            );
                          }
                          return <details {...props}>{children}</details>;
                        },
                        summary: ({ children, ...props }: any) => {
                          const className = props.className || '';
                          if (className.includes('mcp-thinking-summary')) {
                            return (
                              <summary className="mcp-thinking-summary px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center gap-2 border-b border-gray-200">
                                <Brain className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-gray-900">AI Thinking Process</span>
                              </summary>
                            );
                          }
                          return <summary {...props}>{children}</summary>;
                        },
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-orange-600 hover:text-orange-700 underline"
                          >
                            {children}
                          </a>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-200 px-3 py-2">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {preprocessContent(message.content)}
                    </ReactMarkdown>
                  </div>
                )}
                {isTyping && !message.content && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Tool Results */}
          {message.toolResults && message.toolResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.toolResults.map((tool) => (
                <div key={tool.id || tool.toolId} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Tool Header */}
                  <button
                    onClick={() => toggleToolExpansion(tool.toolId)}
                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        tool.status === 'completed' ? 'bg-green-100' :
                        tool.status === 'error' ? 'bg-red-100' :
                        tool.status === 'running' ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        {tool.status === 'completed' ? (
                          <Check className="w-2 h-2 text-green-600" />
                        ) : tool.status === 'error' ? (
                          <AlertCircle className="w-2 h-2 text-red-600" />
                        ) : tool.status === 'running' ? (
                          <Play className="w-2 h-2 text-blue-600" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {tool.name}
                      </span>
                      {tool.serverName && (
                        <span className="text-xs text-gray-500">
                          ({tool.serverName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.duration && (
                        <span className="text-xs text-gray-500">
                          {tool.duration}
                        </span>
                      )}
                      {expandedTools[tool.toolId] ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Tool Content */}
                  {expandedTools[tool.toolId] && (
                    <div className="border-t border-gray-200">
                      <ToolResultDisplay tool={tool} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Footer */}
        <div className={`flex items-center gap-2 mt-1 px-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.timestamp)}
          </span>
          
          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-gray-500" />
              )}
            </button>
          )}

          {message.hasToolCalls && (
            <span className="text-xs text-orange-600 font-medium">
              🛠️ Used tools
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
