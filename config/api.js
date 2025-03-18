// config/api.js
require('dotenv').config();

module.exports = {
  webflow: {
    baseUrl: 'https://api.webflow.com',
    apiVersion: '1.0.0',
    rateLimit: {
      maxRequests: 60,
      timeWindow: 60000 // 1 minute in milliseconds
    }
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    defaultModel: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
    defaultMaxTokens: 2000,
    defaultTemperature: 0.7
  }
};
