import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MIME_TO_EXTENSION, type UploadFolder } from './constants/upload.constants';
import type { UploadImageResponseDto } from './dto/upload-image-response.dto';
import { R2StorageService } from './r2-storage.service';

@Injectable()
export class UploadsService {
    constructor(private readonly r2StorageService: R2StorageService) {}

    async uploadImage(
        file: Express.Multer.File | undefined,
        folder: UploadFolder,
    ): Promise<UploadImageResponseDto> {
        if (!file) throw new BadRequestException('Vui lòng chọn ảnh cần tải lên');

        const key = this.buildObjectKey(folder, file);
        const { url } = await this.r2StorageService.upload(key, file.buffer, file.mimetype);

        return {
            url,
            key,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };
    }

    async uploadImages(
        files: Express.Multer.File[] | undefined,
        folder: UploadFolder,
    ): Promise<UploadImageResponseDto[]> {
        if (!files || files.length === 0) {
            throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh cần tải lên');
        }

        return Promise.all(files.map((file) => this.uploadImage(file, folder)));
    }

    /** `${folder}/<uuid>.<ext>` — tên ngẫu nhiên, không phụ thuộc tên file gốc của người dùng. */
    private buildObjectKey(folder: UploadFolder, file: Express.Multer.File): string {
        const ext = MIME_TO_EXTENSION[file.mimetype] ?? extname(file.originalname).toLowerCase();
        return `${folder}/${randomUUID()}${ext}`;
    }
}
