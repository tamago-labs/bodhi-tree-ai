
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const STRATEGIES_TABLE = process.env.STRATEGIES_TABLE;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json',
};

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

    try {
        // Get active strategy from database
        const activeStrategy = await getActiveStrategy();

        // Static agent configuration
        const agent = {
            id: 'agent_bodhi_tree_main',
            name: 'Bodhi Tree Agent',
            status: 'running',
            version: '1.0.0',
            strategy: activeStrategy ? {
                id: activeStrategy.id,
                name: activeStrategy.name,
                type: activeStrategy.type,
                description: activeStrategy.description,
                config: activeStrategy.config,
                isActive: true
            } : {
                // Fallback to default if no active strategy
                type: 'balanced',
                name: 'Balanced Strategy',
                description: 'Default balanced strategy',
                config: getDefaultStrategyConfig('balanced')
            },
            performance: {
                uptime: process.uptime ? process.uptime() : 0,
                lastActivity: new Date().toISOString(),
            },
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(),
        };

        return response(200, agent);

    } catch (error) {
        console.error('Error:', error);
        return response(500, {
            error: 'Failed to get agent status',
            message: error.message
        });
    }
};

async function getActiveStrategy() {
    try {
        // Scan for active strategy (there should only be one)
        const command = new ScanCommand({
            TableName: STRATEGIES_TABLE,
            FilterExpression: 'isActive = :isActive',
            ExpressionAttributeValues: {
                ':isActive': { BOOL: true }
            }
        });

        const result = await dynamoClient.send(command);
        
        if (result.Items && result.Items.length > 0) {
            const strategy = unmarshall(result.Items[0]);
            console.log('Active strategy:', strategy);
            return strategy;
        }

        console.log('No active strategy found');
        return null;

    } catch (error) {
        console.error('Error getting active strategy:', error);
        return null;
    }
}

function getDefaultStrategyConfig(type) {
    switch (type) {
        case 'conservative':
            return {
                stakingProtocol: 'Lair Finance',
                lendingProtocol: 'KiloLend',
                baseAsset: 'KAIA',
                stakedAsset: 'stKAIA',
                loopEnabled: true,
                loopSteps: 2,
                targetAPY: 8,
            };

        case 'balanced':
            return {
                stakingProtocol: 'Lair Finance',
                lendingProtocol: 'KiloLend',
                dexProtocol: 'KLEX',
                loopEnabled: true,
                loopSteps: 3,
                lpFarmingEnabled: true,
                rebalanceThreshold: 5,
                targetAPY: 18,
            };

        case 'aggressive':
            return {
                leverageEnabled: true,
                leverageMultiplier: 3,
                autoCompoundEnabled: true,
                aiTradingEnabled: true,
                modelType: 'momentum',
                targetAPY: 35,
                minProfitThreshold: 0.5,
            };

        default:
            return {};
    }
}
