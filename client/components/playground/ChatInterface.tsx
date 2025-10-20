'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Settings, Sparkles } from 'lucide-react';
import { Conversation, ChatMessage } from '@/types/playground';
import { ConversationStorage } from '@/lib/storage';
import { PlaygroundAPI } from '@/lib/playground-api';
import { WelcomeMessage } from  "./WelcomeMessage"
import { ChatMessage as ChatMessageComponent } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { MCPServerModal } from "./MCPServerModal"

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onUpdateConversation: (conversation: Conversation) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ChatInterface({
  conversation,
  onUpdateMessages,
  onUpdateConversation,
  sidebarOpen,
  onToggleSidebar
}: ChatInterfaceProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [showMCPSelector, setShowMCPSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSendMessage = async (message: string) => {
    if (!conversation || !message.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: ConversationStorage.generateMessageId(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: ConversationStorage.generateMessageId(),
      type: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolResults: []
    };

    // Update messages immediately
    const newMessages = [...conversation.messages, userMessage, assistantMessage];
    onUpdateMessages(newMessages);
    setIsTyping(true);

    try {
      // Prepare messages for the direct service (exclude the placeholder assistant message)
      const apiMessages = conversation.messages.concat(userMessage).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      let accumulatedContent = '';

      // Get streaming response from direct service
      for await (const chunk of PlaygroundAPI.streamChatMessage(
        apiMessages,
        message,
        conversation.mcpSettings.selectedModel,
        conversation.mcpSettings.enabledServers
      )) {
        if (chunk.type === 'text' && chunk.content) {
          accumulatedContent += chunk.content;
          assistantMessage.content = accumulatedContent;
          
          // Update the messages with new content
          const updatedMessages = [...newMessages];
          updatedMessages[updatedMessages.length - 1] = assistantMessage;
          onUpdateMessages(updatedMessages);
        } else if (chunk.type === 'tool_start' && chunk.toolCall) {
          // Handle tool start
          const toolResult = {
            id: chunk.toolCall.id,
            toolId: chunk.toolCall.id,
            name: chunk.toolCall.name,
            input: chunk.toolCall.input,
            status: 'running' as const,
            startTime: Date.now()
          };
          
          assistantMessage.toolResults = [...(assistantMessage.toolResults || []), toolResult];
          assistantMessage.hasToolCalls = true;
          
          const updatedMessages = [...newMessages];
          updatedMessages[updatedMessages.length - 1] = assistantMessage;
          onUpdateMessages(updatedMessages);
        } else if (chunk.type === 'tool_complete' || chunk.type === 'tool_error') {
          // Handle tool completion
          if (assistantMessage.toolResults) {
            const toolIndex = assistantMessage.toolResults.findIndex(
              t => t.toolId === chunk.toolCall?.id
            );
            
            if (toolIndex >= 0) {
              const tool = assistantMessage.toolResults[toolIndex];
              tool.endTime = Date.now();
              tool.duration = tool.endTime - (tool.startTime || tool.endTime);
              tool.status = chunk.type === 'tool_error' ? 'error' : 'completed';
              
              if (chunk.type === 'tool_error') {
                tool.error = chunk.content;
              }
              
              const updatedMessages = [...newMessages];
              updatedMessages[updatedMessages.length - 1] = assistantMessage;
              onUpdateMessages(updatedMessages);
            }
          }
        } else if (chunk.type === 'error') {
          // Handle error chunk
          assistantMessage.content = chunk.content;
          const updatedMessages = [...newMessages];
          updatedMessages[updatedMessages.length - 1] = assistantMessage;
          onUpdateMessages(updatedMessages);
          break;
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update assistant message with error
      assistantMessage.content = 'Sorry, I encountered an error while processing your message. Please try again.';
      const updatedMessages = [...newMessages];
      updatedMessages[updatedMessages.length - 1] = assistantMessage;
      onUpdateMessages(updatedMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMCPSettingsChange = (settings: any) => {
    if (!conversation) return;
    
    const updatedConversation = {
      ...conversation,
      mcpSettings: { ...conversation.mcpSettings, ...settings }
    };
    
    onUpdateConversation(updatedConversation);
  };

  // Safety check - if no conversation, show loading state
  if (!conversation) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">AI Playground</h1>
              <p className="text-sm text-gray-500">Chat with AI using Web3 data</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">AI Playground</h1>
            <p className="text-sm text-gray-500">Chat with AI using Web3 data</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMCPSelector(!showMCPSelector)}
            className={`p-2 rounded-lg transition-colors ${
              showMCPSelector 
                ? 'bg-orange-100 text-orange-600' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="MCP Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MCP Settings Modal */}
      <MCPServerModal
        isOpen={showMCPSelector}
        onClose={() => setShowMCPSelector(false)}
        conversation={conversation}
        onSettingsChange={handleMCPSettingsChange}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {conversation.messages.length === 0 ? (
          <WelcomeMessage onStartChat={handleSendMessage} />
        ) : (
          <div className="space-y-4 p-4">
            {conversation.messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isTyping={isTyping && message.id === conversation.messages[conversation.messages.length - 1]?.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          placeholder={isTyping ? "AI is thinking..." : "Ask me anything about Web3, DeFi, or blockchain data..."}
        />
      </div>
    </div>
  );
}
