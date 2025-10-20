'use client';

import { useState, useEffect } from 'react';
import { ConversationSidebar } from '@/components/playground/ConversationSidebar';
import { ChatInterface } from '@/components/playground/ChatInterface';
import { Conversation, ChatMessage } from '@/types/playground';
import { ConversationStorage } from '@/lib/storage';
import { PlaygroundAPI } from '@/lib/playground-api';

export default function PlaygroundPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    try {
      const savedConversations = ConversationStorage.getConversations();
      setConversations(savedConversations);

      // Load current conversation
      const currentId = ConversationStorage.getCurrentConversationId();
      if (currentId) {
        const current = savedConversations.find(c => c.id === currentId);
        if (current) {
          setCurrentConversation(current);
        } else {
          // Current conversation not found, create new one
          handleNewConversation();
        }
      } else if (savedConversations.length > 0) {
        // No current conversation, load the most recent
        setCurrentConversation(savedConversations[0]);
        ConversationStorage.setCurrentConversationId(savedConversations[0].id);
      } else {
        // No conversations at all, create new one
        handleNewConversation();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      handleNewConversation();
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newConversation = ConversationStorage.createConversation();
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    ConversationStorage.setCurrentConversationId(newConversation.id);
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      ConversationStorage.setCurrentConversationId(conversationId);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    // First, create a new conversation if we're deleting the last one
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    
    if (updatedConversations.length === 0) {
      // Create a new conversation first to avoid null state
      const newConversation = ConversationStorage.createConversation();
      setConversations([newConversation]);
      setCurrentConversation(newConversation);
      ConversationStorage.setCurrentConversationId(newConversation.id);
      
      // Then delete the old one
      ConversationStorage.deleteConversation(conversationId);
    } else {
      // Delete the conversation first
      ConversationStorage.deleteConversation(conversationId);
      setConversations(updatedConversations);

      // If we deleted the current conversation, select another one
      if (currentConversation?.id === conversationId) {
        const nextConversation = updatedConversations[0];
        setCurrentConversation(nextConversation);
        ConversationStorage.setCurrentConversationId(nextConversation.id);
      }
    }
  };

  const handleUpdateConversation = (updatedConversation: Conversation) => {
    ConversationStorage.saveConversation(updatedConversation);
    setConversations(prev => 
      prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );
    setCurrentConversation(updatedConversation);
  };

  const handleUpdateMessages = (messages: ChatMessage[]) => {
    if (!currentConversation) return;

    const updatedConversation = {
      ...currentConversation,
      messages,
      updatedAt: new Date().toISOString()
    };

    // Update title if this is the first user message and title is still "New Conversation"
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    if (firstUserMessage && currentConversation.title === 'New Conversation') {
      const title = ConversationStorage.generateConversationTitle(firstUserMessage.content);
      updatedConversation.title = title;
    }

    handleUpdateConversation(updatedConversation);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Playground...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white fixed lg:relative h-full z-40 lg:z-auto`}>
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <ChatInterface
          conversation={currentConversation}
          onUpdateMessages={handleUpdateMessages}
          onUpdateConversation={handleUpdateConversation}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  );
}
