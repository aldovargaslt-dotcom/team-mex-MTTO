import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityDirectoryModule } from '../kernel/facility-directory.module';
import {
  ActorDirectoryPort,
  MaintenanceAssigneesPort,
} from './actor-directory.port';
import { UserAccess, UserAccessAudit } from './user-access.entity';
import { UserAccessService } from './user-access.service';
import { UsersController } from './users.controller';
import {
  RolePermission,
  RolePermissionAudit,
  RolePermissionVersion,
} from './role-permission.entity';
import { PermissionMatrixService } from './permission-matrix.service';
import { PermissionsAdminController } from './permissions-admin.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAccess,
      UserAccessAudit,
      RolePermissionVersion,
      RolePermission,
      RolePermissionAudit,
    ]),
    FacilityDirectoryModule,
  ],
  controllers: [UsersController, PermissionsAdminController],
  providers: [
    UserAccessService,
    PermissionMatrixService,
    { provide: ActorDirectoryPort, useExisting: UserAccessService },
    { provide: MaintenanceAssigneesPort, useExisting: UserAccessService },
  ],
  exports: [ActorDirectoryPort, MaintenanceAssigneesPort, UserAccessService],
})
export class UserAdministrationModule {}
