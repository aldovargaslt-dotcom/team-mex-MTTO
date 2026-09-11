import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import {
  OrigenConsumo,
  VISITA_CERRADA,
  VisitaCerradaPayload,
} from '../kernel/events/visita-cerrada';
import { OutboxService } from '../kernel/outbox/outbox.service';
import { TiposVehiculoService } from '../tipos-vehiculo/tipos-vehiculo.service';
import { requireTrimmed } from '../common/require-trimmed';
import { AddCompatibilidadDto } from './dto/add-compatibilidad.dto';
import { AjusteDto } from './dto/ajuste.dto';
import { CreateFamiliaDto } from './dto/create-familia.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateItemProveedorDto } from './dto/create-item-proveedor.dto';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { EntradaDto } from './dto/entrada.dto';
import { UpdateFamiliaDto } from './dto/update-familia.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemProveedorDto } from './dto/update-item-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Compatibilidad } from './entities/compatibilidad.entity';
import { Familia } from './entities/familia.entity';
import { Item } from './entities/item.entity';
import { ItemProveedor } from './entities/item-proveedor.entity';
import { Movimiento } from './entities/movimiento.entity';
import { PendienteComprobante } from './entities/pendiente-comprobante.entity';
import { Proveedor } from './entities/proveedor.entity';
import { Stock } from './entities/stock.entity';
import { EstadoPendiente, TipoMovimiento, UOM_PIEZA } from './enums';
import {
  mensajeStockInsuficiente,
  stockTrasMovimiento,
} from './stock-rules';

@Injectable()
export class InventarioService implements OnModuleInit {
  constructor(
    @InjectRepository(Familia)
    private readonly familias: Repository<Familia>,
    @InjectRepository(Item)
    private readonly items: Repository<Item>,
    @InjectRepository(Proveedor)
    private readonly proveedores: Repository<Proveedor>,
    @InjectRepository(ItemProveedor)
    private readonly itemProveedores: Repository<ItemProveedor>,
    @InjectRepository(Compatibilidad)
    private readonly compatibilidades: Repository<Compatibilidad>,
    @InjectRepository(Stock)
    private readonly stock: Repository<Stock>,
    @InjectRepository(Movimiento)
    private readonly movimientos: Repository<Movimiento>,
    @InjectRepository(PendienteComprobante)
    private readonly pendientes: Repository<PendienteComprobante>,
    private readonly tipos: TiposVehiculoService,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit() {
    this.outbox.register(VISITA_CERRADA, async (payload, manager) => {
      await this.applyVisitaCerrada(payload as unknown as VisitaCerradaPayload, manager);
    });
  }

  // --- Familias ---

  listFamilias() {
    return this.familias.find({ order: { nombre: 'ASC' } });
  }

  async createFamilia(dto: CreateFamiliaDto) {
    const familia = this.familias.create({
      nombre: requireTrimmed(dto.nombre, 'El nombre de la familia no puede estar vacío.'),
      activa: dto.activa ?? true,
    });
    return this.familias.save(familia);
  }

  async updateFamilia(id: string, dto: UpdateFamiliaDto) {
    const familia = await this.requireFamilia(id);
    if (dto.nombre !== undefined) {
      familia.nombre = requireTrimmed(
        dto.nombre,
        'El nombre de la familia no puede estar vacío.',
      );
    }
    if (dto.activa !== undefined) {
      familia.activa = dto.activa;
    }
    return this.familias.save(familia);
  }

  // --- Proveedores ---

  listProveedores() {
    return this.proveedores.find({ order: { nombre: 'ASC' } });
  }

  async createProveedor(dto: CreateProveedorDto) {
    const proveedor = this.proveedores.create({
      nombre: requireTrimmed(
        dto.nombre,
        'El nombre del proveedor no puede estar vacío.',
      ),
      activo: dto.activo ?? true,
    });
    return this.proveedores.save(proveedor);
  }

  async updateProveedor(id: string, dto: UpdateProveedorDto) {
    const proveedor = await this.requireProveedor(id);
    if (dto.nombre !== undefined) {
      proveedor.nombre = requireTrimmed(
        dto.nombre,
        'El nombre del proveedor no puede estar vacío.',
      );
    }
    if (dto.activo !== undefined) {
      proveedor.activo = dto.activo;
    }
    return this.proveedores.save(proveedor);
  }

  // --- Ítems ---

  async listItems() {
    const items = await this.items.find({
      relations: { familia: true, stock: true, compatibilidades: true, proveedores: true },
      order: { sku: 'ASC' },
    });
    return items.map((item) => this.toItemDto(item));
  }

  async findItem(id: string) {
    const item = await this.items.findOne({
      where: { id },
      relations: { familia: true, stock: true, compatibilidades: true, proveedores: true },
    });
    if (!item) {
      throw new NotFoundException('No se encontró el ítem.');
    }
    return this.toItemDto(item);
  }

  async createItem(dto: CreateItemDto) {
    const familia = await this.requireFamilia(dto.familiaId);
    if (!familia.activa) {
      throw new BadRequestException('La familia está inactiva.');
    }
    const item = this.items.create({
      sku: requireTrimmed(dto.sku, 'El SKU no puede estar vacío.'),
      nombre: requireTrimmed(dto.nombre, 'El nombre del ítem no puede estar vacío.'),
      familia,
      oem: dto.oem?.trim() || null,
      uom: UOM_PIEZA,
      activo: dto.activo ?? true,
    });
    const saved = await this.items.save(item);
    await this.stock.save(this.stock.create({ itemId: saved.id, qty: 0 }));
    if (dto.tipoVehiculoIds?.length) {
      await this.replaceCompatibilidad(saved.id, dto.tipoVehiculoIds);
    }
    return this.findItem(saved.id);
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.requireItemEntity(id);
    if (dto.sku !== undefined) {
      item.sku = requireTrimmed(dto.sku, 'El SKU no puede estar vacío.');
    }
    if (dto.nombre !== undefined) {
      item.nombre = requireTrimmed(dto.nombre, 'El nombre del ítem no puede estar vacío.');
    }
    if (dto.familiaId !== undefined) {
      item.familia = await this.requireFamilia(dto.familiaId);
    }
    if (dto.oem !== undefined) {
      item.oem = dto.oem?.trim() || null;
    }
    if (dto.activo !== undefined) {
      item.activo = dto.activo;
    }
    await this.items.save(item);
    if (dto.tipoVehiculoIds) {
      await this.replaceCompatibilidad(id, dto.tipoVehiculoIds);
    }
    return this.findItem(id);
  }

  async addCompatibilidad(itemId: string, dto: AddCompatibilidadDto) {
    await this.requireItemEntity(itemId);
    await this.tipos.findOne(dto.tipoVehiculoId);
    const exists = await this.compatibilidades.findOne({
      where: { item: { id: itemId }, tipoVehiculoId: dto.tipoVehiculoId },
    });
    if (exists) {
      return this.findItem(itemId);
    }
    await this.compatibilidades.save(
      this.compatibilidades.create({
        item: { id: itemId } as Item,
        tipoVehiculoId: dto.tipoVehiculoId,
      }),
    );
    return this.findItem(itemId);
  }

  async removeCompatibilidad(itemId: string, tipoVehiculoId: string) {
    await this.compatibilidades.delete({
      item: { id: itemId },
      tipoVehiculoId,
    });
    return this.findItem(itemId);
  }

  async addItemProveedor(itemId: string, dto: CreateItemProveedorDto) {
    await this.requireItemEntity(itemId);
    const proveedor = await this.requireProveedor(dto.proveedorId);
    const link = this.itemProveedores.create({
      item: { id: itemId } as Item,
      proveedor,
      codigoProveedor: requireTrimmed(
        dto.codigoProveedor,
        'El código de proveedor no puede estar vacío.',
      ),
      preferido: dto.preferido ?? false,
    });
    const saved = await this.itemProveedores.save(link);
    if (saved.preferido) {
      await this.ensureUnicoPreferido(itemId, saved.id);
    }
    return this.findItem(itemId);
  }

  async updateItemProveedor(id: string, dto: UpdateItemProveedorDto) {
    const link = await this.itemProveedores.findOne({
      where: { id },
      relations: { item: true },
    });
    if (!link) {
      throw new NotFoundException('No se encontró el vínculo con el proveedor.');
    }
    if (dto.codigoProveedor !== undefined) {
      link.codigoProveedor = requireTrimmed(
        dto.codigoProveedor,
        'El código de proveedor no puede estar vacío.',
      );
    }
    if (dto.preferido !== undefined) {
      link.preferido = dto.preferido;
    }
    await this.itemProveedores.save(link);
    if (link.preferido) {
      await this.ensureUnicoPreferido(link.item.id, link.id);
    }
    return this.findItem(link.item.id);
  }

  async removeItemProveedor(id: string) {
    const link = await this.itemProveedores.findOne({
      where: { id },
      relations: { item: true },
    });
    if (!link) {
      throw new NotFoundException('No se encontró el vínculo con el proveedor.');
    }
    const itemId = link.item.id;
    await this.itemProveedores.remove(link);
    return this.findItem(itemId);
  }

  // --- Stock / movimientos ---

  async listStock() {
    const rows = await this.stock.find({
      relations: { item: { familia: true } },
      order: { item: { sku: 'ASC' } },
    });
    return rows.map((row) => ({
      itemId: row.itemId,
      sku: row.item.sku,
      nombre: row.item.nombre,
      familia: row.item.familia?.nombre ?? null,
      activo: row.item.activo,
      uom: row.item.uom,
      qty: row.qty,
      updatedAt: row.updatedAt,
    }));
  }

  async listMovimientos() {
    const rows = await this.movimientos.find({
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      itemId: row.item.id,
      sku: row.item.sku,
      nombre: row.item.nombre,
      qty: row.qty,
      delta: row.delta,
      visitaId: row.visitaId,
      nota: row.nota,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    }));
  }

  async listPendientes() {
    const rows = await this.pendientes.find({
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      visitaId: row.visitaId,
      itemId: row.item.id,
      sku: row.item.sku,
      nombre: row.item.nombre,
      qty: row.qty,
      estado: row.estado,
      createdAt: row.createdAt,
    }));
  }

  async entrada(dto: EntradaDto, user: CurrentUser) {
    await this.items.manager.transaction(async (manager) => {
      await this.applyDelta(
        dto.itemId,
        dto.qty,
        TipoMovimiento.ENTRADA,
        { nota: dto.nota ?? null, createdBy: user.userId },
        manager,
      );
    });
    return this.findItem(dto.itemId);
  }

  async ajuste(dto: AjusteDto, user: CurrentUser) {
    await this.items.manager.transaction(async (manager) => {
      await this.applyDelta(
        dto.itemId,
        dto.qtyDelta,
        TipoMovimiento.AJUSTE,
        { nota: dto.nota ?? null, createdBy: user.userId },
        manager,
      );
    });
    return this.findItem(dto.itemId);
  }

  async skusCompatibles(tipoVehiculoId: string, q?: string) {
    await this.tipos.findOne(tipoVehiculoId);
    const qb = this.items
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.familia', 'familia')
      .leftJoinAndSelect('item.stock', 'stock')
      .innerJoin('item.compatibilidades', 'compat', 'compat.tipoVehiculoId = :tipoId', {
        tipoId: tipoVehiculoId,
      })
      .where('item.activo = true')
      .orderBy('item.sku', 'ASC');

    const query = q?.trim();
    if (query) {
      qb.andWhere('(item.sku ILIKE :q OR item.nombre ILIKE :q OR COALESCE(item.oem, \'\') ILIKE :q)', {
        q: `%${query}%`,
      });
    }

    const items = await qb.getMany();
    return items.map((item) => ({
      id: item.id,
      sku: item.sku,
      nombre: item.nombre,
      familia: item.familia?.nombre ?? null,
      oem: item.oem,
      uom: item.uom,
      stock: item.stock?.qty ?? 0,
    }));
  }

  async describirItems(ids: string[]) {
    if (!ids.length) {
      return new Map<
        string,
        { sku: string; nombre: string; stock: number; activo: boolean }
      >();
    }
    const unique = [...new Set(ids)];
    const items = await this.items.find({
      where: { id: In(unique) },
      relations: { stock: true },
    });
    return new Map(
      items.map((item) => [
        item.id,
        {
          sku: item.sku,
          nombre: item.nombre,
          stock: item.stock?.qty ?? 0,
          activo: item.activo,
        },
      ]),
    );
  }

  async applyVisitaCerrada(
    payload: VisitaCerradaPayload,
    manager: EntityManager,
  ) {
    for (const line of payload.consumos) {
      if (line.qty < 1) {
        throw new BadRequestException('La cantidad de cada pieza debe ser al menos 1.');
      }
      if (line.origen === OrigenConsumo.DESDE_STOCK) {
        await this.applyDelta(
          line.itemId,
          -line.qty,
          TipoMovimiento.SALIDA_OT,
          { visitaId: payload.visitaId },
          manager,
        );
      } else if (line.origen === OrigenConsumo.COMPRA_EXTERNA) {
        await this.requireItemEntity(line.itemId, manager);
        const pendientes = manager.getRepository(PendienteComprobante);
        await pendientes.save(
          pendientes.create({
            visitaId: payload.visitaId,
            item: { id: line.itemId } as Item,
            qty: line.qty,
            estado: EstadoPendiente.PENDIENTE,
          }),
        );
      }
    }
  }

  private async applyDelta(
    itemId: string,
    delta: number,
    tipo: TipoMovimiento,
    extra: { visitaId?: string | null; nota?: string | null; createdBy?: string | null },
    manager: EntityManager,
  ) {
    const itemRepo = manager.getRepository(Item);
    const stockRepo = manager.getRepository(Stock);
    const movRepo = manager.getRepository(Movimiento);

    const item = await itemRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('No se encontró el ítem.');
    }

    let stock = await stockRepo.findOne({
      where: { itemId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!stock) {
      stock = stockRepo.create({ itemId, qty: 0 });
    }

    try {
      stock.qty = stockTrasMovimiento(stock.qty, delta);
    } catch {
      if (tipo === TipoMovimiento.SALIDA_OT) {
        throw new BadRequestException(
          mensajeStockInsuficiente(item.sku, stock.qty, Math.abs(delta)),
        );
      }
      throw new BadRequestException(
        `El ajuste dejaría stock negativo para ${item.sku} (hay ${stock.qty}).`,
      );
    }

    await stockRepo.save(stock);
    await movRepo.save(
      movRepo.create({
        tipo,
        item: { id: itemId } as Item,
        qty: Math.abs(delta),
        delta,
        visitaId: extra.visitaId ?? null,
        nota: extra.nota ?? null,
        createdBy: extra.createdBy ?? null,
      }),
    );
  }

  private async replaceCompatibilidad(itemId: string, tipoVehiculoIds: string[]) {
    const unique = [...new Set(tipoVehiculoIds)];
    for (const tipoId of unique) {
      await this.tipos.findOne(tipoId);
    }
    await this.compatibilidades.delete({ item: { id: itemId } });
    if (unique.length) {
      await this.compatibilidades.save(
        unique.map((tipoVehiculoId) =>
          this.compatibilidades.create({
            item: { id: itemId } as Item,
            tipoVehiculoId,
          }),
        ),
      );
    }
  }

  private async ensureUnicoPreferido(itemId: string, keepId: string) {
    const others = await this.itemProveedores.find({
      where: { item: { id: itemId }, preferido: true },
    });
    for (const other of others) {
      if (other.id !== keepId) {
        other.preferido = false;
        await this.itemProveedores.save(other);
      }
    }
  }

  private async requireFamilia(id: string) {
    const familia = await this.familias.findOne({ where: { id } });
    if (!familia) {
      throw new NotFoundException('No se encontró la familia.');
    }
    return familia;
  }

  private async requireProveedor(id: string) {
    const proveedor = await this.proveedores.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException('No se encontró el proveedor.');
    }
    return proveedor;
  }

  private async requireItemEntity(id: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Item) : this.items;
    const item = await repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('No se encontró el ítem.');
    }
    return item;
  }

  private toItemDto(item: Item) {
    return {
      id: item.id,
      sku: item.sku,
      nombre: item.nombre,
      familiaId: item.familia?.id ?? null,
      familiaNombre: item.familia?.nombre ?? null,
      oem: item.oem,
      uom: item.uom,
      activo: item.activo,
      stock: item.stock?.qty ?? 0,
      tipoVehiculoIds: (item.compatibilidades ?? []).map((c) => c.tipoVehiculoId),
      proveedores: (item.proveedores ?? []).map((link) => ({
        id: link.id,
        proveedorId: link.proveedor?.id,
        proveedorNombre: link.proveedor?.nombre,
        codigoProveedor: link.codigoProveedor,
        preferido: link.preferido,
      })),
    };
  }
}
