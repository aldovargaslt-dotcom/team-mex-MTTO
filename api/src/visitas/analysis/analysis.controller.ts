import { FileInterceptor } from '@nestjs/platform-express';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Header,
  Headers,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  Actor,
  TrustedAuthentication,
} from '../../auth/trusted-auth.decorator';
import { TrustedActor } from '../../auth/trusted-actor';
import { Roles } from '../../auth/roles.decorator';
import { Rol } from '../../auth/roles.enum';
import { MaintenanceAnalysisService } from './analysis.service';
import { MaintenanceAnalysisReportService } from './analysis-report.service';

@Controller('analisis-mantenimiento')
@TrustedAuthentication()
@Roles(Rol.SUPERVISOR, Rol.ADMIN_DIRECTIVO)
export class MaintenanceAnalysisController {
  constructor(
    private readonly core: MaintenanceAnalysisService,
    private readonly reports: MaintenanceAnalysisReportService,
  ) {}
  @Get('opciones')
  @Header('Cache-Control', 'private, no-store')
  @Header('Cache-Control', 'no-store')
  options(@Actor() actor: TrustedActor) {
    return this.reports.options(actor);
  }
  @Post('consultas') @Header('Cache-Control', 'private, no-store') query(
    @Actor() actor: TrustedActor,
    @Body() body: unknown,
  ) {
    return this.reports.create(actor, body);
  }
  @Get('consultas/:id/resumen')
  @Header('Cache-Control', 'private, no-store')
  summary(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.reports.view(actor, id, 'resumen');
  }
  @Get('consultas/:id/utilizacion')
  @Header('Cache-Control', 'private, no-store')
  utilization(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.reports.view(actor, id, 'utilizacion');
  }
  @Get('consultas/:id/costos')
  @Header('Cache-Control', 'private, no-store')
  costs(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.reports.view(actor, id, 'costos');
  }
  @Get('consultas/:id/tendencias')
  @Header('Cache-Control', 'private, no-store')
  trends(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.reports.view(actor, id, 'tendencias');
  }
  @Get('consultas/:id/registros')
  @Header('Cache-Control', 'private, no-store')
  records(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
    @Query('metricId') metricId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.records(actor, id, metricId, cursor, limit);
  }
  @Post('servicios-externos/:id/adjuntos')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  attach(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
    @Headers('idempotency-key') key: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    return this.core.attach(actor, key, id, file);
  }
  @Get('servicios-externos/:id/adjuntos/:attachmentId/enlace')
  @Header('Cache-Control', 'private, no-store')
  link(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.core.attachmentLink(actor, id, attachmentId);
  }
  @Get('servicios-externos/:id/adjuntos/:attachmentId')
  @Header('Cache-Control', 'private, no-store')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async attachment(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Query('token') token: string,
  ) {
    const { file, content } = await this.core.attachment(
      actor,
      id,
      attachmentId,
      token,
    );
    return new StreamableFile(content, {
      type: file.mime,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      length: file.bytes,
    });
  }
  @Get('lineas-documentales')
  @Header('Cache-Control', 'private, no-store')
  documentOptions(
    @Actor() actor: TrustedActor,
    @Query('unitId') unitId: string,
  ) {
    return this.core.documentOptions(actor, unitId);
  }
  @Get('catalogo-trabajos')
  @Header('Cache-Control', 'private, no-store')
  async catalogue(@Actor() actor: TrustedActor) {
    await this.core.ready(actor);
    return this.core.activeCatalogue(actor);
  }
  @Get('servicios-externos/:id')
  @Header('Cache-Control', 'private, no-store')
  service(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.core.getService(actor, id);
  }
  @Get('unidades/:id/contexto')
  @Header('Cache-Control', 'private, no-store')
  context(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.core.unitContext(actor, id);
  }
  @Get('costos-refacciones/:id')
  @Header('Cache-Control', 'private, no-store')
  part(@Actor() actor: TrustedActor, @Param('id') id: string) {
    return this.core.partDetail(actor, id);
  }
  @Post('servicios-externos')
  @Header('Cache-Control', 'private, no-store')
  createService(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    return this.core.createService(actor, key, body);
  }
  @Post('servicios-externos/:id/completar-costo')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  complete(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.core.completeCost(actor, key, id, body);
  }
  @Post('servicios-externos/:id/previsualizar-correccion')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  preview(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.core.previewCorrection(actor, id, body);
  }
  @Post('servicios-externos/:id/corregir')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  correct(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.core.correctService(actor, key, id, body);
  }
  @Get('horarios') @Header('Cache-Control', 'private, no-store') schedules(
    @Actor() actor: TrustedActor,
  ) {
    return this.core.schedules(actor);
  }
  @Post('horarios') @Header('Cache-Control', 'private, no-store') schedule(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    return this.core.setSchedule(actor, key, body);
  }
  @Post('catalogo-trabajos/:code/vigencias')
  @Header('Cache-Control', 'private, no-store')
  catalogueVersion(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Param('code') code: string,
    @Body() body: unknown,
  ) {
    return this.core.catalogueVersion(actor, key, code, body);
  }
  @Post('clasificaciones-costos')
  @Header('Cache-Control', 'private, no-store')
  classify(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    return this.core.classify(actor, key, body);
  }
  @Post('clasificaciones-costos/:id/revisiones')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  classificationRevision(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.core.classify(actor, key, body, id);
  }
  @Post('grupos-documentales')
  @Header('Cache-Control', 'private, no-store')
  document(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    return this.core.documentGroup(actor, key, body);
  }
  @Post('grupos-documentales/:id/revisiones')
  @Header('Cache-Control', 'private, no-store')
  @HttpCode(200)
  documentRevision(
    @Actor() actor: TrustedActor,
    @Headers('idempotency-key') key: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.core.documentGroup(actor, key, body, id);
  }
  @Get('comandos/:id') @Header('Cache-Control', 'private, no-store') receipt(
    @Actor() actor: TrustedActor,
    @Param('id') id: string,
  ) {
    return this.core.receipt(actor, id);
  }
}
