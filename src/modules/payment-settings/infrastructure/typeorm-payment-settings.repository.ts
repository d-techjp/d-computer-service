import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettingsRepository } from '../domain/payment-settings.repository';
import { PaymentSettings } from '../entities/payment-settings.entity';

/** Adapter TypeORM/Postgres cho `PaymentSettingsRepository`. */
@Injectable()
export class TypeOrmPaymentSettingsRepository extends PaymentSettingsRepository {
    constructor(
        @InjectRepository(PaymentSettings)
        private readonly repo: Repository<PaymentSettings>,
    ) {
        super();
    }

    create(data: Partial<PaymentSettings>): PaymentSettings {
        return this.repo.create(data);
    }

    save(settings: PaymentSettings): Promise<PaymentSettings> {
        return this.repo.save(settings);
    }

    async find(): Promise<PaymentSettings | null> {
        // `createdAt ASC` để lỡ có nhiều dòng thì luôn lấy đúng bản ghi gốc
        const [settings] = await this.repo.find({ order: { createdAt: 'ASC' }, take: 1 });
        return settings ?? null;
    }
}
