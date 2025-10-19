'use client';

import { useState, useEffect } from 'react';

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

export function useAgentStatus() {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentStatus = async () => {
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
  };

  useEffect(() => {
    fetchAgentStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    agent,
    loading,
    error,
    fetchAgentStatus
  };
}
