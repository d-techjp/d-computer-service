import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserPermissionsService } from './user-permissions.service';

@Module({
    imports: [TypeOrmModule.forFeature([Role, Permission, User])],
    controllers: [RolesController, PermissionsController],
    providers: [RolesService, PermissionsService, UserPermissionsService],
    exports: [RolesService, PermissionsService, UserPermissionsService],
})
export class RbacModule {}
