
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

// Helper function to get current timestamp
const getCurrentTimestamp = () => new Date().toISOString();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'OK' });
    }

    const { httpMethod, pathParameters } = event;

    try {
        // GET /agent/status/{id} - Get agent status for specific agent ID
        if (httpMethod === 'GET' && pathParameters?.id) {
            const agentId = pathParameters.id;
            
            // Return agent status (single agent per system)
            const agent = {
                id: agentId,
                name: 'Bodhi Tree Agent',
                status: 'online',
                strategy: process.env.AGENT_STRATEGY || 'balanced',
                version: '1.0.0',
                config: {
                    riskLevel: process.env.RISK_LEVEL || 'medium',
                    maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '3.0'),
                    protocols: (process.env.PROTOCOLS || 'Aave,Compound,Uniswap,KommuneFi').split(','),
                    strategyParams: getStrategyParams(process.env.AGENT_STRATEGY || 'balanced'),
                },
                performance: {
                    uptime: process.uptime ? process.uptime() : 0,
                    lastActivity: getCurrentTimestamp(),
                    lastSeen: getCurrentTimestamp(),
                },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: getCurrentTimestamp(),
            };
            
            return response(200, {
                success: true,
                data: agent
            });
        }

        // GET /agent/status - Get default agent status
        if (httpMethod === 'GET' && !pathParameters?.id) {
            const defaultAgent = {
                id: 'agent_bodhi_tree_main',
                name: 'Bodhi Tree Agent',
                status: 'running',
                strategy: process.env.AGENT_STRATEGY || 'balanced',
                version: '1.0.0',
                config: {
                    riskLevel: process.env.RISK_LEVEL || 'medium',
                    maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '3.0'),
                    protocols: (process.env.PROTOCOLS || 'Aave,Compound,Uniswap,KommuneFi').split(','),
                    strategyParams: getStrategyParams(process.env.AGENT_STRATEGY || 'balanced'),
                },
                performance: {
                    uptime: process.uptime ? process.uptime() : 0,
                    lastActivity: getCurrentTimestamp(),
                },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: getCurrentTimestamp(),
            };
            
            return response(200, {
                success: true,
                data: defaultAgent
            });
        }

        // Method not allowed
        return response(405, {
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return response(500, {
            success: false,
            error: 'Internal server error'
        });
    }
};

function getStrategyParams(strategy) {
    switch (strategy) {
        case 'conservative':
            return {
                stakingAllocation: 60,
                lendingAllocation: 40,
                targetAPY: 6.5,
                description: 'Low risk with KAIA staking and Avalon Finance lending',
            };

        case 'balanced':
            return {
                dexAllocation: 60,
                lendingAllocation: 40,
                targetAPY: 15,
                rebalanceThreshold: 5,
                description: 'Moderate risk with DEX yield farming and lending protocols',
            };

        case 'aggressive':
            return {
                mevEnabled: true,
                flashloanEnabled: true,
                targetAPY: 35,
                minProfitThreshold: 0.5,
                description: 'High risk with MEV strategies and flashloan arbitrage',
            };

        default:
            return {};
    }
}
