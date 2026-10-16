/**
 * Múi giờ dùng để gom số liệu theo ngày. Cột thời gian là `timestamptz` nên
 * Postgres sẽ gom theo UTC nếu không ép múi giờ — chart doanh thu sẽ lệch ngày
 * (đơn đặt lúc 8h sáng giờ Nhật rơi về ngày hôm trước). Đổi ở đây nếu cửa hàng
 * chuyển múi giờ; không nhận từ query để mọi người xem cùng một con số.
 */
export const DASHBOARD_TIME_ZONE = 'Asia/Tokyo';

/** Số ngày mặc định khi client không truyền `from`/`to`. */
export const DEFAULT_RANGE_DAYS = 30;

/**
 * Chặn khoảng quá dài: chart không đọc được và service phải bù hàng nghìn ngày
 * trống. Một năm nhuận là đủ cho mọi preset hiện có trên admin.
 */
export const MAX_RANGE_DAYS = 366;

/** Số sản phẩm trong chart "bán chạy". */
export const TOP_PRODUCTS_LIMIT = 8;
