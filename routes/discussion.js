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
        
        Provide helpful recommendations about content, design, and structure.
        When suggesting changes, explain your reasoning and how it aligns with the project goals.
        Be specific in your recommendations and reference the project context.`
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
      content: message
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
      content: response
    });
    
    // Update last active time
    discussion.lastActive = new Date();
    await discussion.save();
    
    res.json({
      success: true,
      assistantMessage
