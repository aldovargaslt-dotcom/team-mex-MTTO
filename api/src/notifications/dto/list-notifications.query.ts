import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListNotificationsQuery {
  @ApiProperty({
    required: false,
    enum: ['unread', 'all'],
    default: 'unread',
    description: 'unread = No leídas (default); all = Todas',
  })
  @IsOptional()
  @IsIn(['unread', 'all'])
  filter?: 'unread' | 'all';
}
