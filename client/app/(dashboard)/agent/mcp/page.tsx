'use client';

import { useState } from 'react';
import { Server, Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { MCPServerCard } from '@/components/MCPServerCard';
import { AddServerForm } from '@/components/AddServerForm';
import { useMCPServers } from '@/hooks/useMCPServers';

export default function MCPServersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { servers, loading, error, fetchServers, createServer, deleteServer, toggleAutoStart } = useMCPServers();

  const handleCreateServer = async (formData: any) => {
    const result = await createServer(formData);
    if (result.success) {
      setShowAddForm(false);
    } else {
      alert(result.error);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Delete this MCP server? This cannot be undone.')) {
      return;
    }
    const result = await deleteServer(id);
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleToggleAutoStart = async (server: any) => {
    const result = await toggleAutoStart(server);
    if (!result.success) {
      alert(result.error);
    }
  };

  if (loading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
          <p className="text-gray-600 mt-1">Manage Model Context Protocol servers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchServers}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Add Server Form */}
      {showAddForm && (
        <AddServerForm
          onSubmit={handleCreateServer}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium mb-1">About MCP Servers</p>
            <p className="text-sm text-blue-700">
              MCP servers are managed by Railway. When you add a server here with autoStart=true, 
              Railway will automatically spawn it within 5 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Servers List */}
      {servers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No MCP Servers</h3>
          <p className="text-gray-600 mb-6">Add your first MCP server to get started</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Add Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {servers.map((server) => (
            <MCPServerCard
              key={server.id}
              server={server}
              onToggleAutoStart={handleToggleAutoStart}
              onDelete={handleDeleteServer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
