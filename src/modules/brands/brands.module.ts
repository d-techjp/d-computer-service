import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBrandsController } from './admin/admin-brands.controller';
import { BrandsService } from './application/brands.service';
import { ClientBrandsController } from './client/client-brands.controller';
import { ClientBrandsService } from './client/client-brands.service';
import { BrandsRepository } from './domain/brands.repository';
import { Brand } from './entities/brand.entity';
import { TypeOrmBrandsRepository } from './infrastructure/typeorm-brands.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Brand])],
    controllers: [ClientBrandsController, AdminBrandsController],
    providers: [
        BrandsService,
        ClientBrandsService,
        { provide: BrandsRepository, useClass: TypeOrmBrandsRepository },
    ],
    // Chỉ export service lõi — module khác dùng nghiệp vụ chung, không dùng bản siết cho storefront
    exports: [BrandsService],
})
export class BrandsModule {}
