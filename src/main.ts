import { webcrypto } from 'node:crypto';
// @nestjs/schedule v6 uses crypto.randomUUID() which is only global on Node 19+
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

import * as http from 'http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3001);

  // Start a raw HTTP probe immediately so Railway healthchecks return 200
  // while NestFactory.create() (TypeORM connect + synchronize) is running.
  // NestJS takes over the port once fully initialized.
  const probe = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"starting","service":"portra-ai-api"}');
  });
  await new Promise<void>((resolve) => probe.listen(port, '0.0.0.0', resolve));
  console.log(`[startup] probe listening on port ${port}`);

  try {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000'];

    const app = await NestFactory.create(AppModule);

    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.enableCors({ origin: allowedOrigins, credentials: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Release the probe port, then hand off to NestJS on the same port.
    await new Promise<void>((resolve, reject) =>
      probe.close((err) => (err ? reject(err) : resolve())),
    );
    await app.listen(port, '0.0.0.0');
    console.log(`[startup] NestJS listening on port ${port}`);
  } catch (err) {
    console.error('[startup] Bootstrap failed:', err);
    probe.close();
    process.exit(1);
  }
}
bootstrap();
