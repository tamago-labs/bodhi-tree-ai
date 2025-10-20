export type AgentStatus = 'running' | 'stopped' | 'error';
export type RiskLevel = 'low' | 'medium' | 'high';
export type StrategyType = 'conservative' | 'balanced' | 'aggressive';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  lastActivity: string;
  performance: {
    successRate: number;
    totalTransactions: number;
    avgResponseTime: number;
    totalProfit: number;
    currentAPY: number;
  };
  config: AgentConfig;
}

export interface AgentConfig {
  strategy: StrategyType;
  riskLevel: RiskLevel;
  maxLeverage: number;
  protocols: string[];
  strategyParams: StrategyParams;
  riskManagement: RiskManagement;
  fees: FeeStructure;
}

export interface StrategyParams {
  conservative?: {
    stakingAllocation: number;
    lendingAllocation: number;
    targetAPY: number;
  };
  balanced?: {
    dexAllocation: number;
    lendingAllocation: number;
    targetAPY: number;
    rebalanceThreshold: number;
  };
  aggressive?: {
    mevEnabled: boolean;
    flashloanEnabled: boolean;
    targetAPY: number;
    minProfitThreshold: number;
  };
}

export interface RiskManagement {
  stopLossEnabled: boolean;
  stopLossPercentage: number;
  emergencyStopEnabled: boolean;
  slippageTolerance: number;
  maxDrawdown: number;
}

export interface FeeStructure {
  performanceFee: number;
  managementFee: number;
  highWaterMark: boolean;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'swap' | 'leverage' | 'deleverage' | 'yield';
  status: 'pending' | 'completed' | 'failed';
  protocol: string;
  amount: number;
  asset: string;
  timestamp: string;
  hash?: string;
  profit?: number;
  gasUsed?: number;
}

export interface VaultData {
  totalDeposited: number;
  currentValue: number;
  availableBalance: number;
  allocations: ProtocolAllocation[];
  totalProfit: number;
  totalProfitPercentage: number;
}

export interface ProtocolAllocation {
  protocol: string;
  amount: number;
  percentage: number;
  apy: number;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  status: string;
  autoStart: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAgent {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
  status: 'pending' | 'success' | 'error';
  startTime: number;
  result?: any;
  error?: string;
}

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_progress' | 'tool_complete' | 'tool_error';
  content: string;
  toolCall?: ToolCall;
}
