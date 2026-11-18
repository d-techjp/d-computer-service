import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerAddressesRepository } from '../domain/customer-addresses.repository';
import type { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';
import type { CustomerAddress } from '../entities/customer-address.entity';

/** Đủ cho nhà, công ty, nhà bố mẹ… mà không thành chỗ chứa dữ liệu vô hạn. */
export const MAX_ADDRESSES_PER_USER = 10;

/**
 * Sổ địa chỉ của khách đăng nhập. Bất biến: sổ không rỗng thì luôn có đúng một
 * địa chỉ mặc định — checkout dựa vào đó để chọn sẵn.
 */
@Injectable()
export class CustomerAddressesService {
    constructor(private readonly repository: CustomerAddressesRepository) {}

    list(userId: string): Promise<CustomerAddress[]> {
        return this.repository.listByUser(userId);
    }

    async create(userId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
        const count = await this.repository.countByUser(userId);
        if (count >= MAX_ADDRESSES_PER_USER) {
            throw new BadRequestException(`Chỉ lưu được tối đa ${MAX_ADDRESSES_PER_USER} địa chỉ`);
        }

        const { isDefault, ...fields } = dto;
        const address = await this.repository.save(
            this.repository.create({ ...this.normalize(fields), userId, isDefault: false }),
        );
        if (count === 0 || isDefault) await this.repository.makeDefault(userId, address.id);
        return this.getOwned(userId, address.id);
    }

    async update(userId: string, id: string, dto: UpdateAddressDto): Promise<CustomerAddress> {
        const address = await this.getOwned(userId, id);
        // `isDefault: false` bị bỏ qua: không được để sổ rơi vào trạng thái không có
        // mặc định — muốn đổi thì đặt mặc định cho địa chỉ khác.
        const { isDefault, ...fields } = dto;
        Object.assign(address, this.normalize(fields));
        await this.repository.save(address);
        if (isDefault && !address.isDefault) await this.repository.makeDefault(userId, id);
        return this.getOwned(userId, id);
    }

    async setDefault(userId: string, id: string): Promise<CustomerAddress> {
        await this.getOwned(userId, id);
        await this.repository.makeDefault(userId, id);
        return this.getOwned(userId, id);
    }

    async remove(userId: string, id: string): Promise<void> {
        const address = await this.getOwned(userId, id);
        await this.repository.remove(address);
        if (address.isDefault) await this.repository.promoteNewest(userId);
    }

    private async getOwned(userId: string, id: string): Promise<CustomerAddress> {
        const address = await this.repository.findOwned(userId, id);
        // 404 cả khi địa chỉ thuộc người khác — không để lộ là id đó có tồn tại
        if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
        return address;
    }

    /** Trường tuỳ chọn gửi chuỗi rỗng thì lưu `null`, để FE hiển thị gọn. */
    private normalize(fields: Omit<UpdateAddressDto, 'isDefault'>): Partial<CustomerAddress> {
        const result: Partial<CustomerAddress> = { ...fields };
        for (const key of ['label', 'district', 'ward'] as const) {
            if (key in fields) result[key] = fields[key] || null;
        }
        return result;
    }
}
