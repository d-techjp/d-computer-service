import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AdminCostPriceService } from './admin/admin-cost-price.service';
import { AdminProductsController } from './admin/admin-products.controller';
import { AdminVariantCountService } from './admin/admin-variant-count.service';
import { AdminVariantsController } from './admin/admin-variants.controller';
import { ProductBundlesService } from './application/product-bundles.service';
import { ProductOptionsService } from './application/product-options.service';
import { ProductVariantsService } from './application/product-variants.service';
import { ProductsService } from './application/products.service';
import { ClientProductsController } from './client/client-products.controller';
import { ClientProductsService } from './client/client-products.service';
import { ClientVariantsController } from './client/client-variants.controller';
import { ClientVariantsService } from './client/client-variants.service';
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
    controllers: [
        ClientProductsController,
        ClientVariantsController,
        AdminProductsController,
        AdminVariantsController,
    ],
    providers: [
        ProductsService,
        ProductVariantsService,
        ProductOptionsService,
        ProductBundlesService,
        ClientProductsService,
        ClientVariantsService,
        AdminCostPriceService,
        AdminVariantCountService,
        { provide: ProductsRepository, useClass: TypeOrmProductsRepository },
        { provide: ProductVariantsRepository, useClass: TypeOrmProductVariantsRepository },
        { provide: ProductOptionsRepository, useClass: TypeOrmProductOptionsRepository },
        { provide: ProductBundleItemsRepository, useClass: TypeOrmProductBundleItemsRepository },
        {
            provide: ProductDescriptionsRepository,
            useClass: TypeOrmProductDescriptionsRepository,
        },
    ],
    // Chỉ export service lõi — module khác dùng nghiệp vụ chung, không dùng bản siết cho storefront
    exports: [ProductsService, ProductVariantsService, ProductBundlesService],
})
export class ProductsModule {}
