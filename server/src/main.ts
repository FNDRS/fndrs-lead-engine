import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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
        // eslint-disable-next-line no-console
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
  app.enableCors({
    origin: ['http://localhost:3000'],
  });
  const requestedPort = Number(process.env.PORT ?? 3001);
  await listenWithPortFallback(app, requestedPort);
}
bootstrap();
