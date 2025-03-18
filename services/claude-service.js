const { Claude } = require('@anthropic-ai/sdk');

const claude = new Claude({
  apiKey: process.env.CLAUDE_API_KEY,
});

async function generateContent(prompt, options = {}) {
  try {
    const response = await claude.complete({
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      model: options.model || process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
      max_tokens_to_sample: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });
    return response.completion;
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate content with Claude');
  }
}

module.exports = { generateContent };
