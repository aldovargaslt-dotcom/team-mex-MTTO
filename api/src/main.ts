import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { prepareUiRelease } from './db/prepare-ui-release';

async function bootstrap() {
  const applied = await prepareUiRelease();
  if (process.env.NODE_ENV === 'production') {
    console.log('UI release schema ready:', applied.length ? applied : 'already applied');
  }
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'API bootstrap failed');
  process.exitCode = 1;
});
