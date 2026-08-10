import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin/admin-categories.controller';
import { CategoriesService } from './application/categories.service';
import { ClientCategoriesController } from './client/client-categories.controller';
import { ClientCategoriesService } from './client/client-categories.service';
import { CategoriesRepository } from './domain/categories.repository';
import { Category } from './entities/category.entity';
import { TypeOrmCategoriesRepository } from './infrastructure/typeorm-categories.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Category])],
    controllers: [ClientCategoriesController, AdminCategoriesController],
    providers: [
        CategoriesService,
        ClientCategoriesService,
        { provide: CategoriesRepository, useClass: TypeOrmCategoriesRepository },
    ],
    // Chỉ export service lõi — module khác dùng nghiệp vụ chung, không dùng bản siết cho storefront
    exports: [CategoriesService],
})
export class CategoriesModule {}
