import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load env whether server is started from /server or monorepo root.
loadEnv();
loadEnv({
  path: path.resolve(process.cwd(), 'server/.env'),
  override: false,
});

/** Port from `node main.js --port 4001` / `nest start -- --port 4001` (Nest forwards args after `--`). */
function parsePortFromArgv(): number | undefined {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--port=')) {
      const n = Number(arg.slice('--port='.length));
      if (Number.isInteger(n) && n > 0) return n;
    }
    if (arg === '--port') {
      const n = Number(argv[i + 1]);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  return undefined;
}

function resolveRequestedPort(): number {
  const fromFlag = parsePortFromArgv();
  if (fromFlag !== undefined) return fromFlag;
  const fromEnv = process.env.PORT;
  if (fromEnv !== undefined && fromEnv !== '') {
    const n = Number(fromEnv);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return 4001;
}

async function listenWithPortFallback(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  startPort: number,
  maxAttempts = 10,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = startPort + attempt;
    try {
      await app.listen(port);
      if (attempt > 0) {
        console.warn(
          `Port ${startPort} is in use. Server started on fallback port ${port}.`,
        );
      }
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EADDRINUSE' || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prod = process.env.NODE_ENV === 'production';
  app.enableCors({
    // Dev: allow any origin (LAN IP, alternate hosts) when calling Nest directly.
    // Prod: keep a tight list; same-origin Next proxy is still preferred for the web app.
    origin: prod
      ? ['http://localhost:4000', 'http://127.0.0.1:4000']
      : true,
  });
  const requestedPort = resolveRequestedPort();
  await listenWithPortFallback(app, requestedPort);
}
bootstrap();
