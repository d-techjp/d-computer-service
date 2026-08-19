export enum UploadFolder {
    PRODUCTS = 'products',
    ARTICLES = 'articles',
    TIKTOK = 'tiktok',
}

/** SVG cố tình không nằm trong allowlist — có thể nhúng script, rủi ro XSS khi hiển thị trực tiếp. */
export const ALLOWED_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_REQUEST = 10;

export const MIME_TO_EXTENSION: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};
