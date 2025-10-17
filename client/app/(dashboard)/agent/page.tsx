'use client';

import { useState } from 'react';
import { useAgent } from '@/contexts/AgentContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';

export default function AgentPage() {
  const { agent, updateAgentStatus } = useAgent();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleAgent = async () => {
    if (!agent) return;
    
    setIsUpdating(true);
    const newStatus = agent.status === 'running' ? 'stopped' : 'running';
    updateAgentStatus(newStatus);
    
    setTimeout(() => {
      setIsUpdating(false);
    }, 1000);
  };

  const handleRestart = async () => {
    if (!agent) return;
    
    setIsUpdating(true);
    updateAgentStatus('stopped');
    
    setTimeout(() => {
      updateAgentStatus('running');
      setIsUpdating(false);
    }, 2000);
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const getStrategyDetails = () => {
    switch (agent.config.strategy) {
      case 'conservative':
        return {
          name: 'Conservative Strategy',
          description: 'Low risk with KAIA staking and Avalon Finance lending',
          targetAPY: '5-8%',
          color: 'green'
        };
      case 'balanced':
        return {
          name: 'Balanced Strategy',
          description: 'Moderate risk with DEX yield farming and lending protocols',
          targetAPY: '10-20%',
          color: 'yellow'
        };
      case 'aggressive':
        return {
          name: 'Aggressive Strategy',
          description: 'High risk with MEV strategies and flashloan arbitrage',
          targetAPY: '30%+',
          color: 'red'
        };
    }
  };

  const strategyDetails = getStrategyDetails();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Overview</h1>
          <p className="text-gray-600 mt-2">Monitor and control your AI agent</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestart}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
          <button
            onClick={handleToggleAgent}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              agent.status === 'running' 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {agent.status === 'running' ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Agent
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Agent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              agent.status === 'running' ? 'bg-green-500' :
              agent.status === 'stopped' ? 'bg-gray-400' :
              'bg-red-500'
            }`}></div>
            <h2 className="text-xl font-semibold text-gray-900">{agent.name}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              agent.status === 'running' ? 'bg-green-100 text-green-700' :
              agent.status === 'stopped' ? 'bg-gray-100 text-gray-700' :
              'bg-red-100 text-red-700'
            }`}>
              {agent.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Last activity: {agent.lastActivity}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-gray-900">{agent.performance.successRate}%</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{agent.performance.totalTransactions.toLocaleString()}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
            <p className="text-2xl font-bold text-gray-900">{agent.performance.avgResponseTime}s</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Current APY</p>
            <p className="text-2xl font-bold text-gray-900">{agent.performance.currentAPY}%</p>
          </div>
        </div>
      </div>

      {/* Strategy Card */}
      <div className={`bg-${strategyDetails.color}-50 border border-${strategyDetails.color}-200 rounded-xl p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`text-lg font-semibold text-${strategyDetails.color}-900 mb-2`}>
              {strategyDetails.name}
            </h3>
            <p className={`text-sm text-${strategyDetails.color}-700 mb-4`}>
              {strategyDetails.description}
            </p>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-gray-600">Target APY:</span>
                <span className="ml-2 font-medium">{strategyDetails.targetAPY}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Risk Level:</span>
                <span className="ml-2 font-medium capitalize">{agent.config.riskLevel}</span>
              </div>
              <div>
                <span className="text-xs text-gray-600">Max Leverage:</span>
                <span className="ml-2 font-medium">{agent.config.maxLeverage}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Success Rate</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{agent.performance.successRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Total Transactions</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{agent.performance.totalTransactions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">Avg Response Time</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{agent.performance.avgResponseTime}s</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">Total Profit</span>
              </div>
              <span className="text-sm font-medium text-green-600">${agent.performance.totalProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stop Loss</span>
              <span className={`text-sm font-medium ${agent.config.riskManagement.stopLossEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {agent.config.riskManagement.stopLossEnabled ? `Enabled (${agent.config.riskManagement.stopLossPercentage}%)` : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Emergency Stop</span>
              <span className={`text-sm font-medium ${agent.config.riskManagement.emergencyStopEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {agent.config.riskManagement.emergencyStopEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slippage Tolerance</span>
              <span className="text-sm font-medium text-gray-900">{agent.config.riskManagement.slippageTolerance}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Max Drawdown</span>
              <span className="text-sm font-medium text-gray-900">{agent.config.riskManagement.maxDrawdown}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Protocols */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Protocols</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agent.config.protocols.map((protocol, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-900">{protocol}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">All Systems Operational</p>
              <p className="text-xs text-green-700">99.9% uptime</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">High Performance</p>
              <p className="text-xs text-blue-700">Optimal response times</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-900">No Alerts</p>
              <p className="text-xs text-orange-700">System running smoothly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
