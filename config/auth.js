// config/auth.js
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'your_very_secure_jwt_secret_please_change_in_production',
  jwtExpiration: '7d',
  saltRounds: 10
};
