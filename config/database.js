// config/database.js
require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/webflow-mcp',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};
