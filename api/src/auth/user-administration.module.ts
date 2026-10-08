import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityDirectoryModule } from '../kernel/facility-directory.module';
import { ActorDirectoryPort } from './actor-directory.port';
import { UserAccess, UserAccessAudit } from './user-access.entity';
import { UserAccessService } from './user-access.service';
import { UsersController } from './users.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccess, UserAccessAudit]),
    FacilityDirectoryModule,
  ],
  controllers: [UsersController],
  providers: [
    UserAccessService,
    { provide: ActorDirectoryPort, useExisting: UserAccessService },
  ],
  exports: [ActorDirectoryPort, UserAccessService],
})
export class UserAdministrationModule {}
