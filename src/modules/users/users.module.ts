import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenVersionModule } from '../auth/token-version/token-version.module';
import { RbacModule } from '../rbac/rbac.module';
import { AdminUsersController } from './admin/admin-users.controller';
import { UsersService } from './application/users.service';
import { ClientUsersController } from './client/client-users.controller';
import { UsersRepository } from './domain/users.repository';
import { User } from './entities/user.entity';
import { TypeOrmUsersRepository } from './infrastructure/typeorm-users.repository';

@Module({
    imports: [TypeOrmModule.forFeature([User]), RbacModule, TokenVersionModule],
    controllers: [ClientUsersController, AdminUsersController],
    providers: [UsersService, { provide: UsersRepository, useClass: TypeOrmUsersRepository }],
    exports: [UsersService],
})
export class UsersModule {}
