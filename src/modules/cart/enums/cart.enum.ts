export enum CartStatus {
    ACTIVE = 'active',
    /** Đã đặt hàng xong — giỏ khoá lại, không dùng lại được. */
    CONVERTED = 'converted',
}

/**
 * Tình trạng của một dòng trong giỏ. Dùng chung cho cả ba chỗ (thêm vào giỏ,
 * xem giỏ, checkout preview) để client chỉ phải học một bộ từ vựng.
 */
export enum CartItemIssue {
    /** Hết sạch hàng. */
    OUT_OF_STOCK = 'out_of_stock',
    /** Còn hàng nhưng ít hơn số khách muốn mua. */
    INSUFFICIENT_STOCK = 'insufficient_stock',
    /** Biến thể bị tắt bán. */
    VARIANT_INACTIVE = 'variant_inactive',
    /** Sản phẩm cha không còn bán (draft/archived). */
    PRODUCT_UNAVAILABLE = 'product_unavailable',
    /** Vượt trần số lượng mỗi dòng. */
    MAX_QUANTITY_EXCEEDED = 'max_quantity_exceeded',
    /** Giá đã đổi so với lúc thêm vào giỏ — CẢNH BÁO, không chặn đặt hàng. */
    PRICE_CHANGED = 'price_changed',
}

export enum AddToCartStatus {
    /** Thêm đủ số lượng yêu cầu. */
    ADDED = 'added',
    /** Chỉ thêm được một phần (còn hàng nhưng ít hơn yêu cầu). */
    ADJUSTED = 'adjusted',
    /** Không thêm được gì — giỏ hàng giữ nguyên. */
    REJECTED = 'rejected',
}

/**
 * Issue duy nhất KHÔNG chặn đặt hàng. Tách riêng để `hasBlockingIssues` và
 * `canPlaceOrder` chỉ có một nguồn sự thật, tránh mỗi nơi tự liệt kê một kiểu.
 */
export const NON_BLOCKING_ISSUES: readonly CartItemIssue[] = [CartItemIssue.PRICE_CHANGED];

export const isBlockingIssue = (issue: CartItemIssue): boolean =>
    !NON_BLOCKING_ISSUES.includes(issue);

/** Trần số lượng mỗi dòng — chặn khách gõ nhầm 9999 và chặn spam làm phình giỏ. */
export const MAX_QUANTITY_PER_ITEM = 99;
