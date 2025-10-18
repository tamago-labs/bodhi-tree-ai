// MCP Proxy Lambda - Handles MCP tool calls
// This is a simplified version - in production, this would spawn actual MCP servers

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb'); 
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({});

const MCP_SERVERS_TABLE = process.env.MCP_SERVERS_TABLE;
const API_KEY = process.env.API_KEY;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

// Helper function to format response
const response = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
});

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return response(200, { message: 'OK' });
  }

  const httpMethod = event.httpMethod;
  const path = event.path;
  const headers = event.headers;

  try {
    if (path.includes('/tools/call')) {
      return await callTool(JSON.parse(event.body), headers);
    } else if (path.includes('/tools')) {
      return await listTools();
    }

    return response(400, {
      success: false,
      error: 'Unknown endpoint'
    });
  } catch (error) {
    console.error('Error:', error);
    return response(500, {
      success: false,
      error: 'Internal server error'
    });
  }
};

async function listTools() {
  try {
    // Get active MCP servers
    const command = new ScanCommand({
      TableName: MCP_SERVERS_TABLE,
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: marshall({ ':status': 'running' }),
    });

    const result = await dynamoClient.send(command);
    const servers = result.Items ? result.Items.map(item => unmarshall(item)) : [];

    // Mock tools for each server
    const tools = {};
    servers.forEach(server => {
      tools[server.name] = getMockToolsForServer(server);
    });

    return response(200, {
      success: true,
      data: {
        tools,
        serverCount: servers.length,
        servers: servers.map(s => ({ id: s.id, name: s.name, status: s.status }))
      }
    });
  } catch (error) {
    console.error('Error listing tools:', error);
    return response(500, {
      success: false,
      error: 'Failed to list tools'
    });
  }
}

async function callTool(body, headers) {
  // Validate API key
  const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return response(401, {
      success: false,
      error: 'Invalid or missing API key'
    });
  }

  const { serverId, toolName, arguments: args } = body;

  if (!serverId || !toolName) {
    return response(400, {
      success: false,
      error: 'serverId and toolName are required'
    });
  }

  try {
    console.log(`Calling tool: ${serverId}.${toolName}`, args);

    // Mock tool execution
    // In production, this would communicate with Rust parent or spawn MCP servers
    const result = await executeMockTool(serverId, toolName, args);

    return response(200, {
      success: true,
      data: {
        success: true,
        serverId,
        toolName,
        result,
        executedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error calling tool:', error);
    return response(500, {
      success: false,
      error: 'Failed to call tool'
    });
  }
}

function getMockToolsForServer(server) {
  // Return mock tools based on server type
  const commonTools = [
    {
      name: 'get_balance',
      description: 'Get wallet balance',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          chain: { type: 'string' },
        },
        required: ['address'],
      },
    },
    {
      name: 'get_transaction',
      description: 'Get transaction details',
      inputSchema: {
        type: 'object',
        properties: {
          hash: { type: 'string' },
          chain: { type: 'string' },
        },
        required: ['hash'],
      },
    },
    {
      name: 'get_gas_price',
      description: 'Get current gas price',
      inputSchema: {
        type: 'object',
        properties: {
          chain: { type: 'string' },
        },
      },
    },
  ];

  return commonTools;
}

async function executeMockTool(serverId, toolName, args) {
  // Mock responses for different tools
  switch (toolName) {
    case 'get_balance':
      return {
        address: args.address,
        balance: '1.5',
        symbol: 'ETH',
        usdValue: 5250.75,
      };

    case 'get_transaction':
      return {
        hash: args.hash,
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bCe7',
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bCe7',
        value: '0.1',
        status: 'confirmed',
        blockNumber: 12345678,
      };

    case 'get_gas_price':
      return {
        chain: args.chain || 'ethereum',
        gasPrice: '25',
        unit: 'gwei',
      };

    default:
      return { message: `Tool ${toolName} executed successfully`, args };
  }
}
