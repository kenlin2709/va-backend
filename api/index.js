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

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Vape Lab API',
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Categories endpoint (critical for homepage)
app.get('/categories', (req, res) => {
  // Return mock categories data for the homepage to work
  const categories = [
    {
      _id: '1',
      name: 'All Products',
      description: 'All vape products',
      categoryImageUrl: '/images/hero/20250618456-2-scaled.jpg'
    },
    {
      _id: '2',
      name: 'Desserts',
      description: 'Sweet dessert flavors',
      categoryImageUrl: '/images/hero/20250618456-4-scaled.jpg'
    },
    {
      _id: '3',
      name: 'Energy',
      description: 'Energizing flavors',
      categoryImageUrl: '/images/hero/54846548.jpg'
    },
    {
      _id: '4',
      name: 'Fruit',
      description: 'Fresh fruit flavors',
      categoryImageUrl: '/images/hero/home-2-06-2048x1158.jpg'
    },
    {
      _id: '5',
      name: 'Tobacco',
      description: 'Classic tobacco flavors',
      categoryImageUrl: '/images/hero/20250618456-2-scaled.jpg'
    },
    {
      _id: '6',
      name: 'Party Mix',
      description: 'Fun party flavors',
      categoryImageUrl: '/images/hero/54846548.jpg'
    }
  ];

  res.json(categories);
});

// Products endpoint (for homepage products)
app.get('/products', (req, res) => {
  // Return empty array for now - frontend will handle fallbacks
  res.json([]);
});

// Auth endpoints
app.get('/auth/me', (req, res) => {
  res.status(401).json({ message: 'Not authenticated' });
});

app.post('/auth/login', (req, res) => {
  res.status(400).json({ message: 'Authentication not available in demo mode' });
});

app.post('/auth/register', (req, res) => {
  res.status(400).json({ message: 'Registration not available in demo mode' });
});

// Catch-all for other routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint not implemented in demo mode',
    path: req.path,
    method: req.method
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
