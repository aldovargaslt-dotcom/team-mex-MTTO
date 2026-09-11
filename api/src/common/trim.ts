import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export function Trim() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

export function BlankToUndefined() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  });
}

export function RequiredTrimmed(message: string) {
  return applyDecorators(
    Trim(),
    IsString(),
    IsNotEmpty({ message }),
  );
}

export function OptionalTrimmed() {
  return applyDecorators(BlankToUndefined(), IsOptional(), IsString());
}
