// api/index.ts
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

const server = express();

let initialized = false;
let initPromise: Promise<void> | null = null;

async function bootstrap() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    initialized = true;
  })();

  return initPromise;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}
