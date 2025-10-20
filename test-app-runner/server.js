const express = require('express');
const app = express();

const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint - Hello World
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from AWS App Runner!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'Test App Runner Service',
    version: '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: ['/', '/health', '/api/info']
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Test App Runner service running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`🌐 Hello World: http://localhost:${port}/`);
  console.log(`ℹ️  API Info: http://localhost:${port}/api/info`);
});

module.exports = app;
