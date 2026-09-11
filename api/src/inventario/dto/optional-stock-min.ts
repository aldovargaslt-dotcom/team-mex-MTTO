import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

/** Entero >= 0, o null para quitar el umbral (opt-in). */
export function OptionalStockMin() {
  return applyDecorators(
    ApiPropertyOptional({
      nullable: true,
      type: Number,
      example: 5,
      description: 'Umbral de stock bajo. null = sin alerta.',
    }),
    Transform(({ value }: { value: unknown }) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      return value;
    }),
    IsOptional(),
    ValidateIf((_, value) => value !== null && value !== undefined),
    IsInt({ message: 'El mínimo debe ser un número entero.' }),
    Min(0, { message: 'El mínimo no puede ser negativo.' }),
  );
}
