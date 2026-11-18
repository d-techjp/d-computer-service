import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerAddressesService } from '../application/customer-addresses.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';
import { CustomerAddress } from '../entities/customer-address.entity';

/** Sổ địa chỉ của chính tài khoản đang đăng nhập — luôn khoá theo `userId` trong token. */
@ApiTags('Addresses')
@ApiBearerAuth()
@Controller('users/me/addresses')
export class ClientCustomerAddressesController {
    constructor(private readonly addressesService: CustomerAddressesService) {}

    @Get()
    @ApiOperation({ summary: 'Địa chỉ đã lưu — địa chỉ mặc định đứng đầu' })
    list(@CurrentUser('id') userId: string): Promise<CustomerAddress[]> {
        return this.addressesService.list(userId);
    }

    @Post()
    @ApiOperation({
        summary: 'Thêm địa chỉ',
        description: 'Tối đa 10 địa chỉ. Địa chỉ đầu tiên tự thành mặc định.',
    })
    create(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateAddressDto,
    ): Promise<CustomerAddress> {
        return this.addressesService.create(userId, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Sửa địa chỉ' })
    update(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddressDto,
    ): Promise<CustomerAddress> {
        return this.addressesService.update(userId, id, dto);
    }

    @Patch(':id/default')
    @ApiOperation({ summary: 'Đặt làm địa chỉ mặc định' })
    setDefault(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<CustomerAddress> {
        return this.addressesService.setDefault(userId, id);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Xoá địa chỉ',
        description: 'Xoá địa chỉ mặc định thì địa chỉ sửa gần nhất còn lại thành mặc định.',
    })
    remove(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<void> {
        return this.addressesService.remove(userId, id);
    }
}
