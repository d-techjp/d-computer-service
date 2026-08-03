import * as Joi from 'joi';

/**
 * Fail-fast khi thiếu/không hợp lệ biến môi trường: app sẽ không boot nếu cấu hình sai.
 */
export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'test', 'staging', 'production')
        .default('development'),
    PORT: Joi.number().port().default(3000),
    API_PREFIX: Joi.string().default('api'),
    API_VERSION: Joi.string().default('v1'),

    DB_URL: Joi.string().required(),
    DB_RUN_MIGRATIONS: Joi.boolean().truthy('1').falsy('0').default(false),

    JWT_SECRET: Joi.string().min(6).required().messages({
        'string.min': 'JWT_SECRET phải dài tối thiểu 6 ký tự',
    }),
    JWT_EXPIRES_IN: Joi.string().default('1d'),

    TOKEN_VERSION_SWEEP_INTERVAL: Joi.number().integer().min(10).default(300),

    // Không bắt buộc lúc boot — chỉ cần khi thật sự gọi endpoint upload, tránh chặn
    // các luồng dev/test không đụng tới tính năng ảnh. UploadsService tự báo lỗi rõ ràng
    // nếu thiếu khi có request upload thật.
    R2_ACCOUNT_ID: Joi.string().allow('').default(''),
    R2_ACCESS_KEY_ID: Joi.string().allow('').default(''),
    R2_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
    R2_BUCKET_NAME: Joi.string().allow('').default(''),
    R2_PUBLIC_URL: Joi.string().allow('').default(''),

    // tlds:false để chấp nhận domain nội bộ như *.local, *.internal khi chạy dev
    SEED_ADMIN_EMAIL: Joi.string()
        .email({ tlds: { allow: false } })
        .default('admin@dcomputer.local'),
    SEED_ADMIN_PASSWORD: Joi.string().min(8).default('Admin@123456'),
    SEED_ADMIN_NAME: Joi.string().default('System Administrator'),
});
