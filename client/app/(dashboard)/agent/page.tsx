'use client';

import { useState, useEffect } from 'react';
import { 
  Activity,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  CheckCircle,
  Target,
  AlertCircle
} from 'lucide-react';

interface AgentData {
  id: string;
  name: string;
  status: string;
  version: string;
  strategy: {
    id?: string;
    name: string;
    type: string;
    description: string;
    config: any;
    isActive?: boolean;
  };
  performance: {
    uptime: number;
    lastActivity: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AgentOverviewPage() {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAgentStatus() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_API_URL}/agent`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agent status');
      }

      const data = await response.json();
      setAgent(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Agent</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return <div>No agent data</div>;
  }

  const getStrategyColor = (type: string) => {
    switch (type) {
      case 'conservative':
        return 'green';
      case 'balanced':
        return 'yellow';
      case 'aggressive':
        return 'red';
      default:
        return 'blue';
    }
  };

  const strategyColor = getStrategyColor(agent.strategy.type);
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Overview</h1>
        <p className="text-gray-600 mt-1">Monitor your AI agent performance and status</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              agent.status === 'running' ? 'bg-green-500 animate-pulse' :
              agent.status === 'stopped' ? 'bg-gray-400' :
              'bg-red-500'
            }`}></div>
            <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              agent.status === 'running' ? 'bg-green-100 text-green-700' :
              agent.status === 'stopped' ? 'bg-gray-100 text-gray-700' :
              'bg-red-100 text-red-700'
            }`}>
              {agent.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            v{agent.version}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{agent.status}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Uptime</p>
            <p className="text-lg font-semibold text-gray-900">{formatUptime(agent.performance.uptime)}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Last Activity</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(agent.performance.lastActivity).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Active Strategy Card */}
      <div className={`bg-${strategyColor}-50 border border-${strategyColor}-200 rounded-xl p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className={`w-5 h-5 text-${strategyColor}-600`} />
              <h3 className={`text-lg font-semibold text-${strategyColor}-900`}>
                Active Strategy: {agent.strategy.name}
              </h3>
            </div>
            <p className={`text-sm text-${strategyColor}-700 mb-4`}>
              {agent.strategy.description}
            </p>
            
            {/* Strategy Config Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {agent.strategy.config.targetAPY && (
                <div>
                  <span className="text-xs text-gray-600">Target APY:</span>
                  <span className="ml-2 font-medium">{agent.strategy.config.targetAPY}%</span>
                </div>
              )}
              {agent.strategy.config.loopSteps && (
                <div>
                  <span className="text-xs text-gray-600">Loop Steps:</span>
                  <span className="ml-2 font-medium">{agent.strategy.config.loopSteps}</span>
                </div>
              )}
              {agent.strategy.config.stakingProtocol && (
                <div>
                  <span className="text-xs text-gray-600">Staking:</span>
                  <span className="ml-2 font-medium">{agent.strategy.config.stakingProtocol}</span>
                </div>
              )}
              {agent.strategy.config.lendingProtocol && (
                <div>
                  <span className="text-xs text-gray-600">Lending:</span>
                  <span className="ml-2 font-medium">{agent.strategy.config.lendingProtocol}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Details Grid */}
      {agent.strategy.config && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategy Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(agent.strategy.config).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Agent ID:</span>
              <span className="text-sm font-mono text-gray-900">{agent.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Version:</span>
              <span className="text-sm font-medium text-gray-900">{agent.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="text-sm text-gray-900">
                {new Date(agent.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Updated:</span>
              <span className="text-sm text-gray-900">
                {new Date(agent.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/agent/config"
              className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Target className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">Change Strategy</p>
                <p className="text-xs text-orange-700">Configure agent strategy</p>
              </div>
            </a>
            <a
              href="/agent/mcp"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Manage MCP Servers</p>
                <p className="text-xs text-blue-700">Add or remove MCP tools</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
