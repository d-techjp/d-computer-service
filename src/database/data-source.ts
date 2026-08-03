import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { configuration } from '../config/configuration';
import { buildDataSourceOptions } from '../config/typeorm.config';

loadEnv();

/**
 * DataSource dành riêng cho TypeORM CLI (migration:generate / run / revert).
 * Runtime của app dùng TypeOrmModule.forRootAsync trong AppModule.
 */
export default new DataSource(buildDataSourceOptions(configuration().database));
