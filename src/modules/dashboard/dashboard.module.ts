import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { User } from '../users/entities/user.entity';
import { AdminDashboardController } from './admin-dashboard.controller';
import { DashboardService } from './application/dashboard.service';
import { DashboardRepository } from './domain/dashboard.repository';
import { TypeOrmDashboardRepository } from './infrastructure/typeorm-dashboard.repository';

@Module({
    // forFeature lại các entity cần đọc thay vì import OrdersModule/UsersModule/
    // ProductsModule: dashboard chỉ đọc, không gọi service nào của chúng, và
    // import chéo 3 module nghiệp vụ là đường ngắn nhất tới vòng lặp module —
    // cùng lý do với `InventoryModule`.
    imports: [TypeOrmModule.forFeature([Order, OrderItem, User, ProductVariant])],
    controllers: [AdminDashboardController],
    providers: [
        DashboardService,
        { provide: DashboardRepository, useClass: TypeOrmDashboardRepository },
    ],
})
export class DashboardModule {}
