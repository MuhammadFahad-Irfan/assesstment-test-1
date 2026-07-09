import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // HTTP request logging. Use the concise coloured 'dev' format in
  // development and the Apache-style 'combined' format elsewhere. Lines are
  // routed through the Nest logger so they share formatting with the rest of
  // the app.
  const httpLogger = new Logger('HTTP');
  const morganFormat =
    (config.get<string>('NODE_ENV') ?? 'development') === 'production'
      ? 'combined'
      : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: { write: (message) => httpLogger.log(message.trim()) },
    }),
  );

  // Strip unknown properties and reject requests with extra fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = (config.get<string>('CORS_ORIGIN') ?? '*')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
