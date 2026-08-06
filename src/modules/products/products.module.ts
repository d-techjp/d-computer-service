import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProductBundleItemsRepository } from './domain/product-bundle-items.repository';
import { ProductDescriptionsRepository } from './domain/product-descriptions.repository';
import { ProductOptionsRepository } from './domain/product-options.repository';
import { ProductVariantsRepository } from './domain/product-variants.repository';
import { ProductsRepository } from './domain/products.repository';
import { ProductBundleItem } from './entities/product-bundle-item.entity';
import { ProductDescription } from './entities/product-description.entity';
import { ProductOptionValue } from './entities/product-option-value.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { TypeOrmProductBundleItemsRepository } from './infrastructure/typeorm-product-bundle-items.repository';
import { TypeOrmProductDescriptionsRepository } from './infrastructure/typeorm-product-descriptions.repository';
import { TypeOrmProductOptionsRepository } from './infrastructure/typeorm-product-options.repository';
import { TypeOrmProductVariantsRepository } from './infrastructure/typeorm-product-variants.repository';
import { TypeOrmProductsRepository } from './infrastructure/typeorm-products.repository';
import { ProductBundlesService } from './product-bundles.service';
import { ProductOptionsService } from './product-options.service';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Product,
            ProductDescription,
            ProductVariant,
            ProductOption,
            ProductOptionValue,
            ProductBundleItem,
        ]),
        CategoriesModule,
        BrandsModule,
        UploadsModule,
    ],
    controllers: [ProductsController, ProductVariantsController],
    providers: [
        ProductsService,
        ProductVariantsService,
        ProductOptionsService,
        ProductBundlesService,
        { provide: ProductsRepository, useClass: TypeOrmProductsRepository },
        { provide: ProductVariantsRepository, useClass: TypeOrmProductVariantsRepository },
        { provide: ProductOptionsRepository, useClass: TypeOrmProductOptionsRepository },
        { provide: ProductBundleItemsRepository, useClass: TypeOrmProductBundleItemsRepository },
        {
            provide: ProductDescriptionsRepository,
            useClass: TypeOrmProductDescriptionsRepository,
        },
    ],
    exports: [ProductsService, ProductVariantsService, ProductBundlesService],
})
export class ProductsModule {}
