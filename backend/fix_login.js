#!/usr/bin/env node

/**
 * Fix Admin Login Issue
 * This script updates the default admin and user passwords with proper bcrypt hashes
 * Run this if you can't login with the default credentials
 * 
 * Usage: node fix_login.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixLoginIssue() {
  let connection;
  
  try {
    console.log('🔧 Fixing login issue...\n');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'skywings_airlines'
    });

    console.log('✅ Connected to database: skywings_airlines');

    // Generate proper bcrypt hashes
    console.log('\n🔐 Generating secure password hashes...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    console.log('✅ Hashes generated');

    // Check if users exist
    console.log('\n📋 Checking users...');
    const [users] = await connection.execute('SELECT user_id, email, role FROM users WHERE email IN (?, ?)', 
      ['admin@skywings.com', 'user@skywings.com']
    );

    if (users.length === 0) {
      console.log('❌ No default users found!');
      console.log('Creating default users...\n');

      // Insert admin user
      await connection.execute(
        `INSERT INTO users (first_name, last_name, email, password, phone, role, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Admin', 'User', 'admin@skywings.com', adminHash, '+92 333 123456', 'admin', 'active']
      );
      console.log('✅ Created admin user (admin@skywings.com)');

      // Insert regular user
      await connection.execute(
        `INSERT INTO users (first_name, last_name, email, password, phone, role, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Hassaan', 'Ahmad', 'user@skywings.com', userHash, '+92 333 123457', 'user', 'active']
      );
      console.log('✅ Created regular user (user@skywings.com)');
    } else {
      console.log(`Found ${users.length} users:\n`);
      
      // Update admin password
      const adminUser = users.find(u => u.email === 'admin@skywings.com');
      if (adminUser) {
        await connection.execute(
          'UPDATE users SET password = ? WHERE user_id = ?',
          [adminHash, adminUser.user_id]
        );
        console.log('✅ Updated admin password');
      }

      // Update user password
      const regularUser = users.find(u => u.email === 'user@skywings.com');
      if (regularUser) {
        await connection.execute(
          'UPDATE users SET password = ? WHERE user_id = ?',
          [userHash, regularUser.user_id]
        );
        console.log('✅ Updated user password');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 LOGIN ISSUE FIXED!\n');
    console.log('You can now login with:');
    console.log('  Admin: admin@skywings.com / admin123');
    console.log('  User:  user@skywings.com / user123\n');
    console.log('Next steps:');
    console.log('  1. Stop the server (Ctrl+C)');
    console.log('  2. Run: npm start');
    console.log('  3. Try logging in again');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MySQL is running');
    console.error('2. Verify database credentials in .env');
    console.error('3. Check if database "skywings_airlines" exists');
    console.error('4. Run: mysql -u root -p < database/schema.sql');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixLoginIssue();
