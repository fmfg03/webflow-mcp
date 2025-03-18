const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || 
                  req.query.token ||
                  req.cookies.auth_token;
                  
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to check if token is still valid
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientType: decoded.clientType || 'web'
    };
    
    // Add permissions based on client type and role
    req.permissions = getPermissions(req.user.role, req.user.clientType);
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

function getPermissions(role, clientType) {
  const basePermissions = {
    'admin': ['read', 'write', 'delete', 'publish', 'ai-assist'],
    'editor': ['read', 'write', 'ai-assist'],
    'viewer': ['read']
  };
  
  const clientPermissions = {
    'desktop': ['read', 'write', 'publish', 'ai-assist'],
    'mobile': ['read', 'limited-write'],
    'api': ['read', 'write', 'bulk-operations'],
    'web': ['read', 'write']
  };
  
  // Combine permissions from role and client type
  return [...(basePermissions[role] || []), ...(clientPermissions[clientType] || [])];
}
