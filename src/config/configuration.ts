const toBool = (value: string | undefined, fallback = false): boolean => {
    if (value === undefined) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const toInt = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

export const BCRYPT_SALT_ROUNDS = 10;

export const configuration = () => ({
    app: {
        env: process.env.NODE_ENV ?? 'development',
        port: toInt(process.env.PORT, 3000),
        apiPrefix: process.env.API_PREFIX ?? 'api',
        apiVersion: process.env.API_VERSION ?? 'v1',
    },
    database: {
        url:
            process.env.DB_URL ??
            'postgresql://postgres:postgres@localhost:5432/d_computer_service',
        runMigrations: toBool(process.env.DB_RUN_MIGRATIONS, false),
    },
    jwt: {
        secret: process.env.JWT_SECRET ?? '',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
        issuer: process.env.JWT_ISSUER ?? 'd-computer-service',
    },
    r2: {
        accountId: process.env.R2_ACCOUNT_ID ?? '',
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        bucket: process.env.R2_BUCKET_NAME ?? '',
        // Domain public để dựng URL trả về client — custom domain hoặc *.r2.dev đã bật public access
        publicUrl: (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, ''),
    },
    seed: {
        adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@dcomputer.local',
        adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
        adminName: process.env.SEED_ADMIN_NAME ?? 'System Administrator',
    },
});

export type AppConfig = ReturnType<typeof configuration>;
