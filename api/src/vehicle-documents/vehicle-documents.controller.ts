import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '../auth/roles.enum';
import { Actor, TrustedAuthentication } from '../auth/trusted-auth.decorator';
import { TrustedActor } from '../auth/trusted-actor';
import { CreateInsuranceVersionDto } from './vehicle-documents.dto';
import { VehicleDocumentsService } from './vehicle-documents.service';

@Controller('unidades/:unidadId/documentos/poliza-seguro')
@TrustedAuthentication()
export class VehicleDocumentsController {
  constructor(private readonly service: VehicleDocumentsService) {}

  @Get()
  @Roles(Rol.ADMIN_DIRECTIVO, Rol.LOGISTICA, Rol.MECANICO)
  current(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.currentInsurance(unidadId, actor);
  }

  @Post('versions')
  @Roles(Rol.ADMIN_DIRECTIVO)
  create(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: CreateInsuranceVersionDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.createInsuranceVersion(unidadId, dto, actor);
  }
}
