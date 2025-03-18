// config/server.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || '*',
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};
