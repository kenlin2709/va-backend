// Vercel serverless function that runs the actual NestJS app
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { ValidationPipe } = require('@nestjs/common');

let nestApp;
let isInitializing = false;

async function getNestApp() {
  if (nestApp && !isInitializing) {
    return nestApp;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return nestApp;
  }

  isInitializing = true;

  try {
    console.log('Initializing NestJS app for Vercel...');

    nestApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'], // Reduce logging in serverless
    });

    // Enable CORS for frontend
    nestApp.enableCors({
      origin: [
        'http://localhost:4200',
        'https://va-ecru.vercel.app'
      ],
      credentials: true,
    });

    // Apply global pipes
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    console.log('NestJS app initialized successfully');

  } catch (error) {
    console.error('Failed to initialize NestJS app:', error);
    isInitializing = false;
    throw error;
  }

  isInitializing = false;
  return nestApp;
}

// Serverless function handler
module.exports = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    const app = await getNestApp();

    // Get the Express instance from NestJS
    const expressApp = app.getHttpAdapter().getInstance();

    // Handle the request
    expressApp(req, res);

  } catch (error) {
    console.error('Serverless function error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
