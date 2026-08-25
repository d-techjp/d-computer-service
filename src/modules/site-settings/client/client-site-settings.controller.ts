import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ClientSiteSettingsService } from './client-site-settings.service';
import type { PublicSiteSettingsDto } from './dto/public-site-settings.dto';

@ApiTags('Site Settings')
@Public()
@Controller('site-settings')
export class ClientSiteSettingsController {
    constructor(private readonly clientSiteSettingsService: ClientSiteSettingsService) {}

    @Get()
    @ApiOperation({
        summary: 'Thông tin cửa hàng cho footer — tên, hotline, địa chỉ, link mạng xã hội',
    })
    findOne(): Promise<PublicSiteSettingsDto> {
        return this.clientSiteSettingsService.find();
    }
}
