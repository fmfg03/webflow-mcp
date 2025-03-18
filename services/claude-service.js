// services/claude-service.js
const { Claude } = require('@anthropic-ai/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: "us-west-2",
});

async function getClaudeApiKey() {
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: "Claude",
        VersionStage: "AWSCURRENT",
      })
    );
    
    const secretData = JSON.parse(response.SecretString);
    return secretData.CLAUDE_API_KEY; // Assuming your secret has this property
  } catch (error) {
    console.error("Error retrieving Claude API key from Secrets Manager:", error);
    throw error;
  }
}

async function generateContent(prompt, options = {}) {
  try {
    // Get API key from AWS Secrets Manager
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
