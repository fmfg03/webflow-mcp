const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');
const projectService = require('../services/project-service');
const claudeService = require('../services/claude-service');
const webflowService = require('../services/webflow-service');
const Project = require('../models/Project');
const Discussion = require('../models/Discussion');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Get all user projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await projectService.getAllProjects(req.user.id);
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single project
router.get('/:projectId', authMiddleware, async (req, res) => {
  try {
    console.log(`Fetching project with ID: ${req.params.projectId}`);
    const project = await projectService.getProjectById(req.params.projectId);
    
    if (!project) {
      console.log('Project not found');
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if user owns the project
    if (project.createdBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      console.log('Access denied - user does not own the project');
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    console.log('Project found, returning data');
    res.json({ success: true, project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload project summary
router.post('/upload', authMiddleware, upload.single('projectSummary'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Store file information
    const fileInfo = {
      filename: req.file.filename,
      path: req.file.path,
      originalName: req.file.originalname,
      uploadDate: new Date()
    };
    
    res.json({ 
      success: true, 
      fileId: req.file.filename,
      fileInfo,
      message: 'Project summary uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze project summary
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'FileId is required' });
    }
    
    // Analyze the project summary
    const analysis = await projectService.analyzeProjectSummary(fileId);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new project with analysis
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, summary, summaryFile, analysis, siteId } = req.body;
    
    const projectData = {
      name,
      summary,
      summaryFile,
      analysis,
      siteId,
      createdBy: req.user.id
    };
    
    const project = await projectService.createProject(projectData);
    
    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete project
router.delete('/:projectId', authMiddleware, async (req, res) => {
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
    
    // Delete associated discussions
    await Discussion.deleteMany({ project: projectId });
    
    // Delete project
    await Project.findByIdAndDelete(projectId);
    
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
