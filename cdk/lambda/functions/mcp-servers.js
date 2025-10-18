const { DynamoDBClient, ScanCommand, QueryCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

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

// Helper function to generate ID
const generateId = () => `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to get current timestamp
const getCurrentTimestamp = () => new Date().toISOString();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'OK' });
    }

    const { httpMethod, pathParameters, headers, queryStringParameters } = event;

    try {
        // GET /mcp/servers - List MCP servers
        if (httpMethod === 'GET' && !pathParameters?.id) {
            const status = queryStringParameters?.status;
            
            try {
                if (status) {
                    // Query by status using GSI
                    const command = new QueryCommand({
                        TableName: MCP_SERVERS_TABLE,
                        IndexName: 'StatusIndex',
                        KeyConditionExpression: '#status = :status',
                        ExpressionAttributeNames: { '#status': 'status' },
                        ExpressionAttributeValues: marshall({ ':status': status }),
                    });

                    const result = await dynamoClient.send(command);
                    const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];
                    
                    return response(200, {
                        success: true,
                        data: items,
                        count: items.length
                    });
                } else {
                    // Scan all servers
                    const command = new ScanCommand({
                        TableName: MCP_SERVERS_TABLE,
                    });

                    const result = await dynamoClient.send(command);
                    const items = result.Items ? result.Items.map(item => unmarshall(item)) : [];
                    
                    return response(200, {
                        success: true,
                        data: items,
                        count: items.length
                    });
                }
            } catch (error) {
                console.error('Error fetching MCP servers:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch MCP servers'
                });
            }
        }

        // GET /mcp/servers/{id} - Get specific MCP server
        if (httpMethod === 'GET' && pathParameters?.id) {
            const serverId = pathParameters.id;
            
            try {
                const command = new GetItemCommand({
                    TableName: MCP_SERVERS_TABLE,
                    Key: marshall({ id: serverId })
                });

                const result = await dynamoClient.send(command);
                
                if (!result.Item) {
                    return response(404, {
                        success: false,
                        error: 'MCP server not found'
                    });
                }

                const server = unmarshall(result.Item);
                return response(200, {
                    success: true,
                    data: server
                });
            } catch (error) {
                console.error('Error fetching MCP server:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch MCP server'
                });
            }
        }

        // POST /mcp/servers - Create new MCP server
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
                
                const server = {
                    id: generateId(),
                    name: body.name,
                    command: body.command,
                    args: body.args || [],
                    env: body.env || {},
                    status: 'stopped',
                    autoStart: body.autoStart || false,
                    description: body.description || '',
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };

                const command = new PutItemCommand({
                    TableName: MCP_SERVERS_TABLE,
                    Item: marshall(server)
                });

                await dynamoClient.send(command);

                return response(201, {
                    success: true,
                    data: server,
                    message: 'MCP server created successfully'
                });
            } catch (error) {
                console.error('Error creating MCP server:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to create MCP server'
                });
            }
        }

        // PUT /mcp/servers/{id} - Update MCP server
        if (httpMethod === 'PUT' && pathParameters?.id) {
            // Validate API key
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const serverId = pathParameters.id;
            
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

                if (body.command) {
                    updateExpressions.push('#command = :command');
                    expressionAttributeNames['#command'] = 'command';
                    expressionAttributeValues[':command'] = { S: body.command };
                }

                if (body.args) {
                    updateExpressions.push('#args = :args');
                    expressionAttributeNames['#args'] = 'args';
                    expressionAttributeValues[':args'] = marshall(body.args);
                }

                if (body.env) {
                    updateExpressions.push('#env = :env');
                    expressionAttributeNames['#env'] = 'env';
                    expressionAttributeValues[':env'] = marshall(body.env);
                }

                if (body.status) {
                    updateExpressions.push('#status = :status');
                    expressionAttributeNames['#status'] = 'status';
                    expressionAttributeValues[':status'] = { S: body.status };
                }

                if (body.autoStart !== undefined) {
                    updateExpressions.push('#autoStart = :autoStart');
                    expressionAttributeNames['#autoStart'] = 'autoStart';
                    expressionAttributeValues[':autoStart'] = { BOOL: body.autoStart };
                }

                if (body.description) {
                    updateExpressions.push('#description = :description');
                    expressionAttributeNames['#description'] = 'description';
                    expressionAttributeValues[':description'] = { S: body.description };
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
                    TableName: MCP_SERVERS_TABLE,
                    Key: marshall({ id: serverId }),
                    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW',
                });

                const result = await dynamoClient.send(updateCommand);
                const updatedServer = unmarshall(result.Attributes);

                return response(200, {
                    success: true,
                    data: updatedServer,
                    message: 'MCP server updated successfully'
                });
            } catch (error) {
                console.error('Error updating MCP server:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to update MCP server'
                });
            }
        }

        // DELETE /mcp/servers/{id} - Delete MCP server
        if (httpMethod === 'DELETE' && pathParameters?.id) {
            // Validate API key
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const serverId = pathParameters.id;
            
            try {
                const command = new DeleteItemCommand({
                    TableName: MCP_SERVERS_TABLE,
                    Key: marshall({ id: serverId })
                });

                await dynamoClient.send(command);

                return response(200, {
                    success: true,
                    message: 'MCP server deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting MCP server:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to delete MCP server'
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
