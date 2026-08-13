import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { AdminCarouselsController } from './admin/admin-carousels.controller';
import { CarouselProductsService } from './application/carousel-products.service';
import { CarouselsService } from './application/carousels.service';
import { ClientCarouselsController } from './client/client-carousels.controller';
import { ClientCarouselsService } from './client/client-carousels.service';
import { CarouselsRepository } from './domain/carousels.repository';
import { Carousel } from './entities/carousel.entity';
import { TypeOrmCarouselsRepository } from './infrastructure/typeorm-carousels.repository';

@Module({
    // Phụ thuộc một chiều: carousel biết products, products không biết carousel.
    imports: [TypeOrmModule.forFeature([Carousel]), ProductsModule],
    controllers: [ClientCarouselsController, AdminCarouselsController],
    providers: [
        CarouselsService,
        CarouselProductsService,
        ClientCarouselsService,
        { provide: CarouselsRepository, useClass: TypeOrmCarouselsRepository },
    ],
    exports: [CarouselsService],
})
export class CarouselsModule {}
