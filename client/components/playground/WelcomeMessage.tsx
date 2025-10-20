'use client';

import { Sparkles, Database, TrendingUp, Shield } from 'lucide-react';

interface WelcomeMessageProps {
  onStartChat: (message: string) => void;
}

export function WelcomeMessage({ onStartChat }: WelcomeMessageProps) {
  const suggestedPrompts = [
    {
      icon: <Database className="w-5 h-5" />,
      title: "Get Token Data",
      prompt: "What is the current price of ETH and what are the recent trends?"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "DeFi Analytics",
      prompt: "Show me the total value locked (TVL) in major DeFi protocols"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Security Analysis",
      prompt: "Analyze the security of this smart contract address: 0x..."
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Market Overview",
      prompt: "Give me a comprehensive overview of the current crypto market"
    }
  ];

  const handlePromptClick = (prompt: string) => {
    onStartChat(prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
      {/* Logo and Title */}
      <div className="mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Playground
        </h1>
        <p className="text-lg text-gray-600 max-w-md">
          Chat with AI using Web3 data
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-left">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Real-time Data</h3>
          <p className="text-sm text-gray-600">
            Access live blockchain data and market information through MCP servers
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-left">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">DeFi Analytics</h3>
          <p className="text-sm text-gray-600">
            Analyze DeFi protocols, yields, and market trends with AI assistance
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 text-left">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Smart Contract Analysis</h3>
          <p className="text-sm text-gray-600">
            Get insights and security analysis for smart contracts and addresses
          </p>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestedPrompts.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(suggestion.prompt)}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all text-left"
            >
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                {suggestion.icon}
              </div>
              <span className="text-sm text-gray-700">{suggestion.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="mt-12 p-4 bg-gray-50 rounded-lg max-w-2xl">
        <p className="text-sm text-gray-600">
          Click settings above to configure MCP servers, then start chatting
        </p>
      </div>
    </div>
  );
}
