import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticlesRepository } from './domain/articles.repository';
import { Article } from './entities/article.entity';
import { TypeOrmArticlesRepository } from './infrastructure/typeorm-articles.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Article]), CategoriesModule],
    controllers: [ArticlesController],
    providers: [
        ArticlesService,
        { provide: ArticlesRepository, useClass: TypeOrmArticlesRepository },
    ],
    exports: [ArticlesService],
})
export class ArticlesModule {}
