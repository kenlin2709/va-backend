import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow specific origins for development and production
  app.enableCors({
    origin: [
      'http://localhost:4200', // Local Angular dev server
      'https://va-ecru.vercel.app', // Production deployment
    ],
    credentials: true, // Allow credentials
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
