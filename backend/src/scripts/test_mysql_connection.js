/**
 * Test MySQL Connection Script
 * Run this to verify your MySQL connection settings
 * Usage: node scripts/test_mysql_connection.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MySQL Connection...\n');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false
  };

  console.log('Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${config.password ? '***' : '(empty)'}\n`);

  try {
    // Test basic connection
    const connection = await mysql.createConnection(config);
    console.log('✅ Successfully connected to MySQL Server!\n');

    // Check MySQL version
    const [version] = await connection.execute('SELECT VERSION() as version');
    console.log(`📊 MySQL Version: ${version[0].version}\n`);

    // Check if database exists
    const [databases] = await connection.execute(
      "SHOW DATABASES LIKE 'skywings_airlines'"
    );
    
    if (databases.length > 0) {
      console.log('✅ Database "skywings_airlines" exists\n');
    } else {
      console.log('⚠️  Database "skywings_airlines" does not exist');
      console.log('   Run: mysql -u root -p -e "CREATE DATABASE skywings_airlines;"\n');
    }

    await connection.end();
    console.log('✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MySQL Server is running (not XAMPP MySQL)');
    console.error('2. Check your MySQL root password');
    console.error('3. Create a .env file with:');
    console.error('   DB_HOST=localhost');
    console.error('   DB_PORT=3306');
    console.error('   DB_USER=root');
    console.error('   DB_PASSWORD=your_password');
    console.error('   DB_NAME=skywings_airlines');
    process.exit(1);
  }
}

testConnection();

