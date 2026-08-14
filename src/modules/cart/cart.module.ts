import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { CartsService } from './application/carts.service';
import { CheckoutService } from './application/checkout.service';
import { ClientCartsController } from './client/client-carts.controller';
import { ClientCheckoutController } from './client/client-checkout.controller';
import { CartsRepository } from './domain/carts.repository';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';
import { TypeOrmCartsRepository } from './infrastructure/typeorm-carts.repository';

/**
 * Checkout ở chung module với cart vì nó chỉ là thao tác trên giỏ — tách ra
 * thành module riêng chỉ để chứa một service là thừa (xem `carousels` cũng có
 * 2 application service trong cùng module).
 *
 * Phụ thuộc một chiều: cart biết products/orders, hai bên kia không biết cart.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Cart, CartItem]), ProductsModule, OrdersModule],
    controllers: [ClientCartsController, ClientCheckoutController],
    providers: [
        CartsService,
        CheckoutService,
        { provide: CartsRepository, useClass: TypeOrmCartsRepository },
    ],
    exports: [CartsService],
})
export class CartModule {}
