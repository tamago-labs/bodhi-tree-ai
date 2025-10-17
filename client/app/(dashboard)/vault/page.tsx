'use client';

import { useAgent } from '@/contexts/AgentContext';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft,
  PieChart,
  DollarSign
} from 'lucide-react';

export default function VaultPage() {
  const { vaultData, agent } = useAgent();

  if (!vaultData || !agent) {
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
        <h1 className="text-3xl font-bold text-gray-900">Vault & Portfolio</h1>
        <p className="text-gray-600 mt-2">Manage your deposits and track fund allocation</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deposited</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${vaultData.totalDeposited.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${vaultData.currentValue.toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                +{vaultData.totalProfitPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ${vaultData.totalProfit.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${vaultData.availableBalance.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Deposit Funds</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Add USDT or KAIA to your vault to start earning yield
          </p>
          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Deposit
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900">Withdraw Funds</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Withdraw your funds from the vault at any time
          </p>
          <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            Withdraw
          </button>
        </div>
      </div>

      {/* Protocol Allocations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Protocol Allocations</h2>
          <p className="text-sm text-gray-600 mt-1">Current distribution of funds across protocols</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {vaultData.allocations.map((allocation, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{allocation.protocol}</h3>
                  <span className="text-sm font-medium text-green-600">{allocation.apy}% APY</span>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${allocation.amount.toLocaleString()}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${allocation.percentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{allocation.percentage}% of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vault Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">ERC-4626 Vault Standard</h3>
        <p className="text-sm text-blue-700">
          Your funds are managed through an ERC-4626 compliant vault, ensuring standardized and secure asset management. 
          The AI automatically allocates and rebalances your funds across protocols to optimize yield based on your selected strategy.
        </p>
      </div>
    </div>
  );
}
