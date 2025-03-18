// config/index.js
const database = require('./database');
const auth = require('./auth');
const api = require('./api');
const server = require('./server');

module.exports = {
  database,
  auth,
  api,
  server
};
