import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface OutgoingMail {
    to: string | string[];
    subject: string;
    html: string;
    text: string;
    /**
     * Resend bỏ qua lần gửi trùng key trong 24h — sự kiện bắn lại (retry, hai
     * đường xác nhận thanh toán) cũng chỉ ra một email.
     */
    idempotencyKey?: string;
}

/**
 * Wrapper mỏng quanh Resend — chỗ duy nhất biết tới SDK. Thiếu cấu hình thì bỏ
 * qua (log cảnh báo), giống R2/Stripe: dev/test không cần key vẫn chạy được.
 *
 * KHÔNG ném lỗi: email là việc phụ, hỏng gửi mail không bao giờ được làm hỏng
 * luồng đặt hàng / đổi trạng thái đã commit xong.
 */
@Injectable()
export class MailSender {
    private readonly logger = new Logger(MailSender.name);
    private readonly client: Resend | null;
    private readonly from: string;
    private readonly replyTo: string | undefined;

    constructor(configService: ConfigService) {
        const apiKey = configService.get<string>('mail.resendApiKey', '');
        this.from = configService.get<string>('mail.from', '');
        this.replyTo = configService.get<string>('mail.replyTo') || undefined;
        this.client = apiKey && this.from ? new Resend(apiKey) : null;

        if (!this.client) {
            this.logger.warn('Thiếu RESEND_API_KEY hoặc MAIL_FROM — sẽ không gửi email nào');
        }
    }

    get enabled(): boolean {
        return this.client !== null;
    }

    async send(mail: OutgoingMail): Promise<boolean> {
        if (!this.client) {
            this.logger.debug(`Bỏ qua email "${mail.subject}" — chưa cấu hình Resend`);
            return false;
        }

        try {
            const { error } = await this.client.emails.send(
                {
                    from: this.from,
                    to: mail.to,
                    subject: mail.subject,
                    html: mail.html,
                    text: mail.text,
                    replyTo: this.replyTo,
                },
                mail.idempotencyKey ? { idempotencyKey: mail.idempotencyKey } : undefined,
            );
            if (error) {
                this.logger.error(
                    `Gửi email "${mail.subject}" lỗi: [${error.name}] ${error.message}`,
                );
                return false;
            }
            return true;
        } catch (error) {
            this.logger.error(
                `Gửi email "${mail.subject}" lỗi: ${error instanceof Error ? error.message : String(error)}`,
            );
            return false;
        }
    }
}
