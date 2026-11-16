import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPagesController } from './admin/admin-pages.controller';
import { PagesService } from './application/pages.service';
import { ClientPagesController } from './client/client-pages.controller';
import { PagesRepository } from './domain/pages.repository';
import { Page } from './entities/page.entity';
import { TypeOrmPagesRepository } from './infrastructure/typeorm-pages.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Page])],
    controllers: [ClientPagesController, AdminPagesController],
    providers: [PagesService, { provide: PagesRepository, useClass: TypeOrmPagesRepository }],
    exports: [PagesService],
})
export class PagesModule {}
