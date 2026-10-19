import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { TrustedActor } from '../../auth/trusted-actor';
import { ObjectStoragePort } from '../checks/object-storage.port';
import { MaintenanceAnalysisScope } from '../../kernel/analysis-scope.service';
import { InventoryMaintenanceCostReadPort } from '../../inventario/maintenance-cost-read.port';
import { MaintenanceOrderFactsReadPort } from './order-facts-read.port';
import {
  ANALYSIS_ENTITIES,
  AnalysisCatalogVersion,
  AnalysisClassification,
  AnalysisCostClaim,
  AnalysisCostLine,
  AnalysisDocumentAllocation,
  AnalysisDocumentGroup,
  AnalysisDocumentRevision,
  AnalysisExternalService,
  AnalysisInvalidation,
  AnalysisReceipt,
  AnalysisSchedule,
  AnalysisScheduleScope,
  AnalysisServiceRevision,
  AnalysisWork,
} from './analysis.entity';
import {
  catalogue,
  ExternalServiceData,
  invalid,
  localMidnight,
  object,
  text,
  uuid,
  validateClaims,
  validateSchedule,
  validateService,
} from './analysis-rules';

export const analysisFlag = (kind: 'READ' | 'WRITE' | 'SCHEDULE') =>
  process.env[`MAINTENANCE_ANALYSIS_${kind}_ENABLED`] === 'true';
const canonical = (v: unknown): unknown =>
  v instanceof Date
    ? v.toISOString()
    : Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, value]) => [k, canonical(value)]),
          )
        : v;
export const analysisHash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');

@Injectable()
export class MaintenanceAnalysisService {
  private readonly configuredSecret =
    process.env.MAINTENANCE_ANALYSIS_SIGNING_SECRET;
  private readonly secret =
    this.configuredSecret && /^[A-Za-z0-9+/]{43}=$/.test(this.configuredSecret)
      ? Buffer.from(this.configuredSecret, 'base64')
      : randomBytes(32);
  signingKey(purpose: string) {
    return createHmac('sha256', this.secret).update(purpose).digest();
  }
  constructor(
    readonly db: DataSource,
    readonly scope: MaintenanceAnalysisScope,
    private readonly costs: InventoryMaintenanceCostReadPort,
    private readonly orders: MaintenanceOrderFactsReadPort,
    private readonly storage: ObjectStoragePort,
  ) {}
  async ready(
    actor: TrustedActor,
    kind: 'READ' | 'WRITE' | 'SCHEDULE' = 'READ',
  ) {
    this.scope.authorize(actor);
    if (!analysisFlag(kind))
      throw new ServiceUnavailableException({
        code: 'ANALYSIS_DISABLED',
        message: 'El análisis de mantenimiento aún no está habilitado.',
        details: {},
      });
    if (
      process.env.NODE_ENV === 'production' &&
      (!this.configuredSecret ||
        !/^[A-Za-z0-9+/]{43}=$/.test(this.configuredSecret))
    )
      throw new ServiceUnavailableException({
        code: 'ANALYSIS_SIGNING_UNAVAILABLE',
        message: 'Falta configurar la firma de consultas y previsualizaciones.',
        details: {},
      });
    const [tables] = await this.db.query(
      "SELECT bool_and(to_regclass('public.' || name) IS NOT NULL) AS ready FROM unnest($1::text[]) AS name",
      [
        ANALYSIS_ENTITIES.map(
          (entity) => this.db.getMetadata(entity).tableName,
        ),
      ],
    );
    if (!tables?.ready)
      throw new ServiceUnavailableException({
        code: 'ANALYSIS_SCHEMA_REQUIRED',
        message: 'Falta preparar el esquema de análisis.',
        details: {},
      });
  }
  async lock(m: EntityManager, key: string) {
    await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      `maintenance-analysis:${key}`,
    ]);
  }
  private async command(
    actor: TrustedActor,
    commandId: string,
    action: string,
    payload: unknown,
    work: (
      m: EntityManager,
    ) => Promise<{
      result: Record<string, unknown>;
      unitIds: string[];
      facilities: string[];
    }>,
    kind: 'WRITE' | 'SCHEDULE' = 'WRITE',
    admin = false,
  ) {
    await this.ready(actor, kind);
    this.scope.authorize(actor, admin);
    uuid(commandId);
    if (!/^[0-9a-f-]{14}4/i.test(commandId))
      invalid('La clave de operación debe ser UUIDv4.');
    const hash = analysisHash({ action, payload });
    return this.db.transaction(async (m) => {
      await this.lock(m, `command:${actor.subject}:${commandId}`);
      const receipt = await m.findOneBy(AnalysisReceipt, {
        subject: actor.subject,
        commandId,
      });
      if (receipt) {
        if (!receipt.facilities.every((f) => actor.facilityScopes.includes(f)))
          throw new NotFoundException('Operación no disponible.');
        await this.scope.assertUnits(m, actor, receipt.unitIds);
        if (receipt.requestHash !== hash)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'La clave ya se utilizó con otros datos.',
            details: {},
          });
        return receipt.result;
      }
      const outcome = await work(m);
      await m.save(AnalysisReceipt, {
        subject: actor.subject,
        commandId,
        requestHash: hash,
        unitIds: outcome.unitIds,
        facilities: outcome.facilities,
        result: outcome.result,
        registeredAt: new Date(),
      });
      return outcome.result;
    });
  }
  async receipt(actor: TrustedActor, id: string) {
    await this.ready(actor);
    uuid(id);
    return this.db.transaction(async (m) => {
      const row = await m.findOneBy(AnalysisReceipt, {
        subject: actor.subject,
        commandId: id,
      });
      if (
        !row ||
        !row.facilities.every((f) => actor.facilityScopes.includes(f))
      )
        throw new NotFoundException('Operación no disponible.');
      await this.scope.assertUnits(m, actor, row.unitIds);
      return row.result;
    });
  }
  async service(actor: TrustedActor, id: string, m = this.db.manager) {
    this.scope.authorize(actor);
    uuid(id);
    const row = await m.findOneBy(AnalysisExternalService, { id });
    if (!row || !actor.facilityScopes.includes(row.facilityId))
      throw new NotFoundException('Servicio no disponible.');
    const [unit] = await this.scope.assertUnits(m, actor, [row.unitId]);
    if (unit.facilityId !== row.facilityId)
      throw new NotFoundException('El alcance de la unidad cambió.');
    return row;
  }
  async getService(actor: TrustedActor, id: string) {
    await this.ready(actor);
    return this.db.transaction(async (m) => {
      const service = await this.service(actor, id, m);
      return {
        service,
        revisions: await m.find(AnalysisServiceRevision, {
          where: { serviceId: id },
          order: { version: 'DESC' },
        }),
      };
    });
  }
  async attach(
    actor: TrustedActor,
    key: string,
    id: string,
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    if (!file || file.size > 10 * 1024 * 1024 || !file.size)
      invalid('Adjunte un archivo de hasta 10 MiB.');
    const signature = file.buffer.subarray(0, 8),
      mime =
        signature.subarray(0, 5).toString() === '%PDF-'
          ? 'application/pdf'
          : signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? 'image/png'
            : signature[0] === 255 &&
                signature[1] === 216 &&
                signature[2] === 255
              ? 'image/jpeg'
              : null;
    if (!mime || mime !== file.mimetype)
      invalid('Solo PDF, JPEG o PNG con formato verificable.');
    const hash = createHash('sha256').update(file.buffer).digest('hex'),
      name = text(
        file.originalname.replace(/[\\/\x00-\x1f]/g, '_'),
        'nombre',
        160,
      );
    return this.command(
      actor,
      key,
      `attachment:${id}`,
      { hash, name, mime, size: file.size },
      async (m) => {
        await this.lock(m, `service:${uuid(id)}`);
        const row = await this.service(actor, id, m);
        if ((row.data.attachments?.length ?? 0) >= 5)
          invalid('Máximo cinco adjuntos por servicio.');
        const attachmentId = randomUUID(),
          temporary = `maintenance/${id}/temporary/${attachmentId}`,
          final = `maintenance/${id}/evidence/${attachmentId}`;
        await this.storage.putTemporary(temporary, file.buffer);
        await this.storage.referenceImmutableObject(temporary, final);
        const attachment = {
          id: attachmentId,
          name,
          mime,
          bytes: file.size,
          sha256: hash,
        };
        row.data.attachments = [...(row.data.attachments ?? []), attachment];
        row.version++;
        await this.persistService(
          m,
          actor,
          row,
          'Adjuntar comprobante privado',
        );
        return {
          result: { attachment, version: row.version },
          unitIds: [row.unitId],
          facilities: [row.facilityId],
        };
      },
    );
  }
  async attachmentLink(actor: TrustedActor, id: string, attachmentId: string) {
    await this.ready(actor);
    const row = await this.service(actor, id);
    uuid(attachmentId);
    if (!row.data.attachments?.some((x) => x.id === attachmentId))
      throw new NotFoundException('Adjunto no disponible.');
    return {
      token: this.sign({
        subject: actor.subject,
        id,
        attachmentId,
        expiresAt: Date.now() + 60000,
      }),
    };
  }
  async attachment(
    actor: TrustedActor,
    id: string,
    attachmentId: string,
    signed: string,
  ) {
    await this.ready(actor);
    const token = this.unsign(signed),
      row = await this.service(actor, id);
    if (
      token.subject !== actor.subject ||
      token.id !== id ||
      token.attachmentId !== attachmentId ||
      Number(token.expiresAt) < Date.now()
    )
      throw new NotFoundException('Enlace vencido.');
    const file = row.data.attachments?.find((x) => x.id === uuid(attachmentId));
    if (!file) throw new NotFoundException('Adjunto no disponible.');
    const content = await this.storage.readPrivate(
      `maintenance/${id}/evidence/${attachmentId}`,
    );
    if (createHash('sha256').update(content).digest('hex') !== file.sha256)
      throw new ServiceUnavailableException(
        'No se pudo verificar el comprobante.',
      );
    return { file, content };
  }
  async activeCatalogue(actor: TrustedActor, m = this.db.manager) {
    this.scope.authorize(actor);
    const versions = await m.find(AnalysisCatalogVersion, {
      order: { version: 'DESC' },
    });
    return catalogue().map((x) => {
      const current = versions.find((v) => v.code === x.code);
      return {
        ...x,
        active: current?.active ?? true,
        version: current?.version ?? 0,
      };
    });
  }
  async unitContext(actor: TrustedActor, id: string) {
    await this.ready(actor);
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const [unit] = await this.scope.assertUnits(m, actor, [uuid(id)]);
      const orders = (await this.orders.read(m, actor, [id])).filter((x) =>
        ['PREVENTIVE', 'CORRECTIVE'].includes(x.maintenanceType),
      );
      const parts = await this.costs.read(
        m,
        actor,
        [id],
        new Date(Date.now() - 366 * 86400000),
        new Date(),
      );
      const claims = await m.find(AnalysisCostClaim, { where: { unitId: id } });
      return {
        unit,
        orders,
        externalParts: parts
          .filter((x) => x.kind === 'EXTERNAL')
          .map((op) => {
            const occupied = claims
              .filter((x) => x.sourceOpId === op.id)
              .sort((a, b) => a.from - b.from);
            const availableRanges: { from: number; to: number }[] = [];
            let start = 0;
            for (const range of occupied) {
              if (range.from > start)
                availableRanges.push({ from: start, to: range.from });
              start = Math.max(start, range.to);
            }
            if (start < op.qty)
              availableRanges.push({ from: start, to: op.qty });
            return {
              id: op.id,
              version: op.version,
              qty: op.qty,
              netCents: op.netCents,
              effectiveAt: op.effectiveAt,
              label: op.supplierName || 'Compra externa de refacción',
              availableRanges,
            };
          }),
      };
    });
  }
  async partDetail(actor: TrustedActor, id: string) {
    await this.ready(actor);
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const [operation] = await this.costs.references(m, actor, [uuid(id)]);
      if (!operation) throw new NotFoundException('Consumo no disponible.');
      return {
        operation,
        classifications: await m.find(AnalysisClassification, {
          where: { sourceOpId: id },
          order: { revision: 'DESC' },
        }),
      };
    });
  }
  private async verifyService(
    m: EntityManager,
    actor: TrustedActor,
    data: ExternalServiceData,
    id: string,
    previous?: AnalysisExternalService,
  ) {
    const [unit] = await this.scope.assertUnits(m, actor, [data.unitId]);
    if (
      previous &&
      (previous.unitId !== data.unitId ||
        previous.facilityId !== unit.facilityId)
    )
      invalid('No se puede trasladar un servicio a otra unidad.');
    if (data.stopRef)
      throw new ServiceUnavailableException({
        code: 'STOP_SOURCE_UNAVAILABLE',
        message:
          'La vinculación de paradas requiere su fuente operativa; registre la orden o unidad.',
        details: {},
      });
    const orders = await this.orders.read(m, actor, [data.unitId]);
    const order = data.orderId
      ? orders.find((x) => x.id === data.orderId)
      : undefined;
    if (
      data.orderId &&
      (!order || !['PREVENTIVE', 'CORRECTIVE'].includes(order.maintenanceType))
    )
      invalid('Orden de mantenimiento no disponible.');
    if (order)
      data.maintenanceType =
        order.maintenanceType as ExternalServiceData['maintenanceType'];
    const cat = await this.activeCatalogue(actor, m);
    for (const line of data.workLines) {
      const old = previous?.data.workLines.find((x) => x.id === line.id);
      if (!cat.find((x) => x.code === line.workCode)?.active && !old)
        invalid('El trabajo ya no está activo en el catálogo.');
      if (line.orderWorkRef) {
        const ref = order?.works.find(
          (x) => x.id === line.orderWorkRef && x.categoria === line.system,
        );
        if (!ref)
          invalid('El trabajo vinculado no pertenece a la orden y sistema.');
        line.interventionId = order!.id;
      } else line.interventionId = old?.interventionId ?? id;
    }
    for (const ref of data.costLines.map((x) => x.id).sort())
      await this.lock(m, `cost-line:${ref}`);
    for (const ref of data.workLines.map((x) => x.id).sort())
      await this.lock(m, `work:${ref}`);
    for (const line of data.costLines) {
      const existing = await m.findOneBy(AnalysisCostLine, { id: line.id });
      if (existing && existing.serviceId !== id)
        invalid('Referencia de línea no disponible.');
    }
    for (const work of data.workLines) {
      const existing = await m.findOneBy(AnalysisWork, { id: work.id });
      if (existing && existing.serviceId !== id)
        invalid('Referencia de trabajo no disponible.');
    }
    const all = data.costLines.flatMap((x) => x.claims);
    for (const ref of [...new Set(all.map((x) => x.sourceOpId))].sort())
      await this.lock(m, `claim:${ref}`);
    const refs = await this.costs.references(m, actor, [
      ...new Set(all.map((x) => x.sourceOpId)),
    ]);
    const otherClaims = all.length
      ? await m.find(AnalysisCostClaim, {
          where: { sourceOpId: In(all.map((x) => x.sourceOpId)) },
        })
      : [];
    validateClaims(
      [...otherClaims.filter((x) => x.serviceId !== id), ...all],
      refs,
      data.unitId,
    );
    return unit;
  }
  private async persistService(
    m: EntityManager,
    actor: TrustedActor,
    row: AnalysisExternalService,
    reason: string,
  ) {
    await m.save(AnalysisExternalService, row);
    await m.save(AnalysisServiceRevision, {
      serviceId: row.id,
      version: row.version,
      data: JSON.parse(JSON.stringify(row)) as Record<string, unknown>,
      actor: actor.subject,
      reason,
      registeredAt: new Date(),
    });
    const oldLines = await m.find(AnalysisCostLine, {
      where: { serviceId: row.id },
    });
    const groups = oldLines.length
      ? await m.find(AnalysisDocumentAllocation, {
          where: { lineId: In(oldLines.map((x) => x.id)) },
        })
      : [];
    if (
      groups.some(
        (allocation) =>
          !row.data.costLines.some((line) => line.id === allocation.lineId),
      )
    )
      throw new ConflictException({
        code: 'RECONCILIATION_REQUIRED',
        message:
          'Revise la distribución documental antes de quitar una línea vinculada.',
        details: {},
      });
    // Document allocations retain their prior lineVersion as explicit reconciliation evidence.
    // Service locks serialize changes; a document revision must read the current lines again.

    await m.delete(AnalysisCostClaim, { serviceId: row.id });
    await m.delete(AnalysisWork, { serviceId: row.id });
    const retained = new Set(groups.map((x) => x.lineId));
    for (const old of oldLines)
      if (
        !retained.has(old.id) &&
        !row.data.costLines.some((x) => x.id === old.id)
      )
        await m.delete(AnalysisCostLine, { id: old.id });
    for (const line of row.data.costLines) {
      await m.save(AnalysisCostLine, {
        id: line.id,
        serviceId: row.id,
        version:
          oldLines.find(
            (x) =>
              x.id === line.id && analysisHash(x.data) === analysisHash(line),
          )?.version ?? row.version,
        system: line.system,
        netCents: line.money?.netCents ?? null,
        taxCents: line.money?.taxCents ?? null,
        grossCents: line.money?.totalCents ?? null,
        state: line.money ? 'RECORDED' : 'PENDING',
        data: line as unknown as Record<string, unknown>,
      });
      for (const claim of line.claims)
        await m.insert(AnalysisCostClaim, {
          id: randomUUID(),
          serviceId: row.id,
          serviceLineId: line.id,
          unitId: row.unitId,
          ...claim,
        });
    }
    for (const work of row.data.workLines)
      await m.insert(AnalysisWork, {
        id: work.id,
        serviceId: row.id,
        system: work.system,
        kind: work.workKind,
        interventionId: work.interventionId,
        conclusionDate: row.performedOn,
        data: work as unknown as Record<string, unknown>,
      });
    await m.insert(AnalysisInvalidation, {
      id: randomUUID(),
      unitId: row.unitId,
      facilityId: row.facilityId,
      sourceRef: row.id,
      version: row.version,
      createdAt: new Date(),
    });
  }
  async createService(actor: TrustedActor, key: string, input: unknown) {
    return this.command(actor, key, 'create-service', input, async (m) => {
      const id = randomUUID(),
        data = validateService(input),
        unit = await this.verifyService(m, actor, data, id);
      const row = m.create(AnalysisExternalService, {
        id,
        unitId: data.unitId,
        facilityId: unit.facilityId,
        version: 1,
        performedOn: data.performedOn,
        providerName: data.providerName,
        maintenanceType: data.maintenanceType,
        data,
        registeredAt: new Date(),
        registeredBy: actor.subject,
      });
      await this.persistService(m, actor, row, 'Registro inicial');
      return {
        result: { service: row },
        unitIds: [unit.id],
        facilities: [unit.facilityId],
      };
    });
  }
  private version(actual: number, requested: unknown) {
    if (String(actual) !== String(requested))
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'El registro cambió. Vuelva a consultarlo.',
        details: {},
      });
  }
  private draft(row: AnalysisExternalService) {
    const editable = { ...row.data };
    delete editable.attachments;
    return {
      ...editable,
      costLines: row.data.costLines.map((l) => ({
        ...l,
        money: l.money
          ? {
              state: 'RECORDED',
              inputTotalCents: l.money.inputTotalCents,
              currency: 'MXN',
              taxMode: l.money.taxMode,
              taxTreatment: l.money.taxTreatment,
              rateBps: l.money.rateBps,
            }
          : { state: 'PENDING' },
      })),
    };
  }
  async completeCost(
    actor: TrustedActor,
    key: string,
    id: string,
    input: unknown,
  ) {
    return this.command(actor, key, `complete-cost:${id}`, input, async (m) => {
      const b = object(input, ['expectedVersion', 'costLines']);
      await this.lock(m, `service:${uuid(id)}`);
      const row = await this.service(actor, id, m);
      this.version(row.version, b.expectedVersion);
      if (
        !Array.isArray(b.costLines) ||
        b.costLines.length !== row.data.costLines.length
      )
        invalid('Conserve todas las líneas del servicio.');
      const data = validateService({
        ...this.draft(row),
        costLines: b.costLines,
      });
      for (const original of row.data.costLines) {
        const next = data.costLines.find((x) => x.id === original.id);
        if (
          !next ||
          original.system !== next.system ||
          original.mode !== next.mode ||
          original.workRef !== next.workRef ||
          analysisHash(original.claims) !== analysisHash(next.claims) ||
          (original.money &&
            analysisHash(original.money) !== analysisHash(next.money))
        )
          invalid(
            'Completar solo permite agregar importes pendientes; use corrección para otros cambios.',
          );
      }
      if (
        !row.data.costLines.some(
          (line) =>
            !line.money && data.costLines.find((x) => x.id === line.id)?.money,
        )
      )
        invalid('No hay un costo pendiente que completar.');
      const unit = await this.verifyService(m, actor, data, id, row);
      row.data = { ...data, attachments: row.data.attachments };
      row.version++;
      await this.persistService(m, actor, row, 'Completar costo pendiente');
      return {
        result: { service: row },
        unitIds: [unit.id],
        facilities: [unit.facilityId],
      };
    });
  }
  private sign(value: Record<string, unknown>) {
    const body = Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${body}.${createHmac('sha256', this.secret).update(body).digest('base64url')}`;
  }
  private unsign(token: unknown) {
    if (typeof token !== 'string') invalid('Solicite una previsualización.');
    const [body, signature] = token.split('.');
    const expected = createHmac('sha256', this.secret)
      .update(body ?? '')
      .digest('base64url');
    if (
      !signature ||
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      throw new ConflictException({
        code: 'PREVIEW_STALE',
        message: 'La previsualización ya no es válida.',
        details: {},
      });
    try {
      return object(JSON.parse(Buffer.from(body, 'base64url').toString()));
    } catch {
      return invalid('Previsualización inválida.');
    }
  }
  async previewCorrection(actor: TrustedActor, id: string, input: unknown) {
    await this.ready(actor, 'WRITE');
    this.scope.authorize(actor, true);
    const b = object(input, ['expectedVersion', 'service', 'reason']);
    const reason = text(b.reason, 'motivo de corrección');
    return this.db.transaction(async (m) => {
      const previous = await this.service(actor, id, m);
      this.version(previous.version, b.expectedVersion);
      const next = validateService(b.service);
      await this.verifyService(m, actor, next, id, previous);
      return {
        before: previous.data,
        after: next,
        previewToken: this.sign({
          subject: actor.subject,
          id,
          version: previous.version,
          hash: analysisHash({ service: b.service, reason }),
          expiresAt: Date.now() + 600000,
        }),
      };
    });
  }
  async correctService(
    actor: TrustedActor,
    key: string,
    id: string,
    input: unknown,
  ) {
    return this.command(
      actor,
      key,
      `correct-service:${id}`,
      input,
      async (m) => {
        const b = object(input, [
          'expectedVersion',
          'service',
          'reason',
          'previewToken',
        ]);
        const reason = text(b.reason, 'motivo de corrección');
        await this.lock(m, `service:${uuid(id)}`);
        const row = await this.service(actor, id, m);
        this.version(row.version, b.expectedVersion);
        const token = this.unsign(b.previewToken);
        if (
          token.subject !== actor.subject ||
          token.id !== id ||
          token.version !== row.version ||
          Number(token.expiresAt) < Date.now() ||
          token.hash !== analysisHash({ service: b.service, reason })
        )
          throw new ConflictException({
            code: 'PREVIEW_STALE',
            message: 'Solicite una previsualización actualizada.',
            details: {},
          });
        const data = validateService(b.service),
          unit = await this.verifyService(m, actor, data, id, row);
        row.data = { ...data, attachments: row.data.attachments };
        row.performedOn = data.performedOn;
        row.providerName = data.providerName;
        row.maintenanceType = data.maintenanceType;
        row.version++;
        await this.persistService(m, actor, row, reason);
        return {
          result: { service: row },
          unitIds: [unit.id],
          facilities: [unit.facilityId],
        };
      },
      'WRITE',
      true,
    );
  }
  async schedules(actor: TrustedActor) {
    await this.ready(actor);
    return this.db.manager.find(AnalysisSchedule, {
      where: { facilityId: In(actor.facilityScopes) },
      order: { validFrom: 'DESC' },
    });
  }
  async setSchedule(actor: TrustedActor, key: string, input: unknown) {
    return this.command(
      actor,
      key,
      'set-schedule',
      input,
      async (m) => {
        const b = object(input, [
          'facilityId',
          'scope',
          'scopeRef',
          'expectedVersion',
          'validFrom',
          'schedule',
          'reason',
        ]);
        const facilityId = text(b.facilityId, 'instalación', 160),
          scope = String(b.scope),
          scopeRef = scope === 'GENERAL' ? 'GENERAL' : uuid(b.scopeRef);
        if (!actor.facilityScopes.includes(facilityId))
          throw new NotFoundException('Instalación no disponible.');
        if (!['GENERAL', 'TYPE', 'UNIT'].includes(scope))
          invalid('Alcance de horario inválido.');
        const units = await this.scope.units(m, actor, {
          facilityIds: [facilityId],
          ...(scope === 'UNIT' ? { unitIds: [scopeRef] } : {}),
          ...(scope === 'TYPE' ? { unitTypeIds: [scopeRef] } : {}),
        });
        if (scope !== 'GENERAL' && !units.length)
          invalid('No hay unidades de ese alcance en la instalación.');
        const data = validateSchedule(b.schedule),
          reason = text(b.reason, 'motivo del horario');
        await this.lock(m, `schedule:${facilityId}:${scope}:${scopeRef}`);
        let resource = await m.findOneBy(AnalysisScheduleScope, {
          facilityId,
          scope,
          scopeRef,
        });
        this.version(resource?.revision ?? 0, b.expectedVersion);
        const now = new Date(),
          validFrom = b.validFrom
            ? /^\d{4}-\d{2}-\d{2}$/.test(String(b.validFrom))
              ? localMidnight(String(b.validFrom))
              : new Date(String(b.validFrom))
            : now;
        if (!Number.isFinite(validFrom.getTime()) || validFrom < now)
          invalid(
            'El horario no puede aplicarse al pasado; deje la fecha vacía para iniciar ahora.',
          );
        if (!resource)
          resource = m.create(AnalysisScheduleScope, {
            id: randomUUID(),
            facilityId,
            scope,
            scopeRef,
            revision: 0,
          });
        const existing = await m.find(AnalysisSchedule, {
          where: { scopeId: resource.id },
          order: { validFrom: 'ASC' },
        });
        if (existing.some((x) => x.validFrom >= validFrom))
          throw new ConflictException({
            code: 'VERSION_CONFLICT',
            message:
              'Ya existe una programación posterior. Revise sus vigencias.',
            details: {},
          });
        const previous = existing.find((x) => !x.validTo);
        if (previous) {
          previous.validTo = validFrom;
          await m.save(AnalysisSchedule, previous);
        }
        resource.revision++;
        await m.save(AnalysisScheduleScope, resource);
        const rule = await m.save(AnalysisSchedule, {
          id: randomUUID(),
          scopeId: resource.id,
          facilityId,
          scope,
          scopeRef,
          version: resource.revision,
          validFrom,
          validTo: null,
          data,
          actor: actor.subject,
          reason,
        });
        await m.insert(AnalysisInvalidation, {
          id: randomUUID(),
          unitId: scope === 'UNIT' ? scopeRef : null,
          facilityId,
          sourceRef: rule.id,
          version: rule.version,
          createdAt: now,
        });
        return {
          result: { rule },
          unitIds: scope === 'UNIT' ? [scopeRef] : [],
          facilities: [facilityId],
        };
      },
      'SCHEDULE',
      true,
    );
  }
  async catalogueVersion(
    actor: TrustedActor,
    key: string,
    code: string,
    input: unknown,
  ) {
    return this.command(
      actor,
      key,
      `catalogue:${code}`,
      input,
      async (m) => {
        const b = object(input, ['expectedVersion', 'active', 'reason']);
        if (
          !catalogue().some((x) => x.code === code) ||
          typeof b.active !== 'boolean'
        )
          invalid('Trabajo inválido.');
        await this.lock(m, `catalogue:${code}`);
        const current = await m.findOne(AnalysisCatalogVersion, {
          where: { code },
          order: { version: 'DESC' },
        });
        this.version(current?.version ?? 0, b.expectedVersion);
        const row = await m.save(AnalysisCatalogVersion, {
          code,
          version: (current?.version ?? 0) + 1,
          active: b.active,
          actor: actor.subject,
          reason: text(b.reason, 'motivo'),
        });
        return {
          result: { entry: row },
          unitIds: [],
          facilities: [...actor.facilityScopes],
        };
      },
      'WRITE',
      true,
    );
  }
  async classify(
    actor: TrustedActor,
    key: string,
    input: unknown,
    id?: string,
  ) {
    return this.command(
      actor,
      key,
      `classify:${id ?? 'new'}`,
      input,
      async (m) => {
        const b = object(input, [
          'sourceOpId',
          'sourceVersion',
          'expectedVersion',
          'system',
          'reason',
        ]);
        const sourceOpId = uuid(b.sourceOpId);
        await this.lock(m, `classification:${sourceOpId}`);
        const [op] = await this.costs.references(m, actor, [sourceOpId]);
        if (!op || !op.unidadId)
          throw new NotFoundException('Consumo no disponible.');
        if (!['CONSUMPTION', 'EXTERNAL'].includes(op.kind))
          invalid(
            'Clasifique el consumo original; un retorno conserva esa atribución.',
          );
        this.version(op.version, b.sourceVersion);
        const current = await m.findOne(AnalysisClassification, {
          where: { sourceOpId },
          order: { revision: 'DESC' },
        });
        if (id && current?.id !== id)
          throw new ConflictException('Clasificación cambió.');
        if (current) this.scope.authorize(actor, true);
        this.version(current?.revision ?? 0, b.expectedVersion);
        if (
          b.system !== null &&
          !['A', 'B', 'C', 'D', 'E'].includes(String(b.system))
        )
          invalid('Sistema inválido.');
        const [unit] = await this.scope.assertUnits(m, actor, [op.unidadId]);
        const result = await m.save(AnalysisClassification, {
          id: randomUUID(),
          sourceOpId,
          sourceVersion: op.version,
          revision: (current?.revision ?? 0) + 1,
          unitId: op.unidadId,
          data: { system: b.system },
          actor: actor.subject,
          reason: text(b.reason, 'motivo'),
          createdAt: new Date(),
        });
        await m.insert(AnalysisInvalidation, {
          id: randomUUID(),
          unitId: unit.id,
          facilityId: unit.facilityId,
          sourceRef: sourceOpId,
          version: result.revision,
          createdAt: new Date(),
        });
        return {
          result: { classification: result },
          unitIds: [unit.id],
          facilities: [unit.facilityId],
        };
      },
    );
  }
  async documentOptions(actor: TrustedActor, unitId: string) {
    await this.ready(actor);
    return this.db.transaction('REPEATABLE READ', async (m) => {
      await this.scope.assertUnits(m, actor, [uuid(unitId)]);
      const services = await m.find(AnalysisExternalService, {
        where: { unitId, facilityId: In(actor.facilityScopes) },
        order: { performedOn: 'DESC' },
        take: 100,
      });
      const lines = services.flatMap((service) =>
        service.data.costLines
          .filter((line) => line.money)
          .map((line) => ({
            ...line,
            serviceId: service.id,
            providerName: service.providerName,
            performedOn: service.performedOn,
            unitId,
          })),
      );
      const allocations = lines.length
        ? await m.find(AnalysisDocumentAllocation, {
            where: { lineId: In(lines.map((x) => x.id)) },
          })
        : [];
      const groups = allocations.length
        ? await m.find(AnalysisDocumentGroup, {
            where: { id: In(allocations.map((x) => x.groupId)) },
          })
        : [];
      // A shared document is visible only if all of its participating units remain authorized.
      const visible = [] as AnalysisDocumentGroup[];
      for (const group of groups)
        if (group.facilities.every((x) => actor.facilityScopes.includes(x))) {
          try {
            await this.scope.assertUnits(m, actor, group.unitIds);
            visible.push(group);
          } catch {
            /* omit inaccessible document */
          }
        }
      return {
        lines: lines.map((line) => ({
          ...line,
          groupId:
            allocations.find((x) => x.lineId === line.id)?.groupId ?? null,
        })),
        groups: visible,
      };
    });
  }
  async documentGroup(
    actor: TrustedActor,
    key: string,
    input: unknown,
    id?: string,
  ) {
    return this.command(
      actor,
      key,
      `document:${id ?? 'new'}`,
      input,
      async (m) => {
        const b = object(input, [
          'expectedVersion',
          'lineIds',
          'documentRef',
          'netCents',
          'taxCents',
          'totalCents',
          'reason',
        ]);
        if (
          !Array.isArray(b.lineIds) ||
          !b.lineIds.length ||
          b.lineIds.length > 100
        )
          invalid('Indique las líneas del documento.');
        const lineIds = b.lineIds.map(uuid);
        if (new Set(lineIds).size !== lineIds.length)
          invalid('No repita líneas.');
        const groupId = id ? uuid(id) : randomUUID();
        await this.lock(m, `document:${groupId}`);
        if (id) this.scope.authorize(actor, true);
        const previous = id
          ? await m.findOneBy(AnalysisDocumentGroup, { id })
          : null;
        if (
          id &&
          (!previous ||
            !previous.facilities.every((f) => actor.facilityScopes.includes(f)))
        )
          throw new NotFoundException('Documento no disponible.');
        if (previous) await this.scope.assertUnits(m, actor, previous.unitIds);
        this.version(previous?.version ?? 0, b.expectedVersion);
        let lines = await m.find(AnalysisCostLine, {
          where: { id: In(lineIds) },
        });
        if (
          lines.length !== lineIds.length ||
          lines.some((l) => l.state !== 'RECORDED')
        )
          invalid('Las líneas deben tener importes conocidos.');
        const unitIds: string[] = [],
          facilities: string[] = [];
        for (const serviceId of [
          ...new Set(lines.map((l) => l.serviceId)),
        ].sort()) {
          await this.lock(m, `service:${serviceId}`);
          const service = await this.service(actor, serviceId, m);
          unitIds.push(service.unitId);
          facilities.push(service.facilityId);
        }
        lines = await m.find(AnalysisCostLine, { where: { id: In(lineIds) } });
        for (const line of lines) {
          const owner = await this.service(actor, line.serviceId, m);
          if (
            !owner.data.costLines.some((x) => x.id === line.id) ||
            line.state !== 'RECORDED'
          )
            invalid('La línea cambió; revise el documento.');
          const old = await m.findOneBy(AnalysisDocumentAllocation, {
            lineId: line.id,
          });
          if (old && old.groupId !== groupId)
            throw new ConflictException(
              'Una línea ya pertenece a otro documento.',
            );
        }
        for (const [keyName, field] of [
          ['netCents', 'netCents'],
          ['taxCents', 'taxCents'],
          ['totalCents', 'grossCents'],
        ] as const) {
          if (
            typeof b[keyName] !== 'string' ||
            !/^\d{1,16}$/.test(String(b[keyName])) ||
            lines.reduce((sum, x) => {
              if (x[field] === null)
                invalid('Falta el desglose fiscal del documento.');
              return sum + BigInt(x[field]!);
            }, 0n) !== BigInt(String(b[keyName]))
          )
            invalid(
              'Las asignaciones no concilian con el importe del documento.',
            );
        }
        const data = {
          documentRef: text(b.documentRef, 'referencia', 200),
          lineIds,
          netCents: b.netCents,
          taxCents: b.taxCents,
          totalCents: b.totalCents,
        };
        const group = await m.save(AnalysisDocumentGroup, {
          id: groupId,
          version: (previous?.version ?? 0) + 1,
          unitIds: [...new Set(unitIds)],
          facilities: [...new Set(facilities)],
          data,
        });
        await m.delete(AnalysisDocumentAllocation, { groupId });
        for (const line of lines)
          await m.insert(AnalysisDocumentAllocation, {
            lineId: line.id,
            groupId,
            lineVersion: line.version,
          });
        await m.insert(AnalysisDocumentRevision, {
          groupId,
          version: group.version,
          data,
          actor: actor.subject,
          reason: text(b.reason, 'motivo'),
        });
        return {
          result: { group },
          unitIds: group.unitIds,
          facilities: group.facilities,
        };
      },
    );
  }
}
