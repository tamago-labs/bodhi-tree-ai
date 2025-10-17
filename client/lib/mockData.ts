import { Agent, Transaction, VaultData } from '@/types';

export const mockAgent: Agent = {
  id: '1',
  name: 'Bodhi Tree Agent',
  status: 'running',
  lastActivity: '2 minutes ago',
  performance: {
    successRate: 94.5,
    totalTransactions: 1247,
    avgResponseTime: 1.2,
    totalProfit: 12450.50,
    currentAPY: 15.8
  },
  config: {
    strategy: 'balanced',
    riskLevel: 'medium',
    maxLeverage: 3.0,
    protocols: ['Aave', 'Compound', 'Uniswap', 'KommuneFi'],
    strategyParams: {
      balanced: {
        dexAllocation: 60,
        lendingAllocation: 40,
        targetAPY: 15,
        rebalanceThreshold: 5
      }
    },
    riskManagement: {
      stopLossEnabled: true,
      stopLossPercentage: 10,
      emergencyStopEnabled: true,
      slippageTolerance: 0.5,
      maxDrawdown: 15
    },
    fees: {
      performanceFee: 15,
      managementFee: 1.5,
      highWaterMark: true
    }
  }
};

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'yield',
    status: 'completed',
    protocol: 'Aave',
    amount: 5000,
    asset: 'USDT',
    timestamp: '2025-10-17T10:30:00Z',
    hash: '0x1234...5678',
    profit: 125.50,
    gasUsed: 0.05
  },
  {
    id: 'tx-2',
    type: 'swap',
    status: 'completed',
    protocol: 'Uniswap',
    amount: 2000,
    asset: 'KAIA',
    timestamp: '2025-10-17T09:15:00Z',
    hash: '0xabcd...efgh',
    profit: 45.20,
    gasUsed: 0.03
  },
  {
    id: 'tx-3',
    type: 'leverage',
    status: 'completed',
    protocol: 'Compound',
    amount: 3000,
    asset: 'USDT',
    timestamp: '2025-10-17T08:45:00Z',
    hash: '0x9876...4321',
    profit: 89.75,
    gasUsed: 0.04
  },
  {
    id: 'tx-4',
    type: 'deposit',
    status: 'completed',
    protocol: 'KommuneFi',
    amount: 10000,
    asset: 'USDT',
    timestamp: '2025-10-17T07:20:00Z',
    hash: '0xfedc...ba98',
    gasUsed: 0.02
  },
  {
    id: 'tx-5',
    type: 'yield',
    status: 'completed',
    protocol: 'Avalon Finance',
    amount: 4500,
    asset: 'KAIA',
    timestamp: '2025-10-16T22:10:00Z',
    hash: '0x1111...2222',
    profit: 78.90,
    gasUsed: 0.03
  },
  {
    id: 'tx-6',
    type: 'deleverage',
    status: 'completed',
    protocol: 'Aave',
    amount: 1500,
    asset: 'USDT',
    timestamp: '2025-10-16T18:30:00Z',
    hash: '0x3333...4444',
    profit: 34.25,
    gasUsed: 0.04
  },
  {
    id: 'tx-7',
    type: 'swap',
    status: 'pending',
    protocol: 'DragonSwap',
    amount: 2500,
    asset: 'KAIA',
    timestamp: '2025-10-16T15:45:00Z',
    gasUsed: 0.03
  },
  {
    id: 'tx-8',
    type: 'yield',
    status: 'failed',
    protocol: 'Compound',
    amount: 3200,
    asset: 'USDT',
    timestamp: '2025-10-16T12:20:00Z',
    hash: '0x5555...6666',
    gasUsed: 0.02
  }
];

export const mockVaultData: VaultData = {
  totalDeposited: 50000,
  currentValue: 62450.50,
  availableBalance: 8450.50,
  totalProfit: 12450.50,
  totalProfitPercentage: 24.9,
  allocations: [
    {
      protocol: 'Aave',
      amount: 18000,
      percentage: 36,
      apy: 8.5
    },
    {
      protocol: 'KommuneFi',
      amount: 15000,
      percentage: 30,
      apy: 22.3
    },
    {
      protocol: 'Uniswap',
      amount: 12000,
      percentage: 24,
      apy: 18.7
    },
    {
      protocol: 'Compound',
      amount: 5000,
      percentage: 10,
      apy: 12.1
    }
  ]
};
