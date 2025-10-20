import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

export class BodhiTreeStack extends cdk.Stack {
  public readonly tasksTable: dynamodb.Table;
  public readonly mcpServersTable: dynamodb.Table;
  public readonly strategiesTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB TABLES
    // ========================================

    // Tasks Table - for async task processing
    this.tasksTable = new dynamodb.Table(this, 'TasksTable', {
      tableName: 'bodhi-tasks',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.tasksTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // MCP Servers Table - store MCP configurations
    this.mcpServersTable = new dynamodb.Table(this, 'MCPServersTable', {
      tableName: 'bodhi-mcp-servers',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.mcpServersTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'name',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Strategies Table - agent strategy configurations
    this.strategiesTable = new dynamodb.Table(this, 'StrategiesTable', {
      tableName: 'bodhi-strategies',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========================================
    // LAMBDA FUNCTIONS
    // ========================================

    // Lambda execution role with access to all tables
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:PutItem',
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:BatchGetItem',
              ],
              resources: [
                this.tasksTable.tableArn,
                `${this.tasksTable.tableArn}/index/*`,
                this.mcpServersTable.tableArn,
                `${this.mcpServersTable.tableArn}/index/*`,
                this.strategiesTable.tableArn
              ],
            }),
          ],
        }),
      },
    });

    // Grant DynamoDB permissions
    this.tasksTable.grantReadWriteData(lambdaRole);
    this.mcpServersTable.grantReadWriteData(lambdaRole);
    this.strategiesTable.grantReadWriteData(lambdaRole);

    // Environment variables for Lambda functions
    const lambdaEnv = {
      TASKS_TABLE: this.tasksTable.tableName,
      MCP_SERVERS_TABLE: this.mcpServersTable.tableName,
      STRATEGIES_TABLE: this.strategiesTable.tableName,
      API_KEY: '',
      NODE_ENV: 'production'
    };

    // CloudWatch Log Group
    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: '/aws/lambda/bodhi-tree',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Functions
    const tasksFunction = new lambda.Function(this, 'TasksFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'tasks.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      environment: lambdaEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: lambdaLogGroup,
    });

    const mcpServersFunction = new lambda.Function(this, 'MCPServersFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'mcp-servers.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      environment: lambdaEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: lambdaLogGroup,
    });

    const strategiesFunction = new lambda.Function(this, 'StrategiesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'strategies.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      environment: lambdaEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logGroup: lambdaLogGroup,
    });

    const agentStatusFunction = new lambda.Function(this, 'AgentStatusFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'agent-status.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      environment: lambdaEnv,
      role: lambdaRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logGroup: lambdaLogGroup,
    });

    // ========================================
    // API GATEWAY
    // ========================================

    this.api = new apigateway.RestApi(this, 'BodhiTreeApi', {
      restApiName: 'Bodhi Tree API',
      description: 'API for Bodhi Tree AI Agent Framework',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Api-Key', 'Authorization'],
      },
    });

    // Create API Key
    const apiKey = this.api.addApiKey('BodhiTreeApiKey', {
      apiKeyName: 'bodhi-tree-api-key',
      description: 'API Key for Bodhi Tree',
    });

    // Create Usage Plan
    const usagePlan = this.api.addUsagePlan('BodhiTreeUsagePlan', {
      name: 'Bodhi Tree Usage Plan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 50000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // ========================================
    // API ROUTES
    // ========================================

    // Agent Status (public - no API key)
    const agentResource = this.api.root.addResource('agent');
    agentResource.addMethod('GET', new apigateway.LambdaIntegration(agentStatusFunction));

    // Tasks endpoints (protected)
    const tasksResource = this.api.root.addResource('tasks');
    tasksResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction), {
      apiKeyRequired: true,
    });
    tasksResource.addMethod('POST', new apigateway.LambdaIntegration(tasksFunction), {
      apiKeyRequired: true,
    });

    const taskResource = tasksResource.addResource('{id}');
    taskResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction), {
      apiKeyRequired: true,
    });
    taskResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction), {
      apiKeyRequired: true,
    });

    // MCP Servers endpoints (protected)
    const mcpResource = this.api.root.addResource('mcp');
    
    const serversResource = mcpResource.addResource('servers');
    serversResource.addMethod('GET', new apigateway.LambdaIntegration(mcpServersFunction), {
      apiKeyRequired: true,
    });
    serversResource.addMethod('POST', new apigateway.LambdaIntegration(mcpServersFunction), {
      apiKeyRequired: true,
    });

    const serverResource = serversResource.addResource('{id}');
    serverResource.addMethod('GET', new apigateway.LambdaIntegration(mcpServersFunction), {
      apiKeyRequired: true,
    });
    serverResource.addMethod('PUT', new apigateway.LambdaIntegration(mcpServersFunction), {
      apiKeyRequired: true,
    });
    serverResource.addMethod('DELETE', new apigateway.LambdaIntegration(mcpServersFunction), {
      apiKeyRequired: true,
    });

    // Strategies endpoints (protected)
    const strategiesResource = this.api.root.addResource('strategies');
    strategiesResource.addMethod('GET', new apigateway.LambdaIntegration(strategiesFunction), {
      apiKeyRequired: true,
    });
    strategiesResource.addMethod('POST', new apigateway.LambdaIntegration(strategiesFunction), {
      apiKeyRequired: true,
    });

    const strategyResource = strategiesResource.addResource('{id}');
    strategyResource.addMethod('GET', new apigateway.LambdaIntegration(strategiesFunction), {
      apiKeyRequired: true,
    });
    strategyResource.addMethod('PUT', new apigateway.LambdaIntegration(strategiesFunction), {
      apiKeyRequired: true,
    });
    strategyResource.addMethod('DELETE', new apigateway.LambdaIntegration(strategiesFunction), {
      apiKeyRequired: true,
    });

    // ========================================
    // OUTPUTS
    // ========================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Bodhi Tree API URL',
      exportName: 'BodhiTreeApiUrl',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
      exportName: 'BodhiTreeApiKeyId',
    });

    new cdk.CfnOutput(this, 'TasksTableName', {
      value: this.tasksTable.tableName,
      description: 'Tasks DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'MCPServersTableName', {
      value: this.mcpServersTable.tableName,
      description: 'MCP Servers DynamoDB Table Name',
    });
 
  }
}
