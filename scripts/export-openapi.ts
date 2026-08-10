import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import * as YAML from 'js-yaml';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument, pickAudience } from '../src/swagger.config';

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

    // openapi.json giữ nguyên bản đầy đủ — `generate-postman.ts` đọc file này để
    // dựng một collection duy nhất. Hai file tách thêm là để chia cho từng team FE.
    writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));
    writeFileSync(join(outDir, 'openapi.yaml'), YAML.dump(document));

    for (const audience of ['client', 'admin'] as const) {
        const scoped = pickAudience(document, audience);
        writeFileSync(join(outDir, `openapi.${audience}.json`), JSON.stringify(scoped, null, 2));
        writeFileSync(join(outDir, `openapi.${audience}.yaml`), YAML.dump(scoped));
    }

    await app.close();

    const logger = new Logger('ExportOpenApi');
    logger.log('Đã ghi openapi/openapi.{json,yaml} và bản tách openapi.{client,admin}.{json,yaml}');
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Export OpenAPI thất bại: ${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exit(1);
});
