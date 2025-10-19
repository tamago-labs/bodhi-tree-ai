const { DynamoDBClient, ScanCommand, QueryCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const STRATEGIES_TABLE = process.env.STRATEGIES_TABLE;
const API_KEY = process.env.API_KEY;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

const response = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
});

const generateId = () => `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getCurrentTimestamp = () => new Date().toISOString();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'OK' });
    }

    const { httpMethod, pathParameters, headers, queryStringParameters } = event;

    try {
        // GET /strategies - List all strategies
        if (httpMethod === 'GET' && !pathParameters?.id) {
            try {
                const command = new ScanCommand({
                    TableName: STRATEGIES_TABLE,
                });

                const result = await dynamoClient.send(command);
                const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];
                
                // Separate active and inactive
                const active = items.find(item => item.isActive === true);
                const inactive = items.filter(item => item.isActive !== true);

                return response(200, {
                    success: true,
                    active: active || null,
                    inactive: inactive,
                    templates: getStrategyTemplates(),
                    count: items.length
                });
            } catch (error) {
                console.error('Error fetching strategies:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch strategies'
                });
            }
        }

        // GET /strategies/{id} - Get specific strategy
        if (httpMethod === 'GET' && pathParameters?.id) {
            const strategyId = pathParameters.id;
            
            try {
                const command = new GetItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Key: marshall({ id: strategyId })
                });

                const result = await dynamoClient.send(command);
                
                if (!result.Item) {
                    return response(404, {
                        success: false,
                        error: 'Strategy not found'
                    });
                }

                const strategy = unmarshall(result.Item);
                return response(200, {
                    success: true,
                    data: strategy
                });
            } catch (error) {
                console.error('Error fetching strategy:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch strategy'
                });
            }
        }

        // POST /strategies - Create new strategy
        if (httpMethod === 'POST') {
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            try {
                const body = JSON.parse(event.body || '{}');
                const timestamp = getCurrentTimestamp();
                
                // If this strategy is being set as active, deactivate others first
                if (body.isActive === true) {
                    await deactivateAllStrategies();
                }
                
                const strategy = {
                    id: generateId(),
                    name: body.name,
                    type: body.type, // conservative, balanced, aggressive, custom
                    description: body.description || '',
                    config: body.config || getDefaultStrategyConfig(body.type),
                    isActive: body.isActive || false,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };

                const command = new PutItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Item: marshall(strategy)
                });

                await dynamoClient.send(command);

                return response(201, {
                    success: true,
                    data: strategy,
                    message: 'Strategy created successfully'
                });
            } catch (error) {
                console.error('Error creating strategy:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to create strategy'
                });
            }
        }

        // PUT /strategies/{id} - Update strategy
        if (httpMethod === 'PUT' && pathParameters?.id) {
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const strategyId = pathParameters.id;
            
            try {
                const body = JSON.parse(event.body || '{}');
                const timestamp = getCurrentTimestamp();
                
                // If setting this strategy as active, deactivate others first
                if (body.isActive === true) {
                    await deactivateAllStrategies();
                }
                
                const updateExpressions = [];
                const expressionAttributeNames = {};
                const expressionAttributeValues = {};

                if (body.name) {
                    updateExpressions.push('#name = :name');
                    expressionAttributeNames['#name'] = 'name';
                    expressionAttributeValues[':name'] = { S: body.name };
                }

                if (body.type) {
                    updateExpressions.push('#type = :type');
                    expressionAttributeNames['#type'] = 'type';
                    expressionAttributeValues[':type'] = { S: body.type };
                }

                if (body.description) {
                    updateExpressions.push('#description = :description');
                    expressionAttributeNames['#description'] = 'description';
                    expressionAttributeValues[':description'] = { S: body.description };
                }

                if (body.config) {
                    updateExpressions.push('#config = :config');
                    expressionAttributeNames['#config'] = 'config';
                    expressionAttributeValues[':config'] = marshall(body.config);
                }

                if (body.isActive !== undefined) {
                    updateExpressions.push('#isActive = :isActive');
                    expressionAttributeNames['#isActive'] = 'isActive';
                    expressionAttributeValues[':isActive'] = { BOOL: body.isActive };
                }

                updateExpressions.push('#updatedAt = :updatedAt');
                expressionAttributeNames['#updatedAt'] = 'updatedAt';
                expressionAttributeValues[':updatedAt'] = { S: timestamp };

                if (updateExpressions.length === 1) {
                    return response(400, {
                        success: false,
                        error: 'No valid fields to update'
                    });
                }

                const updateCommand = new UpdateItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Key: marshall({ id: strategyId }),
                    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW',
                });

                const result = await dynamoClient.send(updateCommand);
                const updatedStrategy = unmarshall(result.Attributes);

                return response(200, {
                    success: true,
                    data: updatedStrategy,
                    message: 'Strategy updated successfully'
                });
            } catch (error) {
                console.error('Error updating strategy:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to update strategy'
                });
            }
        }

        // DELETE /strategies/{id} - Delete strategy
        if (httpMethod === 'DELETE' && pathParameters?.id) {
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const strategyId = pathParameters.id;
            
            try {
                // Check if it's the active strategy
                const getCommand = new GetItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Key: marshall({ id: strategyId })
                });

                const getResult = await dynamoClient.send(getCommand);
                
                if (getResult.Item) {
                    const strategy = unmarshall(getResult.Item);
                    if (strategy.isActive === true) {
                        return response(400, {
                            success: false,
                            error: 'Cannot delete active strategy. Please activate another strategy first.'
                        });
                    }
                }

                const command = new DeleteItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Key: marshall({ id: strategyId })
                });

                await dynamoClient.send(command);

                return response(200, {
                    success: true,
                    message: 'Strategy deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting strategy:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to delete strategy'
                });
            }
        }

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

// Helper: Deactivate all strategies
async function deactivateAllStrategies() {
    try {
        const scanCommand = new ScanCommand({
            TableName: STRATEGIES_TABLE,
            FilterExpression: 'isActive = :isActive',
            ExpressionAttributeValues: {
                ':isActive': { BOOL: true }
            }
        });

        const scanResult = await dynamoClient.send(scanCommand);
        
        if (scanResult.Items && scanResult.Items.length > 0) {
            for (const item of scanResult.Items) {
                const strategy = unmarshall(item);
                
                const updateCommand = new UpdateItemCommand({
                    TableName: STRATEGIES_TABLE,
                    Key: marshall({ id: strategy.id }),
                    UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
                    ExpressionAttributeValues: {
                        ':isActive': { BOOL: false },
                        ':updatedAt': { S: getCurrentTimestamp() }
                    }
                });

                await dynamoClient.send(updateCommand);
                console.log(`Deactivated strategy: ${strategy.id}`);
            }
        }
    } catch (error) {
        console.error('Error deactivating strategies:', error);
        throw error;
    }
}

// Strategy templates for frontend to choose from
function getStrategyTemplates() {
    return [
        {
            type: 'conservative',
            name: 'Conservative Strategy',
            description: 'Low-risk loop: stake KAIA via Lair, lend stKAIA on KiloLend, borrow stablecoin, and restake to boost yield safely.',
            config: {
                stakingProtocol: 'Lair Finance',
                lendingProtocol: 'KiloLend',
                baseAsset: 'KAIA',
                stakedAsset: 'stKAIA',
                loopEnabled: true,
                loopSteps: 2,
                targetAPY: 8,
            },
            riskLevel: 'low',
            estimatedAPY: '8-12%'
        },
        {
            type: 'balanced',
            name: 'Balanced Strategy',
            description: 'Moderate-risk yield: combine staking and lending with DEX liquidity farming on KLEX to enhance returns.',
            config: {
                stakingProtocol: 'Lair Finance',
                lendingProtocol: 'KiloLend',
                dexProtocol: 'KLEX',
                loopEnabled: true,
                loopSteps: 3,
                lpFarmingEnabled: true,
                rebalanceThreshold: 5,
                targetAPY: 18,
            },
            riskLevel: 'medium',
            estimatedAPY: '15-25%'
        },
        {
            type: 'aggressive',
            name: 'Aggressive Strategy',
            description: 'High-risk loop with leverage farming on KiloLend, AI-driven rebalancing, and auto-compounding to maximize KAIA yield.',
            config: {
                leverageEnabled: true,
                leverageMultiplier: 3,
                autoCompoundEnabled: true,
                aiTradingEnabled: true,
                modelType: 'momentum',
                targetAPY: 35,
                minProfitThreshold: 0.5,
            },
            riskLevel: 'high',
            estimatedAPY: '30-50%'
        }
    ];
}

function getDefaultStrategyConfig(type) {
    const templates = getStrategyTemplates();
    const template = templates.find(t => t.type === type);
    return template ? template.config : {};
}
