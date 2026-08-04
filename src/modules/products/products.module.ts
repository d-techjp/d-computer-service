import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductsRepository } from './domain/products.repository';
import { Product } from './entities/product.entity';
import { TypeOrmProductsRepository } from './infrastructure/typeorm-products.repository';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
    imports: [TypeOrmModule.forFeature([Product]), CategoriesModule, BrandsModule, UploadsModule],
    controllers: [ProductsController],
    providers: [
        ProductsService,
        { provide: ProductsRepository, useClass: TypeOrmProductsRepository },
    ],
    exports: [ProductsService],
})
export class ProductsModule {}
