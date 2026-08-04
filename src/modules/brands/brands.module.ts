import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './domain/brands.repository';
import { Brand } from './entities/brand.entity';
import { TypeOrmBrandsRepository } from './infrastructure/typeorm-brands.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Brand])],
    controllers: [BrandsController],
    providers: [BrandsService, { provide: BrandsRepository, useClass: TypeOrmBrandsRepository }],
    exports: [BrandsService],
})
export class BrandsModule {}
