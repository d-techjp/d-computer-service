import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { configuration } from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { buildDataSourceOptions, type DatabaseConfig } from './config/typeorm.config';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CarouselsModule } from './modules/carousels/carousels.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { RedisModule } from './redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            load: [configuration],
            validationSchema: envValidationSchema,
            validationOptions: { abortEarly: false },
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                ...buildDataSourceOptions(configService.getOrThrow<DatabaseConfig>('database')),
                autoLoadEntities: true,
                migrationsRun: configService.get<boolean>('database.runMigrations', false),
            }),
        }),

        RedisModule,

        ActivityLogsModule,
        AuthModule,
        RbacModule,
        UsersModule,
        CategoriesModule,
        BrandsModule,
        ProductsModule,
        InventoryModule,
        CarouselsModule,
        ArticlesModule,
        OrdersModule,
        CartModule,
        UploadsModule,
        HealthModule,
    ],
    providers: [
        // Thứ tự quan trọng: xác thực trước, phân quyền sau.
        // RolesGuard giữ lại cho các route còn khai báo `@Roles(...)`; route mới
        // dùng `@RequirePermissions(...)` để role tự tạo cũng phân quyền được.
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },

        // Interceptor đăng ký trước = lớp ngoài cùng. Chiều response đi từ trong ra:
        // ClassSerializer (ẩn field @Exclude) -> ActivityLog (thấy entity gốc) -> Transform (bọc envelope)
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
        { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },

        { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
})
export class AppModule {}
