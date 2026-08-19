import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ClientTiktokVideosService } from './client-tiktok-videos.service';
import type { PublicTiktokVideoDto } from './dto/public-tiktok-video.dto';

@ApiTags('TikTok Videos')
@Public()
@Controller('tiktok-videos')
export class ClientTiktokVideosController {
    constructor(private readonly tiktokVideosService: ClientTiktokVideosService) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách video TikTok đang bật',
        description:
            'Sắp theo `sortOrder` tăng dần. Không phân trang — số lượng video luôn nhỏ, ' +
            'giống `GET /carousels`.',
    })
    findAll(): Promise<PublicTiktokVideoDto[]> {
        return this.tiktokVideosService.findAll();
    }
}
