import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { Category } from '../entities/category.entity';
import { ClientCategoriesService } from './client-categories.service';
import { ClientQueryCategoryDto } from './dto/client-query-category.dto';

@ApiTags('Categories')
@Public()
@Controller('categories')
export class ClientCategoriesController {
    constructor(private readonly categoriesService: ClientCategoriesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách danh mục đang hoạt động' })
    findAll(@Query() query: ClientQueryCategoryDto): Promise<PaginatedResult<Category>> {
        return this.categoriesService.findAll(query);
    }

    @Get('tree')
    @ApiOperation({ summary: 'Cây danh mục nhiều cấp, chỉ gồm danh mục đang hoạt động' })
    findTree(): Promise<Category[]> {
        return this.categoriesService.findTree();
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết danh mục theo slug' })
    findBySlug(@Param('slug') slug: string): Promise<Category> {
        return this.categoriesService.findBySlug(slug);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết danh mục theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
        return this.categoriesService.findOne(id);
    }
}
