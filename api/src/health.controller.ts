import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Salud del servicio (sin autenticación)' })
  check() {
    return { status: 'ok', modulo: 'mantenimiento', slice: 1 };
  }
}
