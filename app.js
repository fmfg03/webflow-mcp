require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/auth');
const aiAssistantRoutes = require('./routes/ai-assistant');
const cmsRoutes = require('./routes/cms');
const projectRoutes = require('./routes/project');
const discussionRoutes = require('./routes/discussion');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
// In app.js, enhance the MongoDB connection section
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Connected to: ${process.env.MONGO_URI}`);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.error('Please check if MongoDB is running and the connection string is correct');
  });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Set up WebSocket events
io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session: ${sessionId}`);
  });
  
  socket.on('webflow-edit', async (data) => {
    // Process Webflow edit request
    // This will be implemented in the webflow service
    console.log('Webflow edit request received:', data);
    socket.emit('edit-result', { success: true, editId: data.editId, message: 'Edit processed' });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/discussion', discussionRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Webflow MCP Server is running');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
