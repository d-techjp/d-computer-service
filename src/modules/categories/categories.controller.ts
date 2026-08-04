import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseBoolPipe,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Danh sách danh mục (public)' })
    findAll(@Query() query: QueryCategoryDto): Promise<PaginatedResult<Category>> {
        return this.categoriesService.findAll(query);
    }

    @Public()
    @Get('tree')
    @ApiOperation({ summary: 'Cây danh mục nhiều cấp (public)' })
    @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
    findTree(
        @Query('onlyActive', new ParseBoolPipe({ optional: true })) onlyActive?: boolean,
    ): Promise<Category[]> {
        return this.categoriesService.findTree(onlyActive ?? true);
    }

    @Public()
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết danh mục theo slug (public)' })
    findBySlug(@Param('slug') slug: string): Promise<Category> {
        return this.categoriesService.findBySlug(slug);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết danh mục theo id (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
        return this.categoriesService.findOne(id);
    }

    @ApiBearerAuth()
    @Post()
    @RequirePermissions(PermissionCode.PRODUCT_CATEGORY_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'category' })
    @ApiOperation({ summary: 'Tạo danh mục' })
    create(@Body() dto: CreateCategoryDto): Promise<Category> {
        return this.categoriesService.create(dto);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @RequirePermissions(PermissionCode.PRODUCT_CATEGORY_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'category' })
    @ApiOperation({ summary: 'Cập nhật danh mục' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
    ): Promise<Category> {
        return this.categoriesService.update(id, dto);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @RequirePermissions(PermissionCode.PRODUCT_CATEGORY_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'category' })
    @ApiOperation({ summary: 'Xoá mềm danh mục' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.categoriesService.remove(id);
    }
}
