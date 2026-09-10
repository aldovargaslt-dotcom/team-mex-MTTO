import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { QueryFailedFilter } from './common/query-failed.filter';

export function configureApp(app: INestApplication): void {
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Role', 'X-User-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: () =>
        new BadRequestException('Los datos enviados no son válidos.'),
    }),
  );
  app.useGlobalFilters(new QueryFailedFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Team Mex — Mantenimiento')
    .setDescription(
      'API Slice 1: catálogo de tipos de vehículo, unidades y hub de mantenimiento. Autenticación stub por encabezado X-Role.',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-Role', in: 'header' },
      'X-Role',
    )
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
