const { DynamoDBClient, GetItemCommand, ScanCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
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

// Helper function to format response
const response = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
});

// Helper function to generate ID
const generateId = () => `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get current timestamp
const getCurrentTimestamp = () => new Date().toISOString();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'OK' });
    }

    const { httpMethod, pathParameters, headers } = event;

    try {
        // GET /strategies - List strategies
        if (httpMethod === 'GET' && !pathParameters?.id) {
            try {
                const command = new ScanCommand({
                    TableName: STRATEGIES_TABLE,
                });

                const result = await dynamoClient.send(command);
                const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];
                
                return response(200, {
                    success: true,
                    data: items,
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
            // Validate API key
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
                
                const strategy = {
                    id: generateId(),
                    name: body.name,
                    type: body.type, // conservative, balanced, aggressive
                    description: body.description || '',
                    config: body.config || {},
                    isActive: body.isActive !== undefined ? body.isActive : true,
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
            // Validate API key
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
                
                // Build update expression
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

                // Always update updatedAt
                updateExpressions.push('#updatedAt = :updatedAt');
                expressionAttributeNames['#updatedAt'] = 'updatedAt';
                expressionAttributeValues[':updatedAt'] = { S: timestamp };

                if (updateExpressions.length === 1) { // Only updatedAt
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
            // Validate API key
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const strategyId = pathParameters.id;
            
            try {
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
