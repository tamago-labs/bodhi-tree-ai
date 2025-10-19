'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { MCPTemplate } from '@/lib/mcp-templates';

interface AddServerFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  template?: MCPTemplate;
}

export function AddServerForm({ onSubmit, onCancel, template }: AddServerFormProps) {
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
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
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
    onSubmit({
      name: formData.name,
      command: formData.command,
      args: formData.args.split(' ').filter(a => a),
      env: envObj,
      autoStart: formData.autoStart,
      description: formData.description
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {template ? `Add ${template.name}` : 'Add MCP Server'}
        </h2>
        {template && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
            From Template
          </span>
        )}
      </div>

      {template && template.requiresApiKey && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">API Keys Required</p>
              <p className="text-xs text-amber-700">
                This template requires API keys. Please fill in the environment variables below.
              </p>
              {template.envHints && (
                <ul className="mt-2 space-y-1">
                  {Object.entries(template.envHints).map(([key, hint]) => (
                    <li key={key} className="text-xs text-amber-700">
                      • <strong>{key}:</strong> {hint}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., Blockchain Tools"
          />
        </div>

        {/* Command & Args */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Command *
            </label>
            <input
              type="text"
              required
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="npx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arguments *
            </label>
            <input
              type="text"
              required
              value={formData.args}
              onChange={(e) => setFormData({ ...formData, args: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="-y @modelcontextprotocol/server-blockchain"
            />
          </div>
        </div>

        {/* Environment Variables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Environment Variables {template?.requiresApiKey && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={formData.env}
            onChange={(e) => setFormData({ ...formData, env: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
            rows={5}
            placeholder="KEY=value&#10;API_KEY=your-key-here&#10;NETWORK=mainnet"
          />
          <p className="text-xs text-gray-500 mt-1">One per line, format: KEY=value</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            placeholder="What does this MCP server do?"
          />
        </div>

        {/* Auto-start Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoStart"
            checked={formData.autoStart}
            onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
          <label htmlFor="autoStart" className="text-sm font-medium text-gray-700">
            Auto-start server (Railway will spawn automatically)
          </label>
        </div>

        {/* Info Box */}
        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-blue-900">
                Railway will sync this config within 5 minutes. If autoStart is enabled, 
                the MCP server will be spawned automatically.
              </p>
            </div>
          </div>
        </div> */}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Add Server
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
