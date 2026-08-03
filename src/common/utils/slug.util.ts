/**
 * Chuyển chuỗi (kể cả tiếng Việt có dấu) thành slug an toàn cho URL.
 * "Laptop Dell Vostro 15" -> "laptop-dell-vostro-15"
 */
export const slugify = (input: string): string =>
    input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // bỏ dấu thanh/dấu phụ
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

/** Thêm hậu tố ngẫu nhiên để tránh trùng slug. */
export const uniqueSlug = (input: string): string =>
    `${slugify(input)}-${Math.random().toString(36).slice(2, 8)}`;
