import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createOpenApiDocument, pickAudience } from './swagger.config';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    const config = app.get(ConfigService);
    const port = config.get<number>('app.port', 3000);
    const apiPrefix = config.get<string>('app.apiPrefix', 'api');
    const apiVersion = config.get<string>('app.apiVersion', 'v1');

    app.use(helmet());
    app.use(compression());
    app.set('trust proxy', 1); // lấy đúng client IP khi chạy sau reverse proxy

    app.enableCors({
        origin: true,
        credentials: true,
    });

    app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: apiVersion.replace(/^v/, ''),
        prefix: 'v',
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // loại field không khai báo trong DTO
            forbidNonWhitelisted: true, // báo lỗi nếu client gửi field lạ
            transform: true,
            transformOptions: { enableImplicitConversion: false },
        }),
    );

    app.enableShutdownHooks();

    // Hai tài liệu tách biệt để FE storefront và FE quản trị không phải đọc lẫn API của nhau
    const document = createOpenApiDocument(app);
    const swaggerOptions = { swaggerOptions: { persistAuthorization: true } };
    SwaggerModule.setup(
        `${apiPrefix}/docs/client`,
        app,
        pickAudience(document, 'client'),
        swaggerOptions,
    );
    SwaggerModule.setup(
        `${apiPrefix}/docs/admin`,
        app,
        pickAudience(document, 'admin'),
        swaggerOptions,
    );

    await app.listen(port);

    const logger = new Logger('Bootstrap');
    logger.log(`Server chạy tại http://localhost:${port}/${apiPrefix}/${apiVersion}`);
    logger.log(`Swagger client: http://localhost:${port}/${apiPrefix}/docs/client`);
    logger.log(`Swagger admin:  http://localhost:${port}/${apiPrefix}/docs/admin`);
}

void bootstrap();
