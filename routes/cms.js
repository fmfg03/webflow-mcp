const express = require('express');
const router = express.Router();
const webflowService = require('../services/webflow-service');
const claudeService = require('../services/claude-service');
const authMiddleware = require('../middleware/auth');

// Get all sites
router.get('/sites', authMiddleware, async (req, res) => {
  try {
    const sites = await webflowService.getSites();
    res.json({ success: true, sites });
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get site details
router.get('/sites/:siteId', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.params;
    const site = await webflowService.getSite(siteId);
    res.json({ success: true, site });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get site pages
router.get('/sites/:siteId/pages', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.params;
    const pages = await webflowService.getSitePages(siteId);
    res.json({ success: true, pages });
  } catch (error) {
    console.error('Get site pages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all collections for a site
router.get('/sites/:siteId/collections', authMiddleware, async (req, res) => {
  try {
    const { siteId } = req.params;
    const collections = await webflowService.getCollections(siteId);
    res.json({ success: true, collections });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get collection items
router.get('/collections/:collectionId/items', authMiddleware, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const items = await webflowService.getCollectionItems(collectionId);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get collection items error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new item
router.post('/collections/:collectionId/items', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('write')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { collectionId } = req.params;
    const { fields } = req.body;
    
    const newItem = await webflowService.createCmsItem(collectionId, fields);
    res.status(201).json({ success: true, item: newItem });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update item
router.put('/collections/:collectionId/items/:itemId', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('write')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { collectionId, itemId } = req.params;
    const { fields } = req.body;
    
    const updatedItem = await webflowService.updateCmsItem(collectionId, itemId, fields);
    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI-assisted content creation
router.post('/collections/:collectionId/ai-content', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('write') || !req.permissions.includes('ai-assist')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { collectionId } = req.params;
    const { title, keywords, tone, length } = req.body;
    
    // Generate content with Claude
    const prompt = `Create a blog post titled "${title}". 
      Include these keywords: ${keywords.join(', ')}. 
      The tone should be ${tone}. 
      Length should be approximately ${length} words.`;
    
    const content = await claudeService.generateContent(prompt);
    
    // Create the CMS item with generated content
    const newItem = await webflowService.createCmsItem(collectionId, {
      title: title,
      content: content,
      'publish-date': new Date().toISOString()
    });
    
    res.json({ success: true, item: newItem });
  } catch (error) {
    console.error('AI content creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Publish site changes
router.post('/sites/:siteId/publish', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('publish')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { siteId } = req.params;
    const { domains } = req.body;
    
    const publishResult = await webflowService.publishSite(siteId, domains);
    res.json({ success: true, result: publishResult });
  } catch (error) {
    console.error('Publish site error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get page by ID
router.get('/pages/:pageId', authMiddleware, async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await webflowService.getPageDetails(pageId);
    res.json({ success: true, page });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update page content
router.put('/pages/:pageId', authMiddleware, async (req, res) => {
  try {
    if (!req.permissions.includes('write')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { pageId } = req.params;
    const updates = req.body;
    
    const updatedPage = await webflowService.updatePageContent(pageId, updates);
    res.json({ success: true, page: updatedPage });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
