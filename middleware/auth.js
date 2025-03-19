const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Grab token from Authorization header, query param, or cookie
    const token = 
      req.headers.authorization?.split(' ')[1] ||
      req.query.token ||
      req.cookies.auth_token;

    console.log(`Auth middleware checking token: ${token ? 'Token present' : 'No token'}`);

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully', decoded);

      // Confirm the user still exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.log(`User not found for ID: ${decoded.userId}`);
        return res.status(401).json({ message: 'User not found' });
      }

      console.log(`User found: ${user.email}`);
      req.user = {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientType: decoded.clientType || 'web',
      };

      // Apply combined role/clientType permissions
      req.permissions = getPermissions(req.user.role, req.user.clientType);
      console.log(`Permissions granted: ${req.permissions.join(', ')}`);

      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

function getPermissions(role, clientType) {
  const basePermissions = {
    admin:  ['read', 'write', 'delete', 'publish', 'ai-assist'],
    editor: ['read', 'write', 'ai-assist'],
    viewer: ['read']
  };

  const clientPermissions = {
    desktop: ['read', 'write', 'publish', 'ai-assist'],
    mobile:  ['read', 'limited-write'],
    api:     ['read', 'write', 'bulk-operations'],
    web:     ['read', 'write']
  };

  // Combine permissions for user role and client type
  return [
    ...(basePermissions[role]       || []),
    ...(clientPermissions[clientType] || [])
  ];
}
