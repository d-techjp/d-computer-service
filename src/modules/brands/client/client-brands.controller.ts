import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { Brand } from '../entities/brand.entity';
import { ClientBrandsService } from './client-brands.service';
import { ClientQueryBrandDto } from './dto/client-query-brand.dto';

@ApiTags('Brands')
@Public()
@Controller('brands')
export class ClientBrandsController {
    constructor(private readonly brandsService: ClientBrandsService) {}

    @Get()
    @ApiOperation({ summary: 'Danh sách thương hiệu đang hoạt động' })
    findAll(@Query() query: ClientQueryBrandDto): Promise<PaginatedResult<Brand>> {
        return this.brandsService.findAll(query);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Chi tiết thương hiệu theo slug' })
    findBySlug(@Param('slug') slug: string): Promise<Brand> {
        return this.brandsService.findBySlug(slug);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết thương hiệu theo id' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Brand> {
        return this.brandsService.findOne(id);
    }
}
