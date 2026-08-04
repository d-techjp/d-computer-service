import {
    Body,
    Controller,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result.dto';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
    constructor(private readonly brandsService: BrandsService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Danh sách thương hiệu (public)' })
    findAll(@Query() query: QueryBrandDto): Promise<PaginatedResult<Brand>> {
        return this.brandsService.findAll(query);
    }

    @Public()
    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết thương hiệu theo slug (public)' })
    findBySlug(@Param('slug') slug: string): Promise<Brand> {
        return this.brandsService.findBySlug(slug);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết thương hiệu theo id (public)' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Brand> {
        return this.brandsService.findOne(id);
    }

    @ApiBearerAuth()
    @Post()
    @RequirePermissions(PermissionCode.PRODUCT_BRAND_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'brand' })
    @ApiOperation({ summary: 'Tạo thương hiệu' })
    create(@Body() dto: CreateBrandDto): Promise<Brand> {
        return this.brandsService.create(dto);
    }

    @ApiBearerAuth()
    @Patch(':id')
    @RequirePermissions(PermissionCode.PRODUCT_BRAND_MANAGE)
    @LogActivity({ action: ActivityAction.UPDATE, resource: 'brand' })
    @ApiOperation({ summary: 'Cập nhật thương hiệu' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
        return this.brandsService.update(id, dto);
    }

    @ApiBearerAuth()
    @Delete(':id')
    @RequirePermissions(PermissionCode.PRODUCT_BRAND_MANAGE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @LogActivity({ action: ActivityAction.DELETE, resource: 'brand' })
    @ApiOperation({ summary: 'Xoá mềm thương hiệu' })
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.brandsService.remove(id);
    }
}
