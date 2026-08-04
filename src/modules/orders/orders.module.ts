import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { RbacModule } from '../rbac/rbac.module';
import { OrdersRepository } from './domain/orders.repository';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { TypeOrmOrdersRepository } from './infrastructure/typeorm-orders.repository';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
    imports: [TypeOrmModule.forFeature([Order, OrderItem]), ProductsModule, RbacModule],
    controllers: [OrdersController],
    providers: [OrdersService, { provide: OrdersRepository, useClass: TypeOrmOrdersRepository }],
    exports: [OrdersService],
})
export class OrdersModule {}
