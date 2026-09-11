import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import { CurrentUserParam } from '../auth/current-user.decorator';
import { AddCompatibilidadDto } from './dto/add-compatibilidad.dto';
import { AjusteDto } from './dto/ajuste.dto';
import { CreateFamiliaDto } from './dto/create-familia.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateItemProveedorDto } from './dto/create-item-proveedor.dto';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { EntradaDto } from './dto/entrada.dto';
import { TicketDto } from './dto/ticket.dto';
import { UpdateFamiliaDto } from './dto/update-familia.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemProveedorDto } from './dto/update-item-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { InventarioService } from './inventario.service';

@ApiTags('inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get('familias')
  @ApiOperation({ summary: 'Listar familias (supervisor y admin)' })
  listFamilias() {
    return this.service.listFamilias();
  }

  @Post('familias')
  @ApiOperation({ summary: 'Crear familia' })
  createFamilia(@Body() dto: CreateFamiliaDto) {
    return this.service.createFamilia(dto);
  }

  @Patch('familias/:id')
  @ApiOperation({ summary: 'Actualizar familia' })
  updateFamilia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFamiliaDto,
  ) {
    return this.service.updateFamilia(id, dto);
  }

  @Get('proveedores')
  @ApiOperation({ summary: 'Listar proveedores' })
  listProveedores() {
    return this.service.listProveedores();
  }

  @Post('proveedores')
  @ApiOperation({ summary: 'Crear proveedor' })
  createProveedor(@Body() dto: CreateProveedorDto) {
    return this.service.createProveedor(dto);
  }

  @Patch('proveedores/:id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  updateProveedor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.service.updateProveedor(id, dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'Listar ítems / SKUs. `ids` filtra por IDs opacos (lectura para Piezas).' })
  listItems(@Query('ids') ids?: string) {
    return this.service.listItems(ids);
  }

  @Get('skus')
  @ApiOperation({
    summary: 'SKUs compatibles con un tipo de vehículo (paso Piezas)',
  })
  skus(
    @Query('tipoVehiculoId', ParseUUIDPipe) tipoVehiculoId: string,
    @Query('q') q?: string,
  ) {
    return this.service.skusCompatibles(tipoVehiculoId, q);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Detalle de ítem' })
  findItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findItem(id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Crear ítem' })
  createItem(@Body() dto: CreateItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Actualizar ítem' })
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.service.updateItem(id, dto);
  }

  @Post('items/:id/compatibilidad')
  @ApiOperation({ summary: 'Agregar compatibilidad (tipoVehiculoId opaco)' })
  addCompat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCompatibilidadDto,
  ) {
    return this.service.addCompatibilidad(id, dto);
  }

  @Delete('items/:id/compatibilidad/:tipoVehiculoId')
  @ApiOperation({ summary: 'Quitar compatibilidad' })
  removeCompat(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipoVehiculoId', ParseUUIDPipe) tipoVehiculoId: string,
  ) {
    return this.service.removeCompatibilidad(id, tipoVehiculoId);
  }

  @Post('items/:id/proveedores')
  @ApiOperation({ summary: 'Vincular código de proveedor' })
  addItemProveedor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateItemProveedorDto,
  ) {
    return this.service.addItemProveedor(id, dto);
  }

  @Patch('item-proveedores/:id')
  @ApiOperation({ summary: 'Actualizar vínculo ítem-proveedor' })
  updateItemProveedor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemProveedorDto,
  ) {
    return this.service.updateItemProveedor(id, dto);
  }

  @Delete('item-proveedores/:id')
  @ApiOperation({ summary: 'Quitar vínculo ítem-proveedor' })
  removeItemProveedor(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeItemProveedor(id);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Stock del almacén único' })
  listStock() {
    return this.service.listStock();
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Movimientos (entrada, salida OT, ajuste)' })
  listMovimientos() {
    return this.service.listMovimientos();
  }

  @Post('movimientos/entrada')
  @ApiOperation({ summary: 'Registrar entrada de stock' })
  entrada(@Body() dto: EntradaDto, @CurrentUserParam() user: CurrentUser) {
    return this.service.entrada(dto, user);
  }

  @Post('movimientos/ajuste')
  @ApiOperation({ summary: 'Ajuste de stock (delta con signo)' })
  ajuste(@Body() dto: AjusteDto, @CurrentUserParam() user: CurrentUser) {
    return this.service.ajuste(dto, user);
  }

  @Get('pendientes-comprobante')
  @ApiOperation({ summary: 'Compras externas pendientes de comprobante' })
  listPendientes() {
    return this.service.listPendientes();
  }

  @Post('pendientes-comprobante/:id/ticket')
  @ApiOperation({ summary: 'Adjuntar foto de ticket a un pendiente' })
  adjuntarTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketDto,
  ) {
    return this.service.adjuntarTicket(id, dto);
  }

  @Post('pendientes-comprobante/:id/recibir')
  @ApiOperation({ summary: 'Marcar pendiente de comprobante como recibido' })
  marcarRecibida(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.marcarRecibida(id);
  }
}
