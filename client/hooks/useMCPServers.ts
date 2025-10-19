'use client';

import { useState, useEffect } from 'react';
import { MCPServer } from '@/types';

export function useMCPServers() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_AWS_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_AWS_API_KEY;

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/mcp/servers`, {
        headers: { 'X-Api-Key': apiKey! }
      });

      if (!response.ok) throw new Error('Failed to fetch MCP servers');

      const data = await response.json();
      setServers(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createServer = async (formData: any) => {
    try {
      const response = await fetch(`${apiUrl}/mcp/servers`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create MCP server');

      await fetchServers();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create server';
      return { success: false, error: errorMessage };
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/mcp/servers/${id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey! }
      });

      if (!response.ok) throw new Error('Failed to delete MCP server');

      await fetchServers();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete server';
      return { success: false, error: errorMessage };
    }
  };

  const toggleAutoStart = async (server: MCPServer) => {
    try {
      const response = await fetch(`${apiUrl}/mcp/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'X-Api-Key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ autoStart: !server.autoStart })
      });

      if (!response.ok) throw new Error('Failed to update MCP server');

      await fetchServers();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update server';
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  return {
    servers,
    loading,
    error,
    fetchServers,
    createServer,
    deleteServer,
    toggleAutoStart
  };
}
