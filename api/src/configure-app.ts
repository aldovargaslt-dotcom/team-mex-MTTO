import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { QueryFailedFilter } from './common/query-failed.filter';

function firstValidationMessage(errors: ValidationError[]): string {
  for (const error of errors) {
    const messages = Object.values(error.constraints ?? {});
    if (messages[0]) {
      return messages[0];
    }
    if (error.children?.length) {
      const nested = firstValidationMessage(error.children);
      if (nested) {
        return nested;
      }
    }
  }
  return 'Los datos enviados no son válidos.';
}

export function configureApp(app: INestApplication): void {
  const withParser = app as INestApplication & {
    useBodyParser?: (type: string, options?: { limit?: string }) => void;
  };
  withParser.useBodyParser?.('json', { limit: '10mb' });

  const corsRaw = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin: !corsRaw
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : corsRaw === '*'
        ? true
        : corsRaw
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Role', 'X-User-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException(firstValidationMessage(errors)),
    }),
  );
  app.useGlobalFilters(new QueryFailedFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Team Mex — Mantenimiento')
    .setDescription(
      'API: kernel, visitas, Inventario, Andon y Notifications (schema-per-module). Autenticación stub por encabezado X-Role.',
    )
    .setVersion('3.0')
    .addApiKey({ type: 'apiKey', name: 'X-Role', in: 'header' }, 'X-Role')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-User-Id',
        in: 'header',
        description: 'Identificador opcional del usuario (stub).',
      },
      'X-User-Id',
    )
    .addSecurityRequirements('X-Role')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
}
