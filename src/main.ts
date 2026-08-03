import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './swagger.config';

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

    const document = createOpenApiDocument(app);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: { persistAuthorization: true },
    });

    await app.listen(port);

    const logger = new Logger('Bootstrap');
    logger.log(`Server chạy tại http://localhost:${port}/${apiPrefix}/${apiVersion}`);
    logger.log(`Swagger: http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
