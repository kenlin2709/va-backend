import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// ⚠️ 注意：这里一定是 dist
import { AppModule } from '../dist/app.module';

const server = express();
let isInitialized = false;

async function bootstrap() {
  if (isInitialized) return;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  await app.init();

  isInitialized = true;
}

bootstrap();

export default server;