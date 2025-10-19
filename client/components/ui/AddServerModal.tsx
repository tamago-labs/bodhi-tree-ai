'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { BaseModal, ModalHeader, ModalBody, ModalFooter } from './BaseModal';
import { MCPTemplate } from '@/lib/mcp-templates';

interface AddServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  template?: MCPTemplate;
  loading?: boolean;
}

export function AddServerModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  template, 
  loading = false 
}: AddServerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    command: 'npx',
    args: '',
    env: '',
    autoStart: true,
    description: ''
  });

  // Pre-fill form if template is provided
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        command: template.command,
        args: template.args.join(' '),
        env: template.env ? Object.entries(template.env).map(([k, v]) => `${k}=${v}`).join('\n') : '',
        autoStart: true,
        description: template.description
      });
    } else {
      // Reset form for custom server
      setFormData({
        name: '',
        command: 'npx',
        args: '',
        env: '',
        autoStart: true,
        description: ''
      });
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse environment variables
    const envObj: Record<string, string> = {};
    if (formData.env) {
      formData.env.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envObj[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    // Validate required env vars if using template
    if (template && template.requiresApiKey && template.env) {
      const missingKeys = Object.keys(template.env).filter(key => !envObj[key] || envObj[key] === '');
      if (missingKeys.length > 0) {
        alert(`Missing required environment variables: ${missingKeys.join(', ')}`);
        return;
      }
    }

    // Submit
    await onSubmit({
      name: formData.name,
      command: formData.command,
      args: formData.args.split(' ').filter(a => a),
      env: envObj,
      autoStart: formData.autoStart,
      description: formData.description
    });
    
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={handleClose}
      title={template ? `Add ${template.name}` : 'Add Custom MCP Server'}
      description={template ? template.description : 'Configure a custom MCP server'}
      size="xl"
      preventClose={loading}
    >
      <ModalBody>
        {template && template.requiresApiKey && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-2">API Keys Required</p>
                <p className="text-sm text-amber-700 mb-3">
                  This template requires API keys. Please fill in the environment variables below.
                </p>
                {template.envHints && (
                  <div className="space-y-2">
                    {Object.entries(template.envHints).map(([key, hint]) => (
                      <div key={key} className="text-sm text-amber-700">
                        <span className="font-medium">{key}:</span> {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Server Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="e.g., Blockchain Tools"
              disabled={loading}
            />
          </div>

          {/* Command & Args */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Command *
              </label>
              <input
                type="text"
                required
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="npx"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arguments *
              </label>
              <input
                type="text"
                required
                value={formData.args}
                onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="-y @modelcontextprotocol/server-blockchain"
                disabled={loading}
              />
            </div>
          </div>

          {/* Environment Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment Variables {template?.requiresApiKey && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={formData.env}
              onChange={(e) => setFormData({ ...formData, env: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              rows={5}
              placeholder="NETWORK=mainnet"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">One per line, format: KEY=value</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
              placeholder="What does this MCP server do?"
              disabled={loading}
            />
          </div>

          {/* Auto-start Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoStart"
              checked={formData.autoStart}
              onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              disabled={loading}
            />
            <label htmlFor="autoStart" className="text-sm font-medium text-gray-700">
              Auto-start server
            </label>
          </div>

          <br/>

          {/* Info Box */}
          {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900">
                  Railway will sync this config within 5 minutes. If autoStart is enabled, 
                  the MCP server will be spawned automatically.
                </p>
              </div>
            </div>
          </div> */}
        </form>
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Add Server
        </button>
      </ModalFooter>
    </BaseModal>
  );
}
