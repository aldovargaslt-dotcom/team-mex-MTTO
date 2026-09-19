import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = exception.driverError as {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
    };

    if (driverError?.code === '23505') {
      const table = `${driverError.table ?? ''}`.toLowerCase();
      const constraint = `${driverError.constraint ?? ''} ${driverError.detail ?? ''} ${table}`.toLowerCase();
      let message = 'Ya existe un registro con esos datos.';
      if (constraint.includes('numero_interno') || constraint.includes('numerointerno')) {
        message = 'Ya existe una unidad con ese número interno.';
      } else if (constraint.includes('placas')) {
        message = 'Ya existe una unidad con esas placas.';
      } else if (constraint.includes('vin')) {
        message = 'Ya existe una unidad con ese VIN.';
      } else if (constraint.includes('sku')) {
        message = 'Ya existe un ítem con ese SKU.';
      } else if (constraint.includes('chofer_id')) {
        message = 'El chofer ya está asignado a una unidad.';
      } else if (constraint.includes('chofer')) {
        message = 'Ya existe un chofer con ese nombre.';
      } else if (constraint.includes('familia')) {
        message = 'Ya existe una familia con ese nombre.';
      } else if (table === 'proveedores' || constraint.includes('proveedores')) {
        message = 'Ya existe un proveedor con ese nombre.';
      } else if (constraint.includes('nombre')) {
        message = 'Ya existe un tipo de vehículo con ese nombre.';
      }
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error al procesar la solicitud.',
    });
  }
}
