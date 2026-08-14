import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartsRepository } from '../domain/carts.repository';
import { CartItem } from '../entities/cart-item.entity';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class TypeOrmCartsRepository extends CartsRepository {
    constructor(
        @InjectRepository(Cart) private readonly repo: Repository<Cart>,
        @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    ) {
        super();
    }

    create(data: Partial<Cart>): Cart {
        return this.repo.create(data);
    }

    save(cart: Cart): Promise<Cart> {
        return this.repo.save(cart);
    }

    async findById(id: string): Promise<Cart | null> {
        const cart = await this.repo.findOne({
            where: { id },
            relations: { items: { variant: { product: true } } },
        });
        if (!cart) return null;

        // Thứ tự dòng phải ổn định giữa các lần gọi, nếu không giỏ hàng sẽ nhảy
        // lung tung mỗi lần khách sửa số lượng. Sắp trong bộ nhớ vì `eager: true`
        // trên `Cart.items` bỏ qua mọi `order` khai ở đây.
        cart.items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return cart;
    }

    createItem(data: Partial<CartItem>): CartItem {
        return this.itemRepo.create(data);
    }

    saveItem(item: CartItem): Promise<CartItem> {
        return this.itemRepo.save(item);
    }

    async removeItem(item: CartItem): Promise<void> {
        await this.itemRepo.remove(item);
    }

    async removeItemsByCartId(cartId: string): Promise<void> {
        await this.itemRepo.delete({ cartId });
    }
}
