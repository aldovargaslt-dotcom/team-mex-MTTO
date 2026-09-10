import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
}

void bootstrap();
