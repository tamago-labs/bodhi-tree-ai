'use client';

import React, { useState } from 'react';
import { BaseModal, ModalHeader, ModalBody, ModalFooter } from './BaseModal';
import { Shield, TrendingUp, Zap, CheckCircle, Plus } from 'lucide-react';

interface StrategyTemplate {
  type: string;
  name: string;
  description: string;
  config: any;
  riskLevel: string;
  estimatedAPY: string;
}

interface StrategyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: StrategyTemplate[];
  onSelectTemplate: (template: StrategyTemplate, customName: string) => Promise<void>;
  loading?: boolean;
}

export function StrategyTemplateModal({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  loading = false
}: StrategyTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [customName, setCustomName] = useState('');

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Shield className="w-5 h-5 text-green-600" />;
      case 'medium':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'high':
        return <Zap className="w-5 h-5 text-red-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSelectTemplate = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setCustomName(`My ${template.name}`);
  };

  const handleCreateStrategy = async () => {
    if (!selectedTemplate || !customName.trim()) return;
    
    await onSelectTemplate(selectedTemplate, customName.trim());
    setSelectedTemplate(null);
    setCustomName('');
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedTemplate(null);
      setCustomName('');
      onOpenChange(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleClose}
      title="Create New Strategy"
      description="Choose a template to create your trading strategy"
      size="xl"
      preventClose={loading}
    >
      <ModalBody>
        {!selectedTemplate ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <div
                key={template.type}
                onClick={() => index === 0 && handleSelectTemplate(template)}
                className={`border-2 rounded-xl p-6 transition-all group ${
                  index === 0 
                    ? 'border-gray-200 bg-gray-50 hover:shadow-md hover:border-orange-300 cursor-pointer' 
                    : 'border-gray-100 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getRiskIcon(template.riskLevel)}
                    <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {template.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(template.riskLevel)}`}>
                    {template.riskLevel.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-600">Est. APY:</span>
                  <span className="font-semibold text-gray-900">{template.estimatedAPY}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {index === 0 ? (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Click to customize</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Coming soon</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                {getRiskIcon(selectedTemplate.riskLevel)}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border mt-1 ${getRiskColor(selectedTemplate.riskLevel)}`}>
                    {selectedTemplate.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-4">{selectedTemplate.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <span className="text-gray-600">Est. APY:</span>
                  <span className="font-semibold text-gray-900 ml-2">{selectedTemplate.estimatedAPY}</span>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold text-gray-900 ml-2 capitalize">{selectedTemplate.type}</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="strategy-name" className="block text-sm font-medium text-gray-700 mb-2">
                Strategy Name
              </label>
              <input
                id="strategy-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter a name for your strategy"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Configuration Preview</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(selectedTemplate.config).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="bg-white rounded p-2">
                    <span className="text-gray-600 capitalize text-xs">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>
                    <span className="font-medium text-gray-900 ml-1">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {!selectedTemplate ? (
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setCustomName('');
              }}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Back to Templates
            </button>
            <button
              onClick={handleCreateStrategy}
              disabled={loading || !customName.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Create Strategy
            </button>
          </>
        )}
      </ModalFooter>
    </BaseModal>
  );
}
