import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from '../database/snake-naming.strategy';

export interface DatabaseConfig {
    url: string;
}

/**
 * Nguồn sự thật duy nhất cho cấu hình TypeORM — dùng chung bởi AppModule (runtime)
 * và `src/database/data-source.ts` (TypeORM CLI / migration).
 */
export const buildDataSourceOptions = (config: DatabaseConfig): DataSourceOptions => ({
    type: 'postgres',
    url: config.url,
    schema: 'public',
    synchronize: false,
    logging: false,
    ssl: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
});
