const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration for standalone MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306, // Explicit port for standalone MySQL
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password', // Update with your MySQL root password
  database: process.env.DB_NAME || 'skywings_airlines',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Additional options for better compatibility with standalone MySQL
  multipleStatements: false,
  dateStrings: false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection (silent - errors will be caught when pool is actually used)
// This prevents duplicate connection messages in server.js

// Helper function to execute queries
async function query(sql, params = []) {
  try {
    const [results, fields] = await pool.execute(sql, params);
    // For INSERT queries, results is a ResultSetHeader with insertId
    // For SELECT queries, results is an array of rows
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get a single row
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results[0] || null;
}

module.exports = {
  pool,
  query,
  queryOne
};

