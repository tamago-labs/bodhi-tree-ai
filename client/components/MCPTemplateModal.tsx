'use client';

import { useState } from 'react';
import { X, Server, Lock, AlertCircle } from 'lucide-react';
import { MCPTemplate, getMCPTemplatesByCategory } from '@/lib/mcp-templates';

interface MCPTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: MCPTemplate) => void;
}

export function MCPTemplateModal({ isOpen, onClose, onSelectTemplate }: MCPTemplateModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('blockchain');
  const categories = getMCPTemplatesByCategory();

  if (!isOpen) return null;

  const categoryLabels = {
    blockchain: { label: 'Blockchain', icon: '⛓️' },
    defi: { label: 'DeFi', icon: '💰' },
    nft: { label: 'NFT', icon: '🖼️' },
    analytics: { label: 'Analytics', icon: '📊' },
    utility: { label: 'Utility', icon: '🛠️' },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">MCP Server Templates</h2>
            <p className="text-sm text-gray-600 mt-1">Choose a template to get started quickly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {Object.entries(categoryLabels).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === key
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {/* <span className="mr-2">{icon}</span> */}
                    {label}
                    <span className="ml-2 text-xs opacity-70">
                      ({categories[key as keyof typeof categories].length})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories[selectedCategory as keyof typeof categories].map((template) => (
                  <TemplateCard
                    key={template.type}
                    template={template}
                    onSelect={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  />
                ))}
              </div>

              {categories[selectedCategory as keyof typeof categories].length === 0 && (
                <div className="text-center py-12">
                  <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No templates in this category</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onSelect }: { template: MCPTemplate; onSelect: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-orange-500 hover:shadow-md transition-all cursor-pointer group"
         onClick={onSelect}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
            {template.name}
          </h3>
          {template.requiresApiKey && (
            <div className="flex items-center gap-1 mt-1">
              <Lock className="w-3 h-3 text-amber-600" />
              <span className="text-xs text-amber-600">Requires API Key</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      <div className="space-y-2">
        <div className="text-xs">
          <code className="bg-gray-100 px-2 py-1 rounded block truncate">
            {template.command} {template.args.join(' ')}
          </code>
        </div>

        {template.env && Object.keys(template.env).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.keys(template.env).map((key) => (
              <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {key}
              </span>
            ))}
          </div>
        )}
      </div>

      <button className="mt-3 w-full px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
        Use Template
      </button>
    </div>
  );
}
