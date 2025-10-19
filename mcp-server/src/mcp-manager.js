const { MCPClient } = require('./mcp-client');
const { logger } = require('./utils/logger');
const axios = require('axios');

require('dotenv').config();

class MCPManager {
  constructor() {
    this.clients = new Map();
    this.configs = new Map();
    
    // AWS API configuration
    this.awsApiUrl = process.env.AWS_API_URL;
    this.awsApiKey = process.env.AWS_API_KEY;
    
    // Track last sync time
    this.lastSyncTime = null;
  }

  /**
   * Load MCP server configs from API
   */
  async loadConfigsFromAWS() {
    if (!this.awsApiUrl || !this.awsApiKey) {
      logger.warn('⚠️  AWS API not configured - skipping config sync');
      logger.warn('   Set AWS_API_URL and AWS_API_KEY in environment variables');
      return [];
    }

    try {
      logger.info('📡 Fetching MCP server configs from AWS...');
      
      const response = await axios.get(`${this.awsApiUrl}/mcp/servers`, {
        headers: { 'X-Api-Key': this.awsApiKey },
        timeout: 10000
      });

      const configs = response.data;
      logger.info(`✅ Fetched ${configs.length} MCP server configs from AWS`);
      
      this.lastSyncTime = new Date().toISOString();
      return configs;
      
    } catch (error) {
      logger.error('❌ Failed to fetch MCP configs from AWS:', error.message);
      if (error.response) {
        logger.error(`   Status: ${error.response.status}`);
        logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      return [];
    }
  }

  /**
   * Sync MCP servers from AWS - register and auto-start as needed
   */
  async syncFromAWS() {
    logger.info('🔄 Syncing MCP servers from AWS...');
    
    const awsConfigs = await this.loadConfigsFromAWS();
    
    if (awsConfigs.length === 0) {
      logger.warn('⚠️  No MCP server configs found in AWS');
      return;
    }

    // Register all configs from AWS
    for (const awsConfig of awsConfigs) {
      const config = {
        name: awsConfig.name,
        command: awsConfig.command,
        args: awsConfig.args || [],
        env: awsConfig.env || {},
        autoStart: awsConfig.autoStart || false,
        description: awsConfig.description || '',
        awsId: awsConfig.id // Store AWS ID for status updates
      };

      // Register or update config
      this.registerServer(config);

      // Auto-start if needed and not already connected
      if (config.autoStart && !this.isServerConnected(config.name)) {
        try {
          logger.info(`🚀 Auto-starting MCP server: ${config.name}`);
          await this.connectServer(config.name);
          
          // Update status in AWS
          await this.updateServerStatusInAWS(config.awsId, 'running');
          
        } catch (error) {
          logger.error(`❌ Failed to auto-start ${config.name}:`, error.message);
          
          // Update status to error in AWS
          await this.updateServerStatusInAWS(config.awsId, 'error');
        }
      }
      
      // Stop server if autoStart is false but it's running
      if (!config.autoStart && this.isServerConnected(config.name)) {
        try {
          logger.info(`🛑 Stopping MCP server (autoStart=false): ${config.name}`);
          await this.disconnectServer(config.name);
          
          // Update status in AWS
          await this.updateServerStatusInAWS(config.awsId, 'stopped');
          
        } catch (error) {
          logger.error(`❌ Failed to stop ${config.name}:`, error.message);
        }
      }
    }

    logger.info(`✅ Sync complete - ${this.getRegisteredServers().length} servers registered, ${this.getConnectedServers().length} connected`);
  }

  /**
   * Update MCP server status in AWS DynamoDB
   */
  async updateServerStatusInAWS(serverId, status) {
    if (!this.awsApiUrl || !this.awsApiKey || !serverId) {
      return;
    }

    try {
      await axios.put(
        `${this.awsApiUrl}/mcp/servers/${serverId}`,
        { status },
        {
          headers: { 'X-Api-Key': this.awsApiKey },
          timeout: 5000
        }
      );
      
      logger.debug(`📝 Updated server ${serverId} status to: ${status}`);
      
    } catch (error) {
      logger.error(`❌ Failed to update server status in AWS:`, error.message);
    }
  }

  /**
   * Refresh configs endpoint - force reload from AWS
   */
  async refreshConfigs() {
    logger.info('🔄 Manual refresh triggered');
    await this.syncFromAWS();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      registered: this.getRegisteredServers().length,
      connected: this.getConnectedServers().length,
      lastSyncTime: this.lastSyncTime
    };
  }

  registerServer(config) {
    this.configs.set(config.name, config);
    logger.info(`📝 Registered MCP server: ${config.name} - ${config.description || 'No description'}`);
  }

  async connectServer(serverName, customConfig = {}) {
    if (this.clients.has(serverName)) {
      logger.warn(`Server ${serverName} is already connected`);
      return { alreadyConnected: true };
    }

    const config = this.configs.get(serverName);
    if (!config) {
      throw new Error(`Server ${serverName} not registered. Available servers: ${Array.from(this.configs.keys()).join(', ')}`);
    }

    const mcpConfig = {
      command: customConfig.command || config.command,
      args: customConfig.args || config.args,
      env: { ...config.env, ...customConfig.env },
      cwd: customConfig.cwd || config.cwd
    };

    logger.info(`🔌 Connecting to MCP server: ${serverName}`);

    const client = new MCPClient(mcpConfig, serverName);

    // Set up event listeners
    client.on('disconnected', () => {
      logger.info(`🔌 MCP server ${serverName} disconnected`);
      this.clients.delete(serverName);
    });

    client.on('notification', (notification) => {
      logger.debug(`📢 Notification from ${serverName}:`, notification);
    });

    try {
      await client.connect();
      this.clients.set(serverName, client);
      logger.info(`✅ Successfully connected to MCP server: ${serverName}`);

      return {
        connected: true,
        serverName,
        status: client.getStatus()
      };
    } catch (error) {
      logger.error(`❌ Failed to connect to ${serverName}:`, error);
      throw new Error(`Failed to connect to ${serverName}: ${error.message}`);
    }
  }

  async disconnectServer(serverName) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    logger.info(`🔌 Disconnecting from MCP server: ${serverName}`);

    try {
      await client.disconnect();
      this.clients.delete(serverName);
      logger.info(`✅ Successfully disconnected from MCP server: ${serverName}`);
    } catch (error) {
      logger.error(`❌ Error disconnecting from ${serverName}:`, error);
      // Still remove from clients map even if disconnect failed
      this.clients.delete(serverName);
      throw error;
    }
  }

  getClient(serverName) {
    return this.clients.get(serverName);
  }

  getConnectedServers() {
    return Array.from(this.clients.keys());
  }

  getRegisteredServers() {
    return Array.from(this.configs.keys());
  }

  async listAllTools() {
    const allTools = {};

    for (const [serverName, client] of this.clients) {
      try {
        logger.debug(`📋 Listing tools for ${serverName}`);
        const tools = await client.listTools();
        allTools[serverName] = tools;
        logger.debug(`📋 Found ${tools.length} tools for ${serverName}`);
      } catch (error) {
        logger.error(`❌ Error listing tools for ${serverName}:`, error);
        allTools[serverName] = [];
      }
    }

    return allTools;
  }

  async callTool(serverName, toolName, arguments_) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected. Connected servers: ${this.getConnectedServers().join(', ')}`);
    }

    logger.info(`🔧 Calling tool ${toolName} on ${serverName}`, { arguments: arguments_ });

    try {
      const result = await client.callTool(toolName, arguments_);
      logger.info(`✅ Tool ${toolName} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`❌ Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  async listAllResources() {
    const allResources = {};

    for (const [serverName, client] of this.clients) {
      try {
        logger.debug(`📋 Listing resources for ${serverName}`);
        const resources = await client.listResources();
        allResources[serverName] = resources;
        logger.debug(`📋 Found ${resources.length} resources for ${serverName}`);
      } catch (error) {
        logger.error(`❌ Error listing resources for ${serverName}:`, error);
        allResources[serverName] = [];
      }
    }

    return allResources;
  }

  async readResource(serverName, uri) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected. Connected servers: ${this.getConnectedServers().join(', ')}`);
    }

    logger.info(`📖 Reading resource from ${serverName}: ${uri}`);

    try {
      const content = await client.readResource(uri);
      logger.info(`✅ Resource read successfully from ${serverName}`);
      return content;
    } catch (error) {
      logger.error(`❌ Failed to read resource from ${serverName}:`, error);
      throw error;
    }
  }

  async disconnectAll() {
    logger.info(`🔌 Disconnecting all MCP servers (${this.clients.size} servers)`);

    const disconnectPromises = Array.from(this.clients.keys()).map(async (serverName) => {
      try {
        await this.disconnectServer(serverName);
      } catch (error) {
        logger.error(`❌ Error disconnecting ${serverName}:`, error);
      }
    });

    await Promise.all(disconnectPromises);
    logger.info('✅ All MCP servers disconnected');
  }

  isServerConnected(serverName) {
    const client = this.clients.get(serverName);
    return client?.isConnected() ?? false;
  }

  getServerStatus(serverName) {
    const client = this.clients.get(serverName);
    const config = this.configs.get(serverName);

    return {
      name: serverName,
      registered: !!config,
      connected: client?.isConnected() ?? false,
      description: config?.description || 'No description',
      status: client?.getStatus() || null,
      autoStart: config?.autoStart ?? false,
      awsId: config?.awsId || null
    };
  }

  getAllServerStatus() {
    const allServers = new Set([
      ...this.getRegisteredServers(),
      ...this.getConnectedServers()
    ]);

    return Array.from(allServers).map(serverName => this.getServerStatus(serverName));
  }

  /**
   * Initialize servers - now loads from AWS instead of hardcoded defaults
   */
  async initializeServers() {
    logger.info('🚀 Initializing MCP servers from AWS...');
    
    // Sync from AWS
    await this.syncFromAWS();
    
    const connectedCount = this.getConnectedServers().length;
    const registeredCount = this.getRegisteredServers().length;
    
    logger.info(`✅ Initialization complete: ${connectedCount}/${registeredCount} servers connected`);
  }

  // Health check method
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      lastSyncTime: this.lastSyncTime,
      awsConnected: !!(this.awsApiUrl && this.awsApiKey),
      servers: {
        registered: this.getRegisteredServers().length,
        connected: this.getConnectedServers().length,
        details: this.getAllServerStatus()
      },
      summary: {}
    };

    // Test each connected server
    for (const [serverName, client] of this.clients) {
      try {
        const tools = await client.listTools();
        health.summary[serverName] = {
          status: 'healthy',
          toolCount: tools.length,
          connected: client.isConnected()
        };
      } catch (error) {
        health.summary[serverName] = {
          status: 'unhealthy',
          error: error.message,
          connected: client.isConnected()
        };
      }
    }

    // Determine overall health
    const unhealthyServers = Object.values(health.summary).filter(s => s.status === 'unhealthy');
    if (unhealthyServers.length > 0) {
      health.status = 'degraded';
    }

    return health;
  }
}

module.exports = { MCPManager };
