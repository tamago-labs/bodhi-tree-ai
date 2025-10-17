'use client';

import { useAgent } from '@/contexts/AgentContext';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Pause,
  Play,
  BarChart3,
  DollarSign,
  Zap,
  Bot,
  Target,
  Wallet
} from 'lucide-react';

export default function DashboardPage() {
  const { agent, updateAgentStatus, vaultData } = useAgent();

  const handleToggleAgent = () => {
    if (agent) {
      const newStatus = agent.status === 'running' ? 'stopped' : 'running';
      updateAgentStatus(newStatus);
    }
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and manage your AI agent</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${vaultData.currentValue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">+{vaultData.totalProfitPercentage.toFixed(1)}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current APY</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{agent.performance.currentAPY}%</p>
              <p className="text-xs text-gray-500 mt-1">Strategy: {agent.config.strategy}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${agent.performance.totalProfit.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{agent.performance.totalTransactions} transactions</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{agent.performance.successRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Avg {agent.performance.avgResponseTime}s response</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agent Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Current agent status and quick controls</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'running' ? 'bg-green-100 text-green-700' :
                  agent.status === 'stopped' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'running' ? 'bg-green-500' :
                    agent.status === 'stopped' ? 'bg-gray-500' :
                    'bg-red-500'
                  }`}></div>
                  {agent.status}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-1 capitalize">{agent.config.strategy} Strategy</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Success Rate</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    {agent.performance.successRate}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-blue-500" />
                    {agent.performance.totalTransactions}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Response</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-orange-500" />
                    {agent.performance.avgResponseTime}s
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Activity</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {agent.lastActivity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Risk Level:</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  agent.config.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                  agent.config.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {agent.config.riskLevel.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">Max Leverage: {agent.config.maxLeverage}x</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAgent}
                className={`p-2 rounded-lg transition-colors ${
                  agent.status === 'running' 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {agent.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900">AI Automation</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">AI automatically optimizes fund allocation across protocols for maximum yield</p>
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            View Activity →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Risk Management</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Monitor protocol risks and auto-exit before exploits with AI-powered detection</p>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Check Alerts →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">System Health</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">All systems operational with 99.9% uptime and optimal performance</p>
          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
            View Status →
          </button>
        </div>
      </div>
    </div>
  );
}
