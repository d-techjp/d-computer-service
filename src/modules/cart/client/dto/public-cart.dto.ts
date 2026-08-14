import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductVariant } from '../../../products/entities/product-variant.entity';
import { ProductStatus } from '../../../products/entities/product.entity';
import type { CartItem } from '../../entities/cart-item.entity';
import type { Cart } from '../../entities/cart.entity';
import { AddToCartStatus, CartItemIssue, CartStatus, isBlockingIssue } from '../../enums/cart.enum';

/**
 * Một dòng giỏ hàng dưới góc nhìn storefront: đã gộp sẵn dữ liệu từ variant và
 * product cha để FE render thẳng, khỏi phải gọi lại catalog cho từng dòng.
 *
 * `unitPrice` là GIÁ HIỆN TẠI trong DB, không phải giá lúc thêm vào giỏ.
 */
export class PublicCartItemDto {
    @ApiProperty({ format: 'uuid', description: 'Id của dòng — dùng cho PATCH/DELETE' })
    id: string;

    @ApiProperty({ format: 'uuid' }) variantId: string;
    @ApiProperty({ format: 'uuid' }) productId: string;

    @ApiProperty({ description: 'Slug sản phẩm cha, để FE dựng link /products/{slug}' })
    slug: string;

    @ApiProperty({ example: 'DELL-V3520-I5-16-512' }) sku: string;
    @ApiProperty({ example: 'Laptop Dell Vostro 3520' }) productName: string;
    @ApiProperty({ example: '16GB / 512GB' }) variantName: string;

    @ApiPropertyOptional({ nullable: true, description: 'Ảnh biến thể, thiếu thì lấy của product' })
    image: string | null;

    @ApiProperty({ example: 15990000, description: 'Giá HIỆN TẠI trong DB' })
    unitPrice: number;

    @ApiPropertyOptional({ nullable: true, example: 17990000 })
    compareAtPrice: number | null;

    @ApiProperty({ example: 15990000, description: 'Giá lúc thêm vào giỏ — chỉ để đối chiếu' })
    addedUnitPrice: number;

    @ApiProperty({ description: 'unitPrice khác addedUnitPrice' })
    priceChanged: boolean;

    @ApiProperty({ example: 2 }) quantity: number;
    @ApiProperty({ example: 31980000, description: 'unitPrice * quantity' }) lineTotal: number;

    @ApiPropertyOptional({
        nullable: true,
        example: 25,
        description: 'null = bán không giới hạn (trackInventory = false)',
    })
    availableStock: number | null;

    @ApiProperty({ description: 'false khi dòng này có issue chặn đặt hàng' })
    isAvailable: boolean;

    @ApiProperty({ enum: CartItemIssue, isArray: true })
    issues: CartItemIssue[];
}

export class PublicCartDto {
    @ApiProperty({ format: 'uuid', description: 'Chính là cartId client cần lưu lại' })
    id: string;

    @ApiProperty({ enum: CartStatus }) status: CartStatus;

    @ApiProperty({ example: 3, description: 'Tổng quantity — dùng cho badge giỏ hàng' })
    itemCount: number;

    @ApiProperty({ example: 31980000, description: 'Tổng tiền hàng, chưa giảm giá và phí ship' })
    subtotal: number;

    @ApiProperty({
        description: 'Có ít nhất một dòng gặp vấn đề chặn (mọi issue trừ price_changed)',
    })
    hasBlockingIssues: boolean;

    @ApiProperty({ type: [PublicCartItemDto] }) items: PublicCartItemDto[];

    @ApiProperty() updatedAt: Date;
}

export class AddToCartResultDto {
    @ApiProperty({ format: 'uuid' }) variantId: string;
    @ApiProperty({ example: 5, description: 'Số lượng khách yêu cầu' }) requested: number;
    @ApiProperty({ example: 1, description: 'Số thực sự được thêm; 0 khi bị từ chối' })
    accepted: number;

    @ApiProperty({ example: 3, description: 'Tổng số của biến thể này trong giỏ SAU thao tác' })
    quantityInCart: number;

    @ApiPropertyOptional({ nullable: true, example: 3 }) availableStock: number | null;

    @ApiProperty({ enum: AddToCartStatus }) status: AddToCartStatus;

    @ApiPropertyOptional({ enum: CartItemIssue, nullable: true, description: 'null khi added' })
    issue: CartItemIssue | null;

    @ApiProperty({ example: 'Chỉ còn 3 sản phẩm, đã thêm 1 vào giỏ hàng.' }) message: string;
}

/** Luôn kèm cả giỏ mới nhất để client render lại ngay, khỏi gọi thêm `GET /carts/:id`. */
export class CartMutationResultDto {
    @ApiProperty({ type: PublicCartDto }) cart: PublicCartDto;
    @ApiProperty({ type: AddToCartResultDto }) result: AddToCartResultDto;
}

/** Làm tròn 2 chữ số thập phân, khớp `numeric(14,2)` trong DB — như `OrdersService.round`. */
const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Tồn kho còn bán được. `null` khi biến thể không theo dõi kho (dịch vụ, hàng
 * đặt trước) — nghĩa là không giới hạn, KHÁC hẳn với 0.
 *
 * Combo `derived_from_components` không cần xử lý riêng: `ProductBundlesService`
 * đã ghi sẵn tồn kho suy ra từ thành phần vào chính cột `stock` của nó.
 */
const resolveAvailableStock = (variant: ProductVariant): number | null =>
    variant.trackInventory ? variant.stock : null;

/** Tình trạng của một dòng — dùng chung cho xem giỏ và checkout preview. */
export const collectItemIssues = (item: CartItem): CartItemIssue[] => {
    const variant = item.variant;
    const issues: CartItemIssue[] = [];

    if (!isProductPurchasable(variant)) issues.push(CartItemIssue.PRODUCT_UNAVAILABLE);
    if (!variant.isActive) issues.push(CartItemIssue.VARIANT_INACTIVE);

    if (variant.trackInventory) {
        if (variant.stock <= 0) issues.push(CartItemIssue.OUT_OF_STOCK);
        else if (variant.stock < item.quantity) issues.push(CartItemIssue.INSUFFICIENT_STOCK);
    }

    if (Number(item.addedUnitPrice) !== Number(variant.price)) {
        issues.push(CartItemIssue.PRICE_CHANGED);
    }
    return issues;
};

/**
 * Trạng thái sản phẩm coi như "không còn bán". Cố ý KHÔNG dùng `VISIBLE_STATUSES`
 * của storefront: `out_of_stock` vẫn *hiển thị* được (khách cần biết hàng đang
 * hết) và tồn kho thật đã được xét riêng theo từng biến thể, nên chỉ `draft` và
 * `archived` mới chặn mua.
 */
const UNPURCHASABLE_STATUSES: readonly ProductStatus[] = [
    ProductStatus.DRAFT,
    ProductStatus.ARCHIVED,
];

/**
 * `product` có thể `null` với biến thể mồ côi — xoá mềm sản phẩm KHÔNG xoá mềm
 * biến thể của nó nên quan hệ tải về rỗng. Khi đó coi như hàng không còn bán,
 * và các trường hiển thị rơi về giá trị của chính biến thể.
 */
const isProductPurchasable = (variant: ProductVariant): boolean =>
    Boolean(variant.product) && !UNPURCHASABLE_STATUSES.includes(variant.product.status);

export const toPublicCartItem = (item: CartItem): PublicCartItemDto => {
    const variant = item.variant;
    const product = variant.product as ProductVariant['product'] | null;
    const unitPrice = Number(variant.price);
    const addedUnitPrice = Number(item.addedUnitPrice);
    const issues = collectItemIssues(item);

    return {
        id: item.id,
        variantId: variant.id,
        productId: variant.productId,
        slug: product?.slug ?? '',
        sku: variant.sku,
        productName: product?.name ?? variant.name,
        variantName: variant.name,
        image: variant.thumbnail ?? product?.thumbnail ?? null,
        unitPrice,
        compareAtPrice: variant.compareAtPrice === null ? null : Number(variant.compareAtPrice),
        addedUnitPrice,
        priceChanged: unitPrice !== addedUnitPrice,
        quantity: item.quantity,
        lineTotal: round(unitPrice * item.quantity),
        availableStock: resolveAvailableStock(variant),
        isAvailable: !issues.some(isBlockingIssue),
        issues,
    };
};

export const toPublicCart = (cart: Cart): PublicCartDto => {
    const items = (cart.items ?? []).map(toPublicCartItem);

    return {
        id: cart.id,
        status: cart.status,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: round(items.reduce((sum, item) => sum + item.lineTotal, 0)),
        hasBlockingIssues: items.some((item) => !item.isAvailable),
        items,
        updatedAt: cart.updatedAt,
    };
};
