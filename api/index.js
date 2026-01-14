// Vercel serverless function
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://va-ecru.vercel.app'
  ],
  credentials: true,
}));

// JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vape Lab API',
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes - Add your NestJS routes here
app.get('/api', (req, res) => {
  res.json({
    message: 'Vape Lab API Endpoints',
    endpoints: [
      'GET /auth/me',
      'POST /auth/login',
      'POST /auth/register',
      'GET /products',
      'GET /categories',
      'GET /orders',
      'POST /orders',
      'GET /customers',
      'POST /referrals'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    statusCode: 500,
    message: 'Internal server error',
    error: err.message
  });
});

// Export for Vercel
module.exports = app;
