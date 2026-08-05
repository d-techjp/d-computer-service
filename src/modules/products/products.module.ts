import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductDescriptionsRepository } from './domain/product-descriptions.repository';
import { ProductsRepository } from './domain/products.repository';
import { ProductDescription } from './entities/product-description.entity';
import { Product } from './entities/product.entity';
import { TypeOrmProductDescriptionsRepository } from './infrastructure/typeorm-product-descriptions.repository';
import { TypeOrmProductsRepository } from './infrastructure/typeorm-products.repository';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Product, ProductDescription]),
        CategoriesModule,
        BrandsModule,
        UploadsModule,
    ],
    controllers: [ProductsController],
    providers: [
        ProductsService,
        { provide: ProductsRepository, useClass: TypeOrmProductsRepository },
        {
            provide: ProductDescriptionsRepository,
            useClass: TypeOrmProductDescriptionsRepository,
        },
    ],
    exports: [ProductsService],
})
export class ProductsModule {}
