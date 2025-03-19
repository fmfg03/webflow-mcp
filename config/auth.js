// config/auth.js
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || '5dbf0b94348be96a34a95d813ccf159f74e10a4e9d30d94612fb97f234b42808',
  jwtExpiration: '7d',
  saltRounds: 10
};
