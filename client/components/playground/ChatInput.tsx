'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled = false, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Reset height to auto to get the correct scrollHeight
    const textarea = e.target;
    textarea.style.height = 'auto';
    
    // Set height to scrollHeight (with a max height)
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  };

  return (
    <div className="relative">
      <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-lg focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your message..."}
          disabled={disabled}
          className="flex-1 resize-none py-3 px-4 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed max-h-48"
          rows={1}
          style={{ minHeight: '24px' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="m-2 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          style={{
            backgroundColor: message.trim() && !disabled ? '#ea580c' : '#f3f4f6',
            color: message.trim() && !disabled ? '#ffffff' : '#9ca3af'
          }}
        >
          {disabled ? (
            <Square className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send, 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Shift+Enter</kbd> for new line
        </div>
        
        {message.length > 500 && (
          <div className="text-xs text-orange-600">
            {message.length}/1000 characters
          </div>
        )}
      </div>
    </div>
  );
}
