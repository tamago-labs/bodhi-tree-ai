import { Play, Pause, Trash2, CheckCircle, Circle, AlertCircle, Loader2, Code } from 'lucide-react';
import { MCPServer } from '@/types';

interface MCPServerCardProps {
  server: MCPServer;
  onToggleAutoStart: (server: MCPServer) => void;
  onDelete: (server: MCPServer) => void;
}

export function MCPServerCard({ server, onToggleAutoStart, onDelete }: MCPServerCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'stopped':
        return <Circle className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(server.status)}
            <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {server.status.toUpperCase()}
            </span>
            {server.autoStart && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                AUTO-START
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">{server.description}</p>

          {/* Command */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Code className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Command:</p>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded block">
                  {server.command} {server.args.join(' ')}
                </code>
              </div>
            </div>

            {/* Environment Variables */}
            {Object.keys(server.env).length > 0 && (
              <div className="flex items-start gap-2">
                <Code className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Environment:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(server.env).map(key => (
                      <span key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <span>Created: {new Date(server.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated: {new Date(server.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onToggleAutoStart(server)}
            className={`p-2 rounded-lg transition-colors ${
              server.autoStart
                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            title={server.autoStart ? 'Disable auto-start' : 'Enable auto-start'}
          >
            {server.autoStart ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(server)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete server"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
