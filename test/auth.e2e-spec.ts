import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** `response.body` của supertest là `any` — ép về envelope chuẩn của API tại một chỗ. */
const bodyData = <T>(response: request.Response): T => (response.body as { data: T }).data;

interface AuthPayload {
    accessToken: string;
}

/**
 * E2E cho vòng đời token version — cần Postgres đang chạy và đã seed:
 *   npm run db:up && npm run migration:run && npm run seed && npm run test:e2e
 */
describe('Auth token version (e2e)', () => {
    let app: INestApplication<App>;
    const credentials = {
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@dcomputer.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
    };

    const login = async (): Promise<AuthPayload> => {
        const response = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send(credentials)
            .expect(200);
        return bodyData<AuthPayload>(response);
    };

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('từ chối request không có token', async () => {
        await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('từ chối sai mật khẩu', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ ...credentials, password: 'SaiMatKhau@1' })
            .expect(401);
    });

    it('login trả token dùng được và không lộ mật khẩu', async () => {
        const { accessToken } = await login();

        const profile = await request(app.getHttpServer())
            .get('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        const user = bodyData<{ email: string }>(profile);
        expect(user).not.toHaveProperty('password');
        expect(user.email).toBe(credentials.email);
    });

    it('login lần sau vô hiệu token cũ (token version tăng ở tầng server)', async () => {
        const first = await login();
        const second = await login();

        await request(app.getHttpServer())
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${first.accessToken}`)
            .expect(401);

        await request(app.getHttpServer())
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${second.accessToken}`)
            .expect(200);
    });

    it('logout tăng version và vô hiệu token đang dùng', async () => {
        const { accessToken } = await login();

        const logout = await request(app.getHttpServer())
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(typeof bodyData<{ tokenVersion: number }>(logout).tokenVersion).toBe('number');

        await request(app.getHttpServer())
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    });
});
