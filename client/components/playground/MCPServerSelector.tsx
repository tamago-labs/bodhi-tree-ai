'use client';

import { useState, useEffect } from 'react';
import { Settings, Check, X, Loader2, RefreshCw, Database, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { Conversation, MCPServer } from '@/types/playground';
import { PlaygroundAPI } from '@/lib/playground-api';

interface MCPServerSelectorProps {
  conversation: Conversation | null;
  onSettingsChange: (settings: any) => void;
}

export function MCPServerSelector({ conversation, onSettingsChange }: MCPServerSelectorProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<Record<string, any[]>>({});
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServers = async () => {
    try {
      setError(null);
      const serverList = await PlaygroundAPI.getMCPServers();
      setServers(serverList);
      
      // Load all tools and organize by server
      try {
        const allTools = await PlaygroundAPI.getMCPServerTools();
        const toolsData: Record<string, any[]> = {};
        
        // Organize tools by server
        Object.entries(allTools).forEach(([serverName, serverTools]) => {
          if (Array.isArray(serverTools)) {
            toolsData[serverName] = serverTools;
          }
        });
        
        setTools(toolsData);
      } catch (err) {
        console.warn('Failed to load MCP tools:', err);
        setTools({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP servers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleServerExpansion = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName]
    }));
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadServers();
  };

  const handleToggleServer = (serverName: string) => {
    if (!conversation) return;

    const currentEnabled = conversation.mcpSettings.enabledServers;
    const newEnabled = currentEnabled.includes(serverName)
      ? currentEnabled.filter(name => name !== serverName)
      : [...currentEnabled, serverName];

    onSettingsChange({ enabledServers: newEnabled });
  };

  const handleEnableAllConnected = () => {
    if (!conversation) return;

    const connectedServers = servers
      .filter(server => server.status === 'connected')
      .map(server => server.name);

    onSettingsChange({ enabledServers: connectedServers });
  };

  const handleModelChange = (model: string) => {
    if (!conversation) return;
    onSettingsChange({ selectedModel: model });
  };

  const availableModels = [
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Most capable model for complex tasks' },
    { id: 'claude-haiku', name: 'Claude Haiku', description: 'Fast and efficient for simple tasks' }
  ];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-600 mr-2" />
          <span className="text-gray-600">Loading MCP servers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">MCP Server Configuration</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh servers"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* AI Model Badge */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">AI Model</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
            Claude 4
          </span>
          <span className="text-xs text-gray-600">Most capable</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <X className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Server List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Available Servers ({servers.length})
          </label>
          <div className="flex items-center gap-2">
            {servers.filter(s => s.status === 'connected').length > 0 && (
              <button
                onClick={handleEnableAllConnected}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Enable All Connected
              </button>
            )}
            <span className="text-xs text-gray-500">
              {conversation?.mcpSettings.enabledServers.length || 0} enabled
            </span>
          </div>
        </div>

        {/* No servers enabled message */}
        {conversation && conversation.mcpSettings.enabledServers.length === 0 && servers.filter(s => s.status === 'connected').length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Settings className="w-4 h-4" />
              <span className="text-sm">
                No MCP servers enabled. Enable servers to access Web3 data and tools.
              </span>
            </div>
          </div>
        )}

        {servers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No MCP servers available</p>
            <p className="text-xs mt-1">Check your server configuration</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {servers.map((server) => {
              const isEnabled = conversation?.mcpSettings.enabledServers.includes(server.name) || false;
              const isDefault = PlaygroundAPI.isDefaultServer(server.name);
              
              return (
                <div
                  key={server.name}
                  className={`p-3 border rounded-lg transition-all ${
                    isEnabled 
                      ? 'border-orange-200 bg-orange-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {server.name}
                        </h4>
                        {isDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {server.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            server.status === 'connected' ? 'bg-green-500' :
                            server.status === 'error' ? 'bg-red-500' :
                            'bg-gray-400'
                          }`} />
                          {server.status}
                        </div>
                        {/* <div>
                          {server.tools} tools
                        </div> */}
                        {server.lastSeen && (
                          <div>
                            Last seen: {new Date(server.lastSeen).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      {server.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          Error: {server.error}
                        </div>
                      )}

                      {/* Tools Display */}
                      {server.status === 'connected' && tools[server.name] && tools[server.name].length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleServerExpansion(server.name)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Wrench className="w-3 h-3" />
                            {expandedServers[server.name] ? 'Hide' : 'Show'} {tools[server.name].length} tools
                            {expandedServers[server.name] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                          
                          {expandedServers[server.name] && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="space-y-1">
                                {tools[server.name].map((tool: any, index: number) => (
                                  <div key={index} className="text-xs">
                                    <div className="font-medium text-gray-700">
                                      {tool.name || `Tool ${index + 1}`}
                                    </div>
                                    {tool.description && (
                                      <div className="text-gray-500 ml-2">
                                        {tool.description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleServer(server.name)}
                      disabled={server.status !== 'connected'}
                      className={`ml-3 p-2 rounded-lg transition-colors ${
                        server.status !== 'connected'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isEnabled
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={server.status !== 'connected' ? 'Server not connected' : (isEnabled ? 'Disable server' : 'Enable server')}
                    >
                      {isEnabled ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
    </div>
  );
}
