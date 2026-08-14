import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ProductVariantsService } from '../../products/application/product-variants.service';
import { ProductStatus } from '../../products/entities/product.entity';
import type { ProductVariant } from '../../products/entities/product-variant.entity';
import {
    type AddToCartResultDto,
    type CartMutationResultDto,
    type PublicCartDto,
    toPublicCart,
} from '../client/dto/public-cart.dto';
import { CartsRepository } from '../domain/carts.repository';
import type { AddCartItemDto } from '../dto/add-cart-item.dto';
import type { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import type { CartItem } from '../entities/cart-item.entity';
import { Cart } from '../entities/cart.entity';
import {
    AddToCartStatus,
    CartItemIssue,
    CartStatus,
    MAX_QUANTITY_PER_ITEM,
} from '../enums/cart.enum';

/** Kết quả kiểm tra "được phép có bao nhiêu" trước khi ghi vào giỏ. */
interface QuantityVerdict {
    allowed: number;
    issue: CartItemIssue | null;
    availableStock: number | null;
}

@Injectable()
export class CartsService {
    constructor(
        private readonly cartsRepository: CartsRepository,
        private readonly variantsService: ProductVariantsService,
    ) {}

    /** Giỏ mới. Có đăng nhập thì gắn luôn chủ sở hữu để người khác không mở được. */
    async create(user?: AuthenticatedUser): Promise<PublicCartDto> {
        const cart = await this.cartsRepository.save(
            this.cartsRepository.create({
                userId: user?.id ?? null,
                status: CartStatus.ACTIVE,
                items: [],
            }),
        );
        // `save` trên entity vừa tạo không trả về quan hệ, gán tay để `toPublicCart`
        // không phải phòng thủ `items === undefined`.
        cart.items = [];
        return toPublicCart(cart);
    }

    async findOne(cartId: string, user?: AuthenticatedUser): Promise<PublicCartDto> {
        return toPublicCart(await this.loadAccessibleCart(cartId, user));
    }

    /**
     * Thêm vào giỏ. Cùng biến thể thì CỘNG DỒN vào dòng cũ, và mọi kiểm tra đều
     * xét trên tổng sau cộng dồn — nếu chỉ xét số muốn thêm thì khách bấm "thêm 1"
     * nhiều lần sẽ vượt tồn kho.
     *
     * Luôn trả 200 kèm `result.status`, kể cả khi không thêm được (xem
     * `CartMutationResultDto`) — trừ biến thể không tồn tại thì `findOne` ném 404.
     */
    async addItem(
        cartId: string,
        dto: AddCartItemDto,
        user?: AuthenticatedUser,
    ): Promise<CartMutationResultDto> {
        const cart = await this.loadAccessibleCart(cartId, user);
        const variant = await this.variantsService.findOne(dto.variantId);

        const existing = cart.items.find((item) => item.variantId === variant.id);
        const current = existing?.quantity ?? 0;
        const verdict = this.judgeQuantity(variant, current + dto.quantity);

        if (verdict.allowed <= current) {
            return {
                cart: toPublicCart(cart),
                result: this.buildResult(variant, dto.quantity, 0, current, verdict),
            };
        }

        if (existing) {
            existing.quantity = verdict.allowed;
            await this.cartsRepository.saveItem(existing);
        } else {
            await this.cartsRepository.saveItem(
                this.cartsRepository.createItem({
                    cartId: cart.id,
                    variantId: variant.id,
                    quantity: verdict.allowed,
                    addedUnitPrice: Number(variant.price),
                }),
            );
        }

        return {
            cart: await this.findOne(cartId, user),
            result: this.buildResult(
                variant,
                dto.quantity,
                verdict.allowed - current,
                verdict.allowed,
                verdict,
            ),
        };
    }

    /** Đặt số lượng tuyệt đối cho một dòng. Cùng bộ kiểm tra và shape response như `addItem`. */
    async updateItem(
        cartId: string,
        itemId: string,
        dto: UpdateCartItemDto,
        user?: AuthenticatedUser,
    ): Promise<CartMutationResultDto> {
        const cart = await this.loadAccessibleCart(cartId, user);
        const item = this.findItemOrFail(cart, itemId);
        const variant = item.variant;

        const verdict = this.judgeQuantity(variant, dto.quantity);
        if (verdict.allowed <= 0) {
            return {
                cart: toPublicCart(cart),
                result: this.buildResult(variant, dto.quantity, 0, item.quantity, verdict),
            };
        }

        item.quantity = verdict.allowed;
        await this.cartsRepository.saveItem(item);

        return {
            cart: await this.findOne(cartId, user),
            result: this.buildResult(
                variant,
                dto.quantity,
                verdict.allowed,
                verdict.allowed,
                verdict,
            ),
        };
    }

    async removeItem(
        cartId: string,
        itemId: string,
        user?: AuthenticatedUser,
    ): Promise<PublicCartDto> {
        const cart = await this.loadAccessibleCart(cartId, user);
        await this.cartsRepository.removeItem(this.findItemOrFail(cart, itemId));
        return this.findOne(cartId, user);
    }

    async clear(cartId: string, user?: AuthenticatedUser): Promise<PublicCartDto> {
        const cart = await this.loadAccessibleCart(cartId, user);
        await this.cartsRepository.removeItemsByCartId(cart.id);
        return this.findOne(cartId, user);
    }

    /**
     * Đóng giỏ sau khi đặt hàng thành công. Không xoá để còn truy vết ngược từ
     * đơn về giỏ; `GET` sau đó trả 404 nên client tự biết mà tạo giỏ mới.
     */
    async markConverted(cart: Cart, orderId: string): Promise<void> {
        cart.status = CartStatus.CONVERTED;
        cart.orderId = orderId;
        await this.cartsRepository.save(cart);
    }

    /**
     * Cửa duy nhất để lấy giỏ ra thao tác — mọi phép kiểm tra quyền nằm ở đây.
     *
     * Giỏ của khách vãng lai (`userId = null`) thì ai cầm `cartId` cũng dùng được,
     * đó là bản chất của giỏ ẩn danh. Nhưng giỏ đã gắn tài khoản thì chỉ chính chủ
     * mở được, để `cartId` bị lộ/chia sẻ không làm rò giỏ hàng của người khác.
     */
    async loadAccessibleCart(cartId: string, user?: AuthenticatedUser): Promise<Cart> {
        const cart = await this.cartsRepository.findById(cartId);

        // Giỏ đã đặt hàng coi như không còn tồn tại — trả 404 để client xoá
        // `cartId` cũ khỏi localStorage rồi tạo giỏ mới, thay vì loay hoay với
        // một giỏ không sửa được.
        if (!cart || cart.status === CartStatus.CONVERTED) {
            throw new NotFoundException(`Không tìm thấy giỏ hàng với id ${cartId}`);
        }
        if (cart.userId !== null && cart.userId !== user?.id) {
            throw new ForbiddenException('Giỏ hàng này thuộc về tài khoản khác');
        }
        return cart;
    }

    private findItemOrFail(cart: Cart, itemId: string): CartItem {
        const item = cart.items.find((candidate) => candidate.id === itemId);
        if (!item) throw new NotFoundException(`Không tìm thấy sản phẩm ${itemId} trong giỏ hàng`);
        return item;
    }

    /**
     * Số lượng tối đa được phép giữ trong giỏ cho biến thể này, kèm lý do khi bị
     * cắt bớt. Trả `allowed` chứ không ném lỗi — thêm hàng thất bại là chuyện
     * bình thường của storefront, client cần thông báo chứ không cần exception.
     */
    private judgeQuantity(variant: ProductVariant, desired: number): QuantityVerdict {
        const availableStock = variant.trackInventory ? variant.stock : null;

        if (this.isProductUnpurchasable(variant)) {
            return { allowed: 0, issue: CartItemIssue.PRODUCT_UNAVAILABLE, availableStock };
        }
        if (!variant.isActive) {
            return { allowed: 0, issue: CartItemIssue.VARIANT_INACTIVE, availableStock };
        }

        if (availableStock !== null) {
            if (availableStock <= 0) {
                return { allowed: 0, issue: CartItemIssue.OUT_OF_STOCK, availableStock };
            }
            if (desired > availableStock) {
                return {
                    allowed: Math.min(availableStock, MAX_QUANTITY_PER_ITEM),
                    issue: CartItemIssue.INSUFFICIENT_STOCK,
                    availableStock,
                };
            }
        }

        if (desired > MAX_QUANTITY_PER_ITEM) {
            return {
                allowed: MAX_QUANTITY_PER_ITEM,
                issue: CartItemIssue.MAX_QUANTITY_EXCEEDED,
                availableStock,
            };
        }
        return { allowed: desired, issue: null, availableStock };
    }

    /**
     * `out_of_stock` vẫn mua được (tồn kho xét riêng theo biến thể) — chỉ
     * draft/archived mới chặn.
     *
     * `product` có thể là `null` với biến thể mồ côi: xoá mềm sản phẩm KHÔNG xoá
     * mềm biến thể của nó, nên quan hệ tải về rỗng. Coi như không còn bán thay vì
     * để vỡ thành 500.
     */
    private isProductUnpurchasable(variant: ProductVariant): boolean {
        return (
            !variant.product ||
            variant.product.status === ProductStatus.DRAFT ||
            variant.product.status === ProductStatus.ARCHIVED
        );
    }

    private buildResult(
        variant: ProductVariant,
        requested: number,
        accepted: number,
        quantityInCart: number,
        verdict: QuantityVerdict,
    ): AddToCartResultDto {
        const status =
            accepted <= 0
                ? AddToCartStatus.REJECTED
                : verdict.issue === null
                  ? AddToCartStatus.ADDED
                  : AddToCartStatus.ADJUSTED;

        return {
            variantId: variant.id,
            requested,
            accepted: Math.max(0, accepted),
            quantityInCart,
            availableStock: verdict.availableStock,
            status,
            issue: verdict.issue,
            message: this.describe(status, accepted, verdict),
        };
    }

    private describe(status: AddToCartStatus, accepted: number, verdict: QuantityVerdict): string {
        if (status === AddToCartStatus.ADDED) {
            return `Đã thêm ${accepted} sản phẩm vào giỏ hàng.`;
        }

        switch (verdict.issue) {
            case CartItemIssue.PRODUCT_UNAVAILABLE:
                return 'Sản phẩm này hiện không còn bán.';
            case CartItemIssue.VARIANT_INACTIVE:
                return 'Phiên bản này hiện không còn bán.';
            case CartItemIssue.OUT_OF_STOCK:
                return 'Sản phẩm đã hết hàng.';
            case CartItemIssue.MAX_QUANTITY_EXCEEDED:
                return `Mỗi sản phẩm chỉ mua tối đa ${MAX_QUANTITY_PER_ITEM} cái trong một đơn.`;
            case CartItemIssue.INSUFFICIENT_STOCK:
                return status === AddToCartStatus.REJECTED
                    ? `Giỏ hàng đã có đủ ${verdict.availableStock ?? 0} sản phẩm còn lại.`
                    : `Chỉ còn ${verdict.availableStock ?? 0} sản phẩm, đã thêm ${accepted} vào giỏ hàng.`;
            default:
                return 'Không thể thêm sản phẩm vào giỏ hàng.';
        }
    }
}
