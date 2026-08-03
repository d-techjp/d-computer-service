import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadedObject {
    key: string;
    url: string;
}

/**
 * Wrapper mỏng quanh S3Client trỏ vào Cloudflare R2 (R2 tương thích S3 API).
 * Chỉ có upload — feature hiện tại chỉ cần lưu ảnh khi tạo/sửa sản phẩm & bài viết,
 * chưa cần xoá/list nên không thêm để tránh code chết.
 */
@Injectable()
export class R2StorageService {
    private readonly logger = new Logger(R2StorageService.name);
    private readonly client: S3Client;
    private readonly bucket: string;
    private readonly publicUrl: string;
    private readonly configured: boolean;

    constructor(configService: ConfigService) {
        const accountId = configService.get<string>('r2.accountId', '');
        const accessKeyId = configService.get<string>('r2.accessKeyId', '');
        const secretAccessKey = configService.get<string>('r2.secretAccessKey', '');
        this.bucket = configService.get<string>('r2.bucket', '');
        this.publicUrl = configService.get<string>('r2.publicUrl', '');

        this.configured = Boolean(
            accountId && accessKeyId && secretAccessKey && this.bucket && this.publicUrl,
        );

        // Vẫn khởi tạo client dù thiếu cấu hình — AWS SDK không validate lúc construct,
        // lỗi rõ ràng được báo ở `upload()` qua `assertConfigured()` thay vì lỗi SDK khó hiểu.
        this.client = new S3Client({
            region: 'auto',
            endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
            credentials: { accessKeyId, secretAccessKey },
        });

        if (!this.configured) {
            this.logger.warn(
                'Thiếu cấu hình R2 (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/' +
                    'R2_BUCKET_NAME/R2_PUBLIC_URL) — endpoint upload sẽ báo lỗi 503 khi được gọi',
            );
        }
    }

    async upload(key: string, body: Buffer, contentType: string): Promise<UploadedObject> {
        this.assertConfigured();

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
            }),
        );

        return { key, url: `${this.publicUrl}/${key}` };
    }

    private assertConfigured(): void {
        if (!this.configured) {
            throw new ServiceUnavailableException(
                'Chưa cấu hình Cloudflare R2 — liên hệ quản trị viên để bật tính năng tải ảnh lên',
            );
        }
    }
}
