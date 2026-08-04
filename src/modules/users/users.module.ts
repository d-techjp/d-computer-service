import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenVersionModule } from '../auth/token-version/token-version.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersRepository } from './domain/users.repository';
import { User } from './entities/user.entity';
import { TypeOrmUsersRepository } from './infrastructure/typeorm-users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    imports: [TypeOrmModule.forFeature([User]), RbacModule, TokenVersionModule],
    controllers: [UsersController],
    providers: [UsersService, { provide: UsersRepository, useClass: TypeOrmUsersRepository }],
    exports: [UsersService],
})
export class UsersModule {}
