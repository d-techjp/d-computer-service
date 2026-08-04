import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PermissionsRepository } from './domain/permissions.repository';
import { RolesRepository } from './domain/roles.repository';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { TypeOrmPermissionsRepository } from './infrastructure/typeorm-permissions.repository';
import { TypeOrmRolesRepository } from './infrastructure/typeorm-roles.repository';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserPermissionsService } from './user-permissions.service';

@Module({
    imports: [TypeOrmModule.forFeature([Role, Permission, User])],
    controllers: [RolesController, PermissionsController],
    providers: [
        RolesService,
        PermissionsService,
        UserPermissionsService,
        { provide: RolesRepository, useClass: TypeOrmRolesRepository },
        { provide: PermissionsRepository, useClass: TypeOrmPermissionsRepository },
    ],
    exports: [RolesService, PermissionsService, UserPermissionsService],
})
export class RbacModule {}
