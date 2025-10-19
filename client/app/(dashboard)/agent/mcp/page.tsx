'use client';

import { useState } from 'react';
import { Server, Plus, RefreshCw, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { MCPServerCard } from '@/components/MCPServerCard';
import { AddServerModal } from '@/components/ui/AddServerModal';
import { MCPTemplateModal } from '@/components/MCPTemplateModal';
import { ToggleAutoStartDialog, DeleteServerDialog } from '@/components/ui/MCPConfirmDialog';
import { useMCPServers } from '@/hooks/useMCPServers';
import { MCPTemplate } from '@/lib/mcp-templates';

export default function MCPServersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MCPTemplate | undefined>();
  
  // Confirmation dialog states
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { servers, loading, error, fetchServers, createServer, deleteServer, toggleAutoStart } = useMCPServers();

  const handleCreateServer = async (formData: any) => {
    const result = await createServer(formData);
    if (result.success) {
      setShowAddForm(false);
      setSelectedTemplate(undefined);
    } else {
      alert(result.error);
    }
  };

  const handleDeleteServer = (server: any) => {
    setSelectedServer(server);
    setDeleteDialogOpen(true);
  };

  const handleToggleAutoStart = (server: any) => {
    setSelectedServer(server);
    setToggleDialogOpen(true);
  };

  const confirmToggleAutoStart = async () => {
    if (!selectedServer) return;
    
    setActionLoading(true);
    try {
      const result = await toggleAutoStart(selectedServer);
      if (!result.success) {
        alert(result.error);
      } else {
        setToggleDialogOpen(false);
        setSelectedServer(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteServer = async () => {
    if (!selectedServer) return;
    
    setActionLoading(true);
    try {
      const result = await deleteServer(selectedServer.id);
      if (!result.success) {
        alert(result.error);
      } else {
        setDeleteDialogOpen(false);
        setSelectedServer(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectTemplate = (template: MCPTemplate) => {
    setSelectedTemplate(template);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setSelectedTemplate(undefined);
  };

  if (loading) {
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
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Use Template
          </button>
          <button
            onClick={() => {
              setSelectedTemplate(undefined);
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Custom
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

      {/* Add Server Modal */}
      <AddServerModal
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleCreateServer}
        template={selectedTemplate}
        loading={loading}
      />

      {/* Info Box */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium mb-1">How MCP Servers Work</p>
            <p className="text-sm text-blue-700">
              MCP servers are managed by Railway. When you add a server with autoStart=true, 
              Railway syncs every 5 minutes and automatically spawns it. You can also manually 
              refresh Railway by calling the refresh endpoint.
            </p>
          </div>
        </div>
      </div> */}

      {/* Stats */}
      {servers.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Servers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{servers.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Running</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {servers.filter(s => s.status === 'running').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Stopped</p>
            <p className="text-2xl font-bold text-gray-600 mt-1">
              {servers.filter(s => s.status === 'stopped').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Auto-Start</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {servers.filter(s => s.autoStart).length}
            </p>
          </div>
        </div>
      )}

      {/* Servers List */}
      {servers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No MCP Servers</h3>
          <p className="text-gray-600 mb-6">Get started by choosing a template or adding a custom server</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm"
            > 
              Browse Templates
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              Add Custom Server
            </button>
          </div>
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

      {/* Template Modal */}
      <MCPTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Confirmation Dialogs */}
      {selectedServer && (
        <>
          <ToggleAutoStartDialog
            open={toggleDialogOpen}
            onOpenChange={setToggleDialogOpen}
            serverName={selectedServer.name}
            currentAutoStart={selectedServer.autoStart}
            onConfirm={confirmToggleAutoStart}
            loading={actionLoading}
          />

          <DeleteServerDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            serverName={selectedServer.name}
            onConfirm={confirmDeleteServer}
            loading={actionLoading}
          />
        </>
      )}
    </div>
  );
}
