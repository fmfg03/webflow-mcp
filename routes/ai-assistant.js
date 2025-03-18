const express = require('express');
const router = express.Router();
const claudeService = require('../services/claude-service');
const authMiddleware = require('../middleware/auth');

// Endpoint for Claude assistance
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('ai-assist')) {
      return res.status(403).json({ message: 'Permission denied for AI assistance' });
    }
    
    const { prompt, options } = req.body;
    const generatedContent = await claudeService.generateContent(prompt, options);
    res.json({ success: true, content: generatedContent });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint for batch processing with Claude
router.post('/batch-process', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('ai-assist') || !req.permissions.includes('bulk-operations')) {
      return res.status(403).json({ message: 'Permission denied for batch operations' });
    }
    
    const { items, promptTemplate, options } = req.body;
    const results = [];
    
    for (const item of items) {
      const customPrompt = promptTemplate.replace(/\{(\w+)\}/g, (match, key) => item[key] || match);
      const content = await claudeService.generateContent(customPrompt, options);
      results.push({ itemId: item.id, generatedContent: content });
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Batch process error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
