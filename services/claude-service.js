// services/claude-service.js
const { Claude } = require('@anthropic-ai/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
require('dotenv').config();

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: "us-west-2",
});

// In-memory cache for the API key to avoid repeated calls to Secrets Manager
let cachedApiKey = null;
let lastFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

async function getClaudeApiKey() {
  // If we have a cached key that's still valid, use it
  const now = Date.now();
  if (cachedApiKey && (now - lastFetchTime < CACHE_TTL)) {
    return cachedApiKey;
  }
  
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: "Claude",
        VersionStage: "AWSCURRENT",
      })
    );
    
    const secretData = JSON.parse(response.SecretString);
    cachedApiKey = secretData.CLAUDE_API_KEY;
    lastFetchTime = now;
    return cachedApiKey;
  } catch (error) {
    console.error("Error retrieving Claude API key from Secrets Manager:", error);
    // Fallback to .env file if Secrets Manager fails
    if (process.env.CLAUDE_API_KEY) {
      console.log("Using API key from .env file as fallback");
      return process.env.CLAUDE_API_KEY;
    }
    throw error;
  }
}

async function generateContent(prompt, options = {}) {
  try {
    // Get API key from AWS Secrets Manager (or fallback to .env)
    const apiKey = await getClaudeApiKey();
    
    // Initialize Claude client with the API key
    const claude = new Claude({
      apiKey: apiKey,
    });
    
    // Send request to Claude
    const response = await claude.complete({
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      model: options.model || process.env.CLAUDE_MODEL || 'claude-3.7-sonnet-20250219',
      max_tokens_to_sample: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
    });
    
    return response.completion;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate content with Claude: ' + error.message);
  }
}

module.exports = { generateContent };
