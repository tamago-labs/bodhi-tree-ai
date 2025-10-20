import { Conversation, ChatMessage } from '@/types/playground';

const STORAGE_KEYS = {
  CONVERSATIONS: 'playground-conversations',
  CURRENT_CONVERSATION: 'playground-current-conversation',
  MCP_SETTINGS: 'playground-mcp-settings',
} as const;

export class ConversationStorage {
  // Conversation management
  static getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  static saveConversation(conversation: Conversation): void {
    if (typeof window === 'undefined') return;
    
    try {
      const conversations = this.getConversations();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.unshift(conversation); // Add to beginning
      }
      
      // Keep only last 50 conversations
      const limitedConversations = conversations.slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(limitedConversations));
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  static deleteConversation(conversationId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const conversations = this.getConversations();
      const filtered = conversations.filter(c => c.id !== conversationId);
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filtered));
      
      // Clear current conversation if it was deleted
      if (this.getCurrentConversationId() === conversationId) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }

  static getCurrentConversationId(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
    } catch (error) {
      console.error('Error getting current conversation:', error);
      return null;
    }
  }

  static setCurrentConversationId(conversationId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, conversationId);
    } catch (error) {
      console.error('Error setting current conversation:', error);
    }
  }

  static createConversation(title?: string): Conversation {
    const now = new Date().toISOString();
    const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      title: title || 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
      mcpSettings: {
        enabledServers: [],
        selectedModel: 'claude-sonnet-4'
      }
    };
  }

  static updateConversationMessages(conversationId: string, messages: ChatMessage[]): void {
    const conversations = this.getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.messages = messages;
      conversation.updatedAt = new Date().toISOString();
      this.saveConversation(conversation);
    }
  }

  static updateConversationTitle(conversationId: string, title: string): void {
    const conversations = this.getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date().toISOString();
      this.saveConversation(conversation);
    }
  }

  static updateConversationMCPSettings(conversationId: string, mcpSettings: any): void {
    const conversations = this.getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.mcpSettings = { ...conversation.mcpSettings, ...mcpSettings };
      conversation.updatedAt = new Date().toISOString();
      this.saveConversation(conversation);
    }
  }

  // MCP Settings management
  static getMCPSettings() {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MCP_SETTINGS);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading MCP settings:', error);
      return null;
    }
  }

  static saveMCPSettings(settings: any): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.MCP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving MCP settings:', error);
    }
  }

  // Utility methods
  static generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static formatTimestamp(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  static generateConversationTitle(firstMessage: string): string {
    const words = firstMessage.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ');
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  }

  // Clear all data (for testing/reset)
  static clearAllData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}
