import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from 'src/app.module';

const server = express();

let isBootstrapped = false;

async function bootstrap() {
  if (isBootstrapped) return;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  await app.init();

  isBootstrapped = true;
}

bootstrap();

export default server;