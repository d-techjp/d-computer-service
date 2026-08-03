import { BadRequestException } from '@nestjs/common';
// Không nằm trong barrel export của @nestjs/platform-express nên phải import sâu.
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from './constants/upload.constants';

const fileFilter: MulterOptions['fileFilter'] = (_req, file, callback) => {
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
        callback(
            new BadRequestException(
                `Định dạng ${file.mimetype} không được hỗ trợ. Chỉ nhận: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
            ),
            false,
        );
        return;
    }
    callback(null, true);
};

/**
 * Dùng memoryStorage (buffer trong RAM) thay vì lưu tạm ra đĩa — ảnh nhỏ (giới hạn 5MB),
 * upload thẳng buffer lên R2 rồi thôi, không cần dọn file tạm.
 */
export const buildImageMulterOptions = (maxFiles?: number): MulterOptions => ({
    storage: memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES,
        ...(maxFiles ? { files: maxFiles } : {}),
    },
    fileFilter,
});
