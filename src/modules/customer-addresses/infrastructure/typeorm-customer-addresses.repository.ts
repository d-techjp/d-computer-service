import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAddressesRepository } from '../domain/customer-addresses.repository';
import { CustomerAddress } from '../entities/customer-address.entity';

@Injectable()
export class TypeOrmCustomerAddressesRepository extends CustomerAddressesRepository {
    constructor(
        @InjectRepository(CustomerAddress)
        private readonly repo: Repository<CustomerAddress>,
    ) {
        super();
    }

    create(data: Partial<CustomerAddress>): CustomerAddress {
        return this.repo.create(data);
    }

    save(address: CustomerAddress): Promise<CustomerAddress> {
        return this.repo.save(address);
    }

    listByUser(userId: string): Promise<CustomerAddress[]> {
        return this.repo.find({
            where: { userId },
            order: { isDefault: 'DESC', updatedAt: 'DESC' },
        });
    }

    countByUser(userId: string): Promise<number> {
        return this.repo.count({ where: { userId } });
    }

    findOwned(userId: string, id: string): Promise<CustomerAddress | null> {
        return this.repo.findOne({ where: { id, userId } });
    }

    async remove(address: CustomerAddress): Promise<void> {
        await this.repo.delete({ id: address.id, userId: address.userId });
    }

    async makeDefault(userId: string, id: string): Promise<void> {
        // Bỏ cờ cũ TRƯỚC: index unique một phần không cho hai dòng mặc định cùng lúc
        await this.repo.manager.transaction(async (manager) => {
            await manager.update(
                CustomerAddress,
                { userId, isDefault: true },
                { isDefault: false },
            );
            await manager.update(CustomerAddress, { id, userId }, { isDefault: true });
        });
    }

    async promoteNewest(userId: string): Promise<void> {
        const [newest] = await this.repo.find({
            where: { userId },
            order: { updatedAt: 'DESC' },
            take: 1,
        });
        if (newest) await this.makeDefault(userId, newest.id);
    }
}
