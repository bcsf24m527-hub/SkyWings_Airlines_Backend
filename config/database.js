const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

// Database configuration for standalone MySQL and Render
const dbConfig = {
  host: process.env.Host,
  port: process.env.Port || 3306,
  user: process.env.User,
  password: process.env.Password,
  database: process.env.Database || 'skywings_airlines',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Additional options for better compatibility with standalone MySQL and Render
  multipleStatements: false,
  dateStrings: false,
  namedPlaceholders: true
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

