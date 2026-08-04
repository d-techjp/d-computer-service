import { Module } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
    controllers: [UploadsController],
    providers: [UploadsService, R2StorageService],
    exports: [UploadsService],
})
export class UploadsModule {}
