import {
    Body,
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
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { CategoriesService } from '../application/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { QueryCategoryDto } from '../dto/query-category.dto';
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '../entities/category.entity';

@AdminController('categories', 'Categories')
@RequirePermissions(PermissionCode.PRODUCT_CATEGORY_MANAGE)
export class AdminCategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách danh mục, gồm cả danh mục đã tắt' })
    findAll(@Query() query: QueryCategoryDto): Promise<PaginatedResult<Category>> {
        return this.categoriesService.findAll(query);
    }

    @Get('tree')
    @ApiOperation({ summary: 'Cây danh mục nhiều cấp' })
    @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
    findTree(
        @Query('onlyActive', new ParseBoolPipe({ optional: true })) onlyActive?: boolean,
    ): Promise<Category[]> {
        // Mặc định false: màn quản trị cần thấy cả nhánh đang tắt để bật lại
        return this.categoriesService.findTree(onlyActive ?? false);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết danh mục theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
        return this.categoriesService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'category' })
    @ApiOperation({ summary: 'Tạo danh mục' })
    create(@Body() dto: CreateCategoryDto): Promise<Category> {
        return this.categoriesService.create(dto);
    }

    @Patch('reorder')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({
        action: ActivityAction.UPDATE,
        resource: 'category',
        description: 'Sắp xếp lại thứ tự danh mục',
    })
    @ApiOperation({ summary: 'Cập nhật hàng loạt thứ tự hiển thị danh mục (kéo-thả)' })
    reorder(@Body() dto: ReorderCategoriesDto): Promise<void> {
        return this.categoriesService.reorder(dto.items);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'category' })
    @ApiOperation({ summary: 'Cập nhật danh mục' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
    ): Promise<Category> {
        return this.categoriesService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'category' })
    @ApiOperation({ summary: 'Xoá mềm danh mục' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.categoriesService.remove(id);
    }
}
