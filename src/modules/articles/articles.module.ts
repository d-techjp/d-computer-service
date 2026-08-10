import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { AdminArticlesController } from './admin/admin-articles.controller';
import { ArticlesService } from './application/articles.service';
import { ClientArticlesController } from './client/client-articles.controller';
import { ClientArticlesService } from './client/client-articles.service';
import { ArticlesRepository } from './domain/articles.repository';
import { Article } from './entities/article.entity';
import { TypeOrmArticlesRepository } from './infrastructure/typeorm-articles.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Article]), CategoriesModule],
    controllers: [ClientArticlesController, AdminArticlesController],
    providers: [
        ArticlesService,
        ClientArticlesService,
        { provide: ArticlesRepository, useClass: TypeOrmArticlesRepository },
    ],
    // Chỉ export service lõi — module khác dùng nghiệp vụ chung, không dùng bản siết cho storefront
    exports: [ArticlesService],
})
export class ArticlesModule {}
