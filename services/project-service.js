const fs = require('fs');
const path = require('path');
const claudeService = require('./claude-service');
const Project = require('../models/Project');

async function analyzeProjectSummary(fileId) {
  try {
    const filePath = path.join(__dirname, '../uploads', fileId);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Use Claude to analyze the project summary
    const analysisPrompt = `
      Analyze this project summary and extract the following information:
      1. Project name and brief description
      2. Target audience
      3. Key messaging points
      4. Brand tone and voice
      5. Color preferences (if mentioned)
      6. Content structure needs
      
      Format your response as a JSON object with these keys: projectName, description, targetAudience, keyMessages, brandTone, colorPreferences, contentStructure.
      Only respond with valid JSON, nothing else. If information is not available, use null or empty arrays.
      
      Here's the project summary:
      ${fileContent}
    `;
    
    const analysisResponse = await claudeService.generateContent(analysisPrompt);
    console.log('Raw analysis response:', analysisResponse);
    
    // Try to extract just the JSON part from the response
    let jsonString = analysisResponse.trim();
    
    // Look for a JSON object in the response
    const jsonRegex = /(\{[\s\S]*\})/;
    const jsonMatch = jsonString.match(jsonRegex);
    
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1].trim();
      console.log('Extracted JSON:', jsonString);
    }
    
    // As a fallback, create a basic analysis structure
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Attempted to parse:', jsonString);
      
      // Return a basic analysis structure as fallback
      return {
        projectName: "Project from file",
        description: fileContent.substring(0, 200) + "...",
        targetAudience: "General audience",
        keyMessages: ["Key information extracted from file"],
        brandTone: "Professional",
        colorPreferences: [],
        contentStructure: "Standard"
      };
    }
  } catch (error) {
    console.error('Project analysis error:', error);
    throw new Error(`Failed to analyze project: ${error.message}`);
  }
}
   
    // As a fallback, create a basic analysis structure
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Attempted to parse:', jsonString);
      
      // Return a basic analysis structure as fallback
      return {
        projectName: "Project from file",
        description: fileContent.substring(0, 200) + "...",
        targetAudience: "General audience",
        keyMessages: ["Key information extracted from file"],
        brandTone: "Professional",
        colorPreferences: [],
        contentStructure: "Standard"
      };
    }
  } catch (error) {
    console.error('Project analysis error:', error);
    throw new Error(`Failed to analyze project: ${error.message}`);
  }
}


async function getProjectById(projectId) {
  return Project.findById(projectId).populate('createdBy', 'name email');
}

async function createProject(projectData) {
  const project = new Project(projectData);
  await project.save();
  return project;
}

async function updateProject(projectId, updateData) {
  return Project.findByIdAndUpdate(projectId, updateData, { new: true });
}

async function getAllProjects(userId) {
  return Project.find({ createdBy: userId }).sort({ updatedAt: -1 });
}

module.exports = {
  analyzeProjectSummary,
  getProjectById,
  createProject,
  updateProject,
  getAllProjects
};
