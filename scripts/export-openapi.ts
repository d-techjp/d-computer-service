import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import * as YAML from 'js-yaml';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/swagger.config';

loadEnv();

/**
 * Dựng toàn bộ Nest app (cần Postgres đang chạy vì TypeOrmModule kết nối lúc khởi tạo)
 * chỉ để lấy document OpenAPI rồi ghi ra file — không `listen()`.
 * Áp cùng globalPrefix/versioning như main.ts để path trong file khớp API thật.
 */
async function main(): Promise<void> {
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

    const config = app.get(ConfigService);
    const apiPrefix = config.get<string>('app.apiPrefix', 'api');
    const apiVersion = config.get<string>('app.apiVersion', 'v1');

    app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: apiVersion.replace(/^v/, ''),
        prefix: 'v',
    });

    await app.init();

    const document = createOpenApiDocument(app);
    const outDir = join(__dirname, '..', 'openapi');
    mkdirSync(outDir, { recursive: true });

    writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
    writeFileSync(join(outDir, 'openapi.yaml'), YAML.dump(document));

    await app.close();

    const logger = new Logger('ExportOpenApi');
    logger.log(`Đã ghi openapi/openapi.json và openapi/openapi.yaml`);
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Export OpenAPI thất bại: ${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exit(1);
});
