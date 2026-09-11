import { BadRequestException } from '@nestjs/common';

export function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException(message);
  }
  return trimmed;
}
