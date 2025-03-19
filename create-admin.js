require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const adminEmail = 'admin@automat.ing';
const adminPassword = 'securePassword123'; // Change this to a secure password

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
