import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseFilters,
} from '@nestjs/common';
import {
  Actor,
  TrustedAuthentication,
} from '../../auth/trusted-auth.decorator';
import { TrustedActor } from '../../auth/trusted-actor';
import { CheckSource } from '../work-order';
import { CanonicalOrdersService } from './canonical-orders.service';
import {
  ChecksQuery,
  CreateCheckDto,
  CreateMaintenanceDto,
  OrdersQuery,
  AssignCheckDto,
  CheckCommandDto,
  CheckConditionDto,
  ReserveEvidenceDto,
  RegisterEvidenceDto,
  ClassifyFindingDto,
  CompleteCheckDto,
  InvalidateCheckDto,
  ReviewCheckDto,
} from './canonical-orders.dto';
import { CanonicalHttpFilter } from './canonical-http.filter';

@Controller()
@TrustedAuthentication()
@UseFilters(CanonicalHttpFilter)
export class CanonicalOrdersController {
  constructor(private readonly service: CanonicalOrdersService) {}
  @Post('unidades/:unidadId/checks')
  create(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: CreateCheckDto,
    @Actor() actor: TrustedActor,
  ) {
    if (dto.source === CheckSource.DAILY_AUTOMATIC)
      throw new ForbiddenException(
        'DAILY_AUTOMATIC sólo admite el comando interno SYSTEM.',
      );
    return this.service.createCheck(
      unidadId,
      dto.source ?? CheckSource.LOGISTICS_MANUAL,
      actor,
    );
  }
  @Get('unidades/:unidadId/checks/active')
  active(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.active(unidadId, actor);
  }
  @Get('checks/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.detail(id, actor);
  }
  @Post('checks/:id/assign')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCheckDto, @Actor() actor: TrustedActor) {
    return this.service.assign(id, dto, actor);
  }
  @Post('checks/:id/claim')
  claim(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckCommandDto, @Actor() actor: TrustedActor) {
    return this.service.claim(id, dto, actor);
  }
  @Post('checks/:id/start')
  start(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckCommandDto, @Actor() actor: TrustedActor) {
    return this.service.start(id, dto, actor);
  }
  @Patch('checks/:id/condition')
  condition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CheckConditionDto, @Actor() actor: TrustedActor) {
    return this.service.condition(id, dto, actor);
  }
  @Get('checks/:id/condition-config')
  conditionConfig(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.conditionConfig(id, actor);
  }
  @Get('checks/:id/condition')
  conditionDetail(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.conditionDetail(id, actor);
  }
  @Post('checks/:id/evidence/uploads')
  reserveEvidence(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReserveEvidenceDto, @Actor() actor: TrustedActor) {
    return this.service.reserveEvidence(id, dto, actor);
  }
  @Post('checks/:id/evidence')
  registerEvidence(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RegisterEvidenceDto, @Actor() actor: TrustedActor) {
    return this.service.registerEvidence(id, dto, actor);
  }
  @Get('checks/:id/evidence')
  evidence(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.listEvidence(id, actor);
  }
  @Get('checks/:id/evidence/:evidenceId/content')
  async evidenceContent(@Param('id', ParseUUIDPipe) id: string, @Param('evidenceId', ParseUUIDPipe) evidenceId: string, @Actor() actor: TrustedActor) {
    const result = await this.service.evidenceContent(id, evidenceId, actor);
    return new StreamableFile(result.content, { type: result.mimeType, disposition: 'inline' });
  }
  @Get('checks/:id/signature/content')
  async signatureContent(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    const result = await this.service.signatureContent(id, actor);
    return new StreamableFile(result.content, { type: result.mimeType, disposition: 'inline' });
  }
  @Delete('checks/:id/evidence/:evidenceId')
  deleteEvidence(@Param('id', ParseUUIDPipe) id: string, @Param('evidenceId', ParseUUIDPipe) evidenceId: string, @Actor() actor: TrustedActor) {
    return this.service.deleteEvidence(id, evidenceId, actor);
  }
  @Get('checks/:id/findings')
  findings(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: TrustedActor) {
    return this.service.listFindings(id, actor);
  }
  @Patch('checks/:id/findings/:findingId')
  classifyFinding(@Param('id', ParseUUIDPipe) id: string, @Param('findingId', ParseUUIDPipe) findingId: string, @Body() dto: ClassifyFindingDto, @Actor() actor: TrustedActor) {
    return this.service.classifyFinding(id, findingId, dto, actor);
  }
  @Post('checks/:id/review')
  review(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewCheckDto, @Actor() actor: TrustedActor) {
    return this.service.review(id, dto, actor);
  }
  @Post('checks/:id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteCheckDto, @Actor() actor: TrustedActor) {
    return this.service.complete(id, dto, actor);
  }
  @Post('checks/:id/invalidations')
  invalidate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InvalidateCheckDto, @Actor() actor: TrustedActor) {
    return this.service.invalidate(id, dto, actor);
  }
  @Get('checks')
  checks(@Query() query: ChecksQuery, @Actor() actor: TrustedActor) {
    return this.service.list(actor, query, true);
  }
  @Post('unidades/:unidadId/mantenimiento-ordenes')
  maintenance(
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
    @Body() dto: CreateMaintenanceDto,
    @Actor() actor: TrustedActor,
  ) {
    return this.service.createMaintenance(unidadId, dto, actor);
  }
  @Get('mantenimiento-ordenes')
  list(@Query() query: OrdersQuery, @Actor() actor: TrustedActor) {
    return this.service.list(actor, query, false);
  }
}
