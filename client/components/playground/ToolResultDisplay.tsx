'use client';

import { useState } from 'react';
import { Copy, Check, Code, Database, FileText, AlertCircle } from 'lucide-react';
import { ToolResult } from '@/types/playground';
import { PlaygroundAPI } from '@/lib/playground-api';

interface ToolResultDisplayProps {
  tool: ToolResult;
}

export function ToolResultDisplay({ tool }: ToolResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const content = tool.error || PlaygroundAPI.formatToolOutput(tool.output);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy tool result:', error);
    }
  };

  const formatContent = (content: any): string => {
    return PlaygroundAPI.formatToolOutput(content);
  };

  const formatSmartContent = (content: any): { type: 'json' | 'defi' | 'table' | 'text'; content: string; data?: any } => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Check if it's DeFi pool data
      if (parsed.data?.pools && Array.isArray(parsed.data.pools)) {
        return {
          type: 'defi',
          content: formatDeFiPools(parsed.data.pools),
          data: parsed.data.pools
        };
      }
      
      // Check if it's table-like data
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return {
          type: 'table',
          content: formatTable(parsed),
          data: parsed
        };
      }
      
      // Check if it's a single object that could be a table
      if (typeof parsed === 'object' && parsed !== null && !parsed.data) {
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
          return {
            type: 'table',
            content: formatTable([parsed]),
            data: [parsed]
          };
        }
      }
      
      return {
        type: 'json',
        content: JSON.stringify(parsed, null, 2),
        data: parsed
      };
    } catch {
      return {
        type: 'text',
        content: String(content),
        data: null
      };
    }
  };

  const formatDeFiPools = (pools: any[]): string => {
    const headers = ['Token', 'Supply APY', 'Borrow APY', 'Total Supply', 'Total Borrow', 'Utilization', 'Available'];
    const rows = pools.map(pool => [
      pool.token || 'N/A',
      pool.supply_apy || 'N/A',
      pool.borrow_apy || 'N/A',
      pool.total_supply || 'N/A',
      pool.total_borrow || 'N/A',
      pool.utilization_rate || 'N/A',
      pool.liquidity_available || 'N/A'
    ]);
    
    return formatTableData(headers, rows);
  };

  const formatTable = (data: any[]): string => {
    if (data.length === 0) return 'No data available';
    
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    const headers = Array.from(allKeys);
    const rows = data.map(item => 
      headers.map(header => String(item[header] || 'N/A'))
    );
    
    return formatTableData(headers, rows);
  };

  const formatTableData = (headers: string[], rows: string[][]): string => {
    // Calculate column widths
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth, 10);
    });
    
    // Format header
    const headerRow = headers.map((header, i) => 
      header.padEnd(colWidths[i])
    ).join(' | ');
    
    const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
    
    // Format data rows
    const dataRows = rows.map(row => 
      row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ')
    );
    
    return [headerRow, separator, ...dataRows].join('\n');
  };

  const isJson = (content: string): boolean => {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  };

  const getContentIcon = () => {
    if (tool.error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    switch (smartContent.type) {
      case 'defi':
        return <Database className="w-4 h-4 text-green-500" />;
      case 'table':
        return <Database className="w-4 h-4 text-blue-500" />;
      case 'json':
        return <Code className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (tool.status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const smartContent = formatSmartContent(tool.error || tool.output);
  const isCodeBlock = smartContent.type !== 'text';

  return (
    <div className="p-4 space-y-3">
      {/* Tool Input (if available) */}
      {tool.input && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Database className="w-4 h-4" />
            Input:
          </div>
          <div className="bg-gray-50 rounded border border-gray-200 p-3">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
              {formatContent(tool.input)}
            </pre>
          </div>
        </div>
      )}

      {/* Tool Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            {getContentIcon()}
            {tool.error ? 'Error:' : 'Output:'}
          </div>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${
            tool.status === 'completed' ? 'bg-green-500' :
            tool.status === 'error' ? 'bg-red-500' :
            tool.status === 'running' ? 'bg-blue-500' :
            'bg-gray-500'
          }`} />
          {tool.status === 'completed' ? 'Completed' :
           tool.status === 'error' ? 'Error' :
           tool.status === 'running' ? 'Running' :
           'Pending'}
        </div>

        {/* Content Display */}
        <div className={`rounded border overflow-hidden ${
          tool.error ? 'bg-red-50 border-red-200' : 
          smartContent.type === 'defi' ? 'bg-green-50 border-green-200' :
          smartContent.type === 'table' ? 'bg-blue-50 border-blue-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          {isCodeBlock ? (
            <pre className="text-sm p-3 overflow-x-auto whitespace-pre-wrap">
              <code className={
                tool.error ? 'text-red-800' : 
                smartContent.type === 'defi' ? 'text-green-800' :
                smartContent.type === 'table' ? 'text-blue-800' :
                'text-gray-800'
              }>
                {smartContent.content}
              </code>
            </pre>
          ) : (
            <div className="p-3">
              <p className={`text-sm whitespace-pre-wrap ${
                tool.error ? 'text-red-800' : 'text-gray-800'
              }`}>
                {smartContent.content}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tool Metadata */}
      {(tool.serverName || tool.duration) && (
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
          {tool.serverName && (
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              Server: {tool.serverName}
            </div>
          )}
          {tool.duration && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              Duration: {typeof tool.duration === 'number' 
                ? `${(tool.duration / 1000).toFixed(2)}s` 
                : tool.duration
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
