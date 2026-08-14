import type { Cart } from '../entities/cart.entity';
import type { CartItem } from '../entities/cart-item.entity';

/**
 * Port cho persistence của giỏ hàng — xem `CategoriesRepository` cho giải thích
 * convention (abstract class làm DI token, impl TypeORM ở `infrastructure/`).
 */
export abstract class CartsRepository {
    abstract create(data: Partial<Cart>): Cart;

    abstract save(cart: Cart): Promise<Cart>;

    /**
     * Giỏ kèm items, mỗi item kèm `variant` và `variant.product` — service cần
     * đủ bộ này để dựng response (giá live, tồn kho, tên, ảnh, slug) trong MỘT
     * truy vấn thay vì hỏi lại từng biến thể.
     */
    abstract findById(id: string): Promise<Cart | null>;

    abstract createItem(data: Partial<CartItem>): CartItem;

    abstract saveItem(item: CartItem): Promise<CartItem>;

    abstract removeItem(item: CartItem): Promise<void>;

    abstract removeItemsByCartId(cartId: string): Promise<void>;
}
