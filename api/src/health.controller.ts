import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { inventoryCostsEnabled } from './inventario/cost-feature';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Salud del servicio (sin autenticación)' })
  check() {
    return {
      status: 'ok',
      modulo: 'mantenimiento',
      slice: 1,
      release: 'inventory-costs-unit-detail-v1',
      commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      inventoryCostsEnabled: inventoryCostsEnabled(),
    };
  }
}
