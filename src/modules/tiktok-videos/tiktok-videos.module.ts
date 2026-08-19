import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTiktokVideosController } from './admin/admin-tiktok-videos.controller';
import { TiktokVideosService } from './application/tiktok-videos.service';
import { ClientTiktokVideosController } from './client/client-tiktok-videos.controller';
import { ClientTiktokVideosService } from './client/client-tiktok-videos.service';
import { TiktokVideosRepository } from './domain/tiktok-videos.repository';
import { TiktokVideo } from './entities/tiktok-video.entity';
import { TypeOrmTiktokVideosRepository } from './infrastructure/typeorm-tiktok-videos.repository';

@Module({
    imports: [TypeOrmModule.forFeature([TiktokVideo])],
    controllers: [ClientTiktokVideosController, AdminTiktokVideosController],
    providers: [
        TiktokVideosService,
        ClientTiktokVideosService,
        { provide: TiktokVideosRepository, useClass: TypeOrmTiktokVideosRepository },
    ],
    exports: [TiktokVideosService],
})
export class TiktokVideosModule {}
