/**
 * Database Initialization Script
 * This script sets up proper password hashes for default users
 * Run this after importing the schema.sql file
 * 
 * Usage: node scripts/initialize_database.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'skywings_airlines'
    });

    console.log('✅ Connected to database');

    // Generate password hashes
    console.log('🔐 Generating password hashes...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);

    // Update admin password
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [adminHash, 'admin@skywings.com']
    );
    console.log('✅ Updated admin password (admin@skywings.com / admin123)');

    // Update user password
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [userHash, 'user@skywings.com']
    );
    console.log('✅ Updated user password (user@skywings.com / user123)');

    console.log('\n🎉 Database initialization complete!');
    console.log('\nDefault credentials:');
    console.log('  Admin: admin@skywings.com / admin123');
    console.log('  User:  user@skywings.com / user123');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run initialization
initializeDatabase();

