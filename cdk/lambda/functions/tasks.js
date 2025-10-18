const { DynamoDBClient, GetItemCommand, ScanCommand, QueryCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const TASKS_TABLE = process.env.TASKS_TABLE;
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
const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        // GET /tasks - List tasks
        if (httpMethod === 'GET' && !pathParameters?.id) {
            const status = queryStringParameters?.status;
            
            try {
                if (status) {
                    // Query by status using GSI
                    const command = new QueryCommand({
                        TableName: TASKS_TABLE,
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
                    // Scan all tasks
                    const command = new ScanCommand({
                        TableName: TASKS_TABLE,
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
                console.error('Error fetching tasks:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch tasks'
                });
            }
        }

        // GET /tasks/{id} - Get specific task
        if (httpMethod === 'GET' && pathParameters?.id) {
            const taskId = pathParameters.id;
            
            try {
                // Scan to find task by ID (since we need createdAt for composite key)
                const command = new ScanCommand({
                    TableName: TASKS_TABLE,
                    FilterExpression: 'id = :id',
                    ExpressionAttributeValues: marshall({ ':id': taskId }),
                });

                const result = await dynamoClient.send(command);
                
                if (!result.Items || result.Items.length === 0) {
                    return response(404, {
                        success: false,
                        error: 'Task not found'
                    });
                }

                const task = unmarshall(result.Items[0]);
                return response(200, {
                    success: true,
                    data: task
                });
            } catch (error) {
                console.error('Error fetching task:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to fetch task'
                });
            }
        }

        // POST /tasks - Create new task
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
                
                const task = {
                    id: generateId(),
                    createdAt: timestamp,
                    taskType: body.taskType || 'unknown',
                    status: 'pending',
                    payload: body.payload || {},
                    result: null,
                    error: null,
                    completedAt: null,
                };

                const command = new PutItemCommand({
                    TableName: TASKS_TABLE,
                    Item: marshall(task)
                });

                await dynamoClient.send(command);

                return response(201, {
                    success: true,
                    data: task,
                    message: 'Task created successfully'
                });
            } catch (error) {
                console.error('Error creating task:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to create task'
                });
            }
        }

        // PUT /tasks/{id} - Update task
        if (httpMethod === 'PUT' && pathParameters?.id) {
            // Validate API key
            const apiKey = headers['X-Api-Key'] || headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY) {
                return response(401, {
                    success: false,
                    error: 'Invalid or missing API key'
                });
            }

            const taskId = pathParameters.id;
            
            try {
                // First get the task to get createdAt
                const getCommand = new ScanCommand({
                    TableName: TASKS_TABLE,
                    FilterExpression: 'id = :id',
                    ExpressionAttributeValues: marshall({ ':id': taskId }),
                });

                const getResult = await dynamoClient.send(getCommand);
                
                if (!getResult.Items || getResult.Items.length === 0) {
                    return response(404, {
                        success: false,
                        error: 'Task not found'
                    });
                }

                const existingTask = unmarshall(getResult.Items[0]);
                const body = JSON.parse(event.body || '{}');
                const timestamp = getCurrentTimestamp();
                
                // Build update expression
                const updateExpressions = [];
                const expressionAttributeNames = {};
                const expressionAttributeValues = {};

                if (body.status) {
                    updateExpressions.push('#status = :status');
                    expressionAttributeNames['#status'] = 'status';
                    expressionAttributeValues[':status'] = { S: body.status };
                }

                if (body.result !== undefined) {
                    updateExpressions.push('#result = :result');
                    expressionAttributeNames['#result'] = 'result';
                    expressionAttributeValues[':result'] = marshall(body.result);
                }

                if (body.error) {
                    updateExpressions.push('#error = :error');
                    expressionAttributeNames['#error'] = 'error';
                    expressionAttributeValues[':error'] = { S: body.error };
                }

                // Add completedAt if status is completed or failed
                if (body.status === 'completed' || body.status === 'failed') {
                    updateExpressions.push('#completedAt = :completedAt');
                    expressionAttributeNames['#completedAt'] = 'completedAt';
                    expressionAttributeValues[':completedAt'] = { S: timestamp };
                }

                if (updateExpressions.length === 0) {
                    return response(400, {
                        success: false,
                        error: 'No valid fields to update'
                    });
                }

                const updateCommand = new UpdateItemCommand({
                    TableName: TASKS_TABLE,
                    Key: marshall({ id: taskId, createdAt: existingTask.createdAt }),
                    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW',
                });

                const result = await dynamoClient.send(updateCommand);
                const updatedTask = unmarshall(result.Attributes);

                return response(200, {
                    success: true,
                    data: updatedTask,
                    message: 'Task updated successfully'
                });
            } catch (error) {
                console.error('Error updating task:', error);
                return response(500, {
                    success: false,
                    error: 'Failed to update task'
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
