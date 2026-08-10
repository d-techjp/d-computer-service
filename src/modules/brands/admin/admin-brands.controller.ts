import {
    Body,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { LogActivity } from '../../../common/decorators/activity-log.decorator';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../../common/enums/permission.enum';
import { ActivityAction } from '../../activity-logs/enums/activity-action.enum';
import { BrandsService } from '../application/brands.service';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { QueryBrandDto } from '../dto/query-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { Brand } from '../entities/brand.entity';

@AdminController('brands', 'Brands')
@RequirePermissions(PermissionCode.PRODUCT_BRAND_MANAGE)
export class AdminBrandsController {
    constructor(private readonly brandsService: BrandsService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách thương hiệu, gồm cả thương hiệu đã tắt' })
    findAll(@Query() query: QueryBrandDto): Promise<PaginatedResult<Brand>> {
        return this.brandsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết thương hiệu theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Brand> {
        return this.brandsService.findOne(id);
    }

    @Post()
    @LogActivity({ action: ActivityAction.CREATE, resource: 'brand' })
    @ApiOperation({ summary: 'Tạo thương hiệu' })
    create(@Body() dto: CreateBrandDto): Promise<Brand> {
        return this.brandsService.create(dto);
    }

    @Patch(':id')
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'brand' })
    @ApiOperation({ summary: 'Cập nhật thương hiệu' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
        return this.brandsService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'brand' })
    @ApiOperation({ summary: 'Xoá mềm thương hiệu' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.brandsService.remove(id);
    }
}
