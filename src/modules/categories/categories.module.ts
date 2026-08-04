import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './domain/categories.repository';
import { Category } from './entities/category.entity';
import { TypeOrmCategoriesRepository } from './infrastructure/typeorm-categories.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Category])],
    controllers: [CategoriesController],
    providers: [
        CategoriesService,
        { provide: CategoriesRepository, useClass: TypeOrmCategoriesRepository },
    ],
    exports: [CategoriesService],
})
export class CategoriesModule {}
