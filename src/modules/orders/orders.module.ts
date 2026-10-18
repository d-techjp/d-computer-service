import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { RbacModule } from '../rbac/rbac.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { AdminOrdersController } from './admin/admin-orders.controller';
import { OrderReceiptService } from './application/order-receipt.service';
import { OrdersService } from './application/orders.service';
import { ClientOrdersController } from './client/client-orders.controller';
import { ClientOrdersService } from './client/client-orders.service';
import { OrdersRepository } from './domain/orders.repository';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { TypeOrmOrdersRepository } from './infrastructure/typeorm-orders.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem]),
        ProductsModule,
        RbacModule,
        SiteSettingsModule,
    ],
    controllers: [ClientOrdersController, AdminOrdersController],
    providers: [
        OrdersService,
        OrderReceiptService,
        ClientOrdersService,
        { provide: OrdersRepository, useClass: TypeOrmOrdersRepository },
    ],
    // Chỉ export service lõi — module khác dùng nghiệp vụ chung, không dùng bản siết cho khách
    exports: [OrdersService],
})
export class OrdersModule {}
