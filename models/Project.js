const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true
  },
  summaryFile: {
    filename: String,
    path: String,
    originalName: String,
    uploadDate: Date
  },
  analysis: {
    projectName: String,
    description: String,
    targetAudience: String,
    keyMessages: [String],
    brandTone: String,
    colorPreferences: [String],
    contentStructure: String,
    raw: Object
  },
  siteId: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  discussions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion'
  }],
  appliedChanges: [{
    timestamp: Date,
    description: String,
    element: String,
    content: String,
    previousContent: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
