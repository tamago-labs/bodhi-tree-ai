'use client';

import { X } from 'lucide-react';
import { Conversation } from '@/types/playground';
import { MCPServerSelector } from './MCPServerSelector';

interface MCPServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onSettingsChange: (settings: any) => void;
}

export function MCPServerModal({ 
  isOpen, 
  onClose, 
  conversation, 
  onSettingsChange 
}: MCPServerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">MCP Server Configuration</h2>
            <p className="text-sm text-gray-500">Manage your Web3 data connections</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Close settings"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <MCPServerSelector
            conversation={conversation}
            onSettingsChange={onSettingsChange}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {conversation?.mcpSettings.enabledServers.length || 0} servers enabled
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
