// MCP Server Templates
export interface MCPTemplate {
  type: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  category: 'blockchain' | 'defi' | 'nft' | 'analytics' | 'utility';
  requiresApiKey: boolean;
  envHints?: Record<string, string>;
}

export const MCP_TEMPLATES: MCPTemplate[] = [
  // Blockchain 
  {
    type: 'nodit',
    name: 'Nodit Analytics',
    description: 'Base MCP for blockchain analytics powered by Nodit',
    command: 'npx',
    args: ['-y', '@noditlabs/nodit-mcp-server'],
    env: { NODIT_API_KEY: '' },
    category: 'blockchain',
    requiresApiKey: true,
    envHints: {
      NODIT_API_KEY: 'Get your API key from https://nodit.io',
    },
  },    
  {
    type: 'aptos-defi-agent',
    name: 'Aptos DeFi Agent',
    description: 'Token operations, DEX interactions, and DeFi protocols on Aptos',
    command: 'npx',
    args: ['-y', '@tamago-labs/aptos-mcp'],
    category: 'defi',
    requiresApiKey: false,
  },

  // Chain-Specific
  {
    type: 'cronos-mcp',
    name: 'Cronos MCP',
    description: 'Cronos blockchain interactions for EVM and zkEVM networks',
    command: 'npx',
    args: ['-y', '@tamago-labs/cronos-mcp'],
    env: {
      CRONOS_EVM_API_KEY: '',
      CRONOS_ZKEVM_API_KEY: '',
    },
    category: 'blockchain',
    requiresApiKey: true,
    envHints: {
      CRONOS_EVM_API_KEY: 'Get from Cronos EVM dashboard',
      CRONOS_ZKEVM_API_KEY: 'Get from Cronos zkEVM dashboard',
    },
  },

  // DEX Aggregators
  {
    type: 'okx-dex-mcp',
    name: 'OKX DEX Aggregator',
    description: 'Multi-chain DEX trading and liquidity analysis across 200+ DEXs',
    command: 'npx',
    args: ['-y', '@tamago-labs/okx-dex-mcp'],
    env: {
      OKX_API_KEY: '',
      OKX_SECRET_KEY: '',
      OKX_API_PASSPHRASE: '',
      OKX_PROJECT_ID: '',
    },
    category: 'defi',
    requiresApiKey: true,
    envHints: {
      OKX_API_KEY: 'From OKX Developer Center',
      OKX_SECRET_KEY: 'From OKX Developer Center',
      OKX_API_PASSPHRASE: 'Your API passphrase',
      OKX_PROJECT_ID: 'Your project ID',
    },
  },
  {
    type: 'tapp-exchange-mcp',
    name: 'Tapp Exchange',
    description: 'Aptos-based DEX operations - pool analytics and liquidity tracking',
    command: 'npx',
    args: ['-y', '@tamago-labs/tapp-exchange-mcp'],
    category: 'defi',
    requiresApiKey: false,
  },
 
];

export function getMCPTemplatesByCategory() {
  const categories = {
    blockchain: [] as MCPTemplate[],
    defi: [] as MCPTemplate[],
    nft: [] as MCPTemplate[],
    analytics: [] as MCPTemplate[],
    utility: [] as MCPTemplate[],
  };

  MCP_TEMPLATES.forEach(template => {
    categories[template.category].push(template);
  });

  return categories;
}

export function getMCPTemplateByType(type: string): MCPTemplate | undefined {
  return MCP_TEMPLATES.find(t => t.type === type);
}
