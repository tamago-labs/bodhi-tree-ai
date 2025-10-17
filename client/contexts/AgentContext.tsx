'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Agent, Transaction, VaultData } from '@/types';
import { mockAgent, mockTransactions, mockVaultData } from '@/lib/mockData';

interface AgentContextType {
  agent: Agent | null;
  transactions: Transaction[];
  vaultData: VaultData;
  updateAgentStatus: (status: Agent['status']) => void;
  updateAgentConfig: (config: Partial<Agent['config']>) => void;
  addTransaction: (transaction: Transaction) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(mockAgent);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [vaultData] = useState<VaultData>(mockVaultData);

  const updateAgentStatus = (status: Agent['status']) => {
    if (agent) {
      setAgent({ ...agent, status, lastActivity: 'Just now' });
    }
  };

  const updateAgentConfig = (config: Partial<Agent['config']>) => {
    if (agent) {
      setAgent({ 
        ...agent, 
        config: { ...agent.config, ...config },
        lastActivity: 'Just now'
      });
    }
  };

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  return (
    <AgentContext.Provider value={{
      agent,
      transactions,
      vaultData,
      updateAgentStatus,
      updateAgentConfig,
      addTransaction
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}
