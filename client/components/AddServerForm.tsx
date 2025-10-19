import { useState } from 'react';

interface AddServerFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function AddServerForm({ onSubmit, onCancel }: AddServerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    command: 'npx',
    args: '',
    env: '',
    autoStart: true,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse environment variables
    const envObj: Record<string, string> = {};
    if (formData.env) {
      formData.env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          envObj[key.trim()] = value.trim();
        }
      });
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Add MCP Server</h2>
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
            Environment Variables (one per line, KEY=value)
          </label>
          <textarea
            value={formData.env}
            onChange={(e) => setFormData({ ...formData, env: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
            placeholder="API_KEY=your-key&#10;NETWORK=mainnet"
          />
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
