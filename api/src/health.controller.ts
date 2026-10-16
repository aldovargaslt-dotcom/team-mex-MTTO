import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { verifyLogisticaSchema } from './db/logistica-schema';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Preparación del esquema/captura de viajes; no crea datos',
  })
  async ready() {
    try {
      await this.db.transaction('REPEATABLE READ', (manager) =>
        verifyLogisticaSchema(manager),
      );
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        code: 'LOGISTICA_CAPTURE_NOT_READY',
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'Salud del servicio (sin autenticación)' })
  check() {
    return { status: 'ok', modulo: 'mantenimiento', slice: 1 };
  }
}
