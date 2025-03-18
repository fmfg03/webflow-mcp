const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const claudeService = require('../services/claude-service');
const projectService = require('../services/project-service');
const webflowService = require('../services/webflow-service');
const Discussion = require('../models/Discussion');
const Project = require('../models/Project');

// Get all discussions for a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get all discussions for this project
    const discussions = await Discussion.find({ project: projectId })
      .sort({ lastActive: -1 })
      .populate('createdBy', 'name email');
    
    res.json({ success: true, discussions });
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a single discussion
router.get('/:discussionId', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await Discussion.findById(discussionId)
      .populate('project', 'name siteId')
      .populate('createdBy', 'name email');
    
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(discussion.project);
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, discussion });
  } catch (error) {
    console.error('Get discussion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new discussion
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { projectId, title } = req.body;
    
    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Create initial system message with project context
    const siteInfo = await webflowService.getSite(project.siteId);
    
    const systemMessage = {
      role: 'system',
      content: `You are assisting with a Webflow website project based on the following analysis:
        ${JSON.stringify(project.analysis, null, 2)}
        
        The site ID is: ${project.siteId}
        Site name: ${siteInfo.displayName || 'Unknown'}
        
        Provide helpful recommendations about content, design, and structure.
        When suggesting changes, explain your reasoning and how it aligns with the project goals.
        Be specific in your recommendations and reference the project context.
        
        If asked to suggest HTML, CSS or JavaScript code, provide well-formatted examples that would 
        work well in Webflow. Be ready to explain any technical suggestions.`
    };
    
    // Create the discussion
    const discussion = new Discussion({
      project: projectId,
      title: title || 'New Discussion',
      messages: [systemMessage],
      createdBy: req.user.id
    });
    
    await discussion.save();
    
    // Add discussion reference to project
    project.discussions.push(discussion._id);
    await project.save();
    
    res.status(201).json({ success: true, discussion });
  } catch (error) {
    console.error('Create discussion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add message to discussion
router.post('/:discussionId/message', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { message } = req.body;
    
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(discussion.project);
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Add user message
    discussion.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Generate Claude response
    const claudePrompt = discussion.messages.map(msg => {
      if (msg.role === "system") return msg.content;
      return `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`;
    }).join("\n\n");
    
    const response = await claudeService.generateContent(claudePrompt);
    
    // Add assistant response
    discussion.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    // Update last active time
    discussion.lastActive = new Date();
    await discussion.save();
    
    res.json({
      success: true,
      assistantMessage: response
    });
  } catch (error) {
    console.error('Discussion message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific edit suggestions
router.post('/:discussionId/suggest-edits', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { pageId, elementType } = req.body;
    
    // Get current page content
    const pageDetails = await webflowService.getPageDetails(pageId);
    
    // Create prompt for specific edit suggestions
    const editPrompt = `
      Based on our discussion and the project goals, please suggest specific edits 
      for the ${elementType} element on this page:
      
      Page title: ${pageDetails.title}
      Current content: ${JSON.stringify(pageDetails.content)}
      
      Please provide 3 specific, actionable edit suggestions formatted as a JSON array.
      Each suggestion should include:
      1. A description of the change
      2. The exact content to replace or add
      3. A brief explanation of why this change would improve the site
    `;
    
    // Add to discussion context
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    discussion.messages.push({
      role: 'user',
      content: editPrompt,
      timestamp: new Date()
    });
    
    // Generate response
    const claudePrompt = discussion.messages.map(msg => {
      if (msg.role === "system") return msg.content;
      return `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`;
    }).join("\n\n");
    
    const response = await claudeService.generateContent(claudePrompt);
    
    // Add assistant response to context
    discussion.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    discussion.lastActive = new Date();
    await discussion.save();
    
    // Extract JSON from response
    let suggestions = [];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
    }
    
    res.json({
      success: true,
      response,
      suggestions,
      discussionId
    });
  } catch (error) {
    console.error('Edit suggestion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Apply suggested edit
router.post('/:discussionId/apply-edit', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { pageId, editContent, editDescription } = req.body;
    
    // Apply the edit
    const updateResult = await webflowService.updatePageContent(pageId, {
      content: editContent
    });
    
    // Add to discussion context
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    discussion.messages.push({
      role: 'user',
      content: `I've applied the edit: "${editDescription}". What other improvements would you suggest?`,
      timestamp: new Date()
    });
    
    // Generate response
    const claudePrompt = discussion.messages.map(msg => {
      if (msg.role === "system") return msg.content;
      return `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`;
    }).join("\n\n");
    
    const response = await claudeService.generateContent(claudePrompt);
    
    // Add assistant response to context
    discussion.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    discussion.lastActive = new Date();
    await discussion.save();
    
    // Add the applied change to project history
    const project = await Project.findById(discussion.project);
    project.appliedChanges = project.appliedChanges || [];
    project.appliedChanges.push({
      timestamp: new Date(),
      description: editDescription,
      element: pageId,
      content: editContent
    });
    await project.save();
    
    res.json({
      success: true,
      updateResult,
      response,
      discussionId
    });
  } catch (error) {
    console.error('Apply edit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get audience perspective feedback
router.post('/:discussionId/audience-perspective', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { audienceType, siteId } = req.body;
    
    // Get site details
    const site = await webflowService.getSite(siteId);
    
    // Create prompt for audience perspective
    const perspectivePrompt = `
      Please analyze how a ${audienceType.replace('-', ' ')} would perceive this website:
      
      Site name: ${site.displayName}
      Site description: ${site.meta?.description || 'Not provided'}
      
      Consider these aspects in your analysis:
      1. First impressions
      2. Content relevance and clarity
      3. Design appeal
      4. Navigation and usability
      5. Call-to-action effectiveness
      6. Trust factors
      
      What would be their main impressions, concerns, and how likely would they be to engage further?
    `;
    
    // Add to discussion
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    discussion.messages.push({
      role: 'user',
      content: perspectivePrompt,
      timestamp: new Date()
    });
    
    // Generate response
    const claudePrompt = discussion.messages.map(msg => {
      if (msg.role === "system") return msg.content;
      return `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`;
    }).join("\n\n");
    
    const response = await claudeService.generateContent(claudePrompt);
    
    // Add assistant response
    discussion.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    discussion.lastActive = new Date();
    await discussion.save();
    
    res.json({
      success: true,
      response,
      audienceType
    });
  } catch (error) {
    console.error('Audience perspective error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// A/B test suggestion
router.post('/:discussionId/ab-test', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { pageId, elementType } = req.body;
    
    // Get current page content
    const pageDetails = await webflowService.getPageDetails(pageId);
    
    // Create prompt for A/B test suggestions
    const abTestPrompt = `
      Based on our discussion and the project goals, please suggest an A/B test 
      for the ${elementType} element on this page:
      
      Page title: ${pageDetails.title}
      Current content (Version A): ${JSON.stringify(pageDetails.content)}
      
      Please provide a Version B alternative and explain:
      1. The exact content for Version B
      2. The hypothesis being tested
      3. How to measure success
      4. What we might learn from this test
      
      Format your response as a structured recommendation, with clear sections for 
      the Version B content, hypothesis, metrics, and expected learnings.
    `;
    
    // Add to discussion
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    discussion.messages.push({
      role: 'user',
      content: abTestPrompt,
      timestamp: new Date()
    });
    
    // Generate response
    const claudePrompt = discussion.messages.map(msg => {
      if (msg.role === "system") return msg.content;
      return `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`;
    }).join("\n\n");
    
    const response = await claudeService.generateContent(claudePrompt);
    
    // Add assistant response
    discussion.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });
    
    discussion.lastActive = new Date();
    await discussion.save();
    
    res.json({
      success: true,
      response,
      discussionId
    });
  } catch (error) {
    console.error('A/B test suggestion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete discussion
router.delete('/:discussionId', authMiddleware, async (req, res) => {
  try {
    const { discussionId } = req.params;
    
    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(discussion.project);
    if (project.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Remove reference from project
    project.discussions = project.discussions.filter(id => id.toString() !== discussionId);
    await project.save();
    
    // Delete discussion
    await Discussion.findByIdAndDelete(discussionId);
    
    res.json({ success: true, message: 'Discussion deleted successfully' });
  } catch (error) {
    console.error('Delete discussion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
