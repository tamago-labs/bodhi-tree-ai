'use client';

import { useAgent } from '@/contexts/AgentContext';
import { MessageCircle, Server, Bot } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { agent } = useAgent();

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Bot className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Bodhi Tree AI
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Your autonomous DeFi agent is ready to help you navigate the world of decentralized finance.
          Start chatting or configure your MCP servers to get started.
        </p>
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700 mb-8">
          <div className={`w-2 h-2 rounded-full ${
            agent.status === 'running' ? 'bg-green-500' : 'bg-gray-500'
          }`}></div>
          Agent is {agent.status}
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link
          href="/playground"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all hover:border-orange-200"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
              <MessageCircle className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Chatting</h3>
            <p className="text-gray-600 mb-4">
              Interact with your AI agent to get insights, analyze data, and make informed decisions.
            </p>
            <div className="text-orange-600 font-medium group-hover:text-orange-700 transition-colors">
              Open Playground →
            </div>
          </div>
        </Link>

        <Link
          href="/agent/mcp"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all hover:border-blue-200"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Server className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Configure MCP</h3>
            <p className="text-gray-600 mb-4">
              Set up and manage your MCP servers to connect with Web3 data sources and tools.
            </p>
            <div className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
              Manage Servers →
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Info */}
      {/* <div className="bg-gray-50 rounded-xl p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Strategy</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{agent.config.strategy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Risk Level</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{agent.config.riskLevel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Last Activity</p>
            <p className="text-sm font-medium text-gray-900">{agent.lastActivity}</p>
          </div>
        </div>
      </div> */}
    </div>
  );
}
