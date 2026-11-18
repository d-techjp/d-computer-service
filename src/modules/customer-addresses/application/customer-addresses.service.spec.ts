import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CustomerAddressesRepository } from '../domain/customer-addresses.repository';
import type { CustomerAddress } from '../entities/customer-address.entity';
import { CustomerAddressesService, MAX_ADDRESSES_PER_USER } from './customer-addresses.service';

/** Repository giả trong bộ nhớ — đủ để kiểm bất biến "luôn đúng một mặc định". */
function inMemoryRepository() {
    let rows: CustomerAddress[] = [];
    let seq = 0;
    const repo: CustomerAddressesRepository = {
        create: (data) => ({ ...data }) as CustomerAddress,
        save: (address) => {
            if (!address.id) address.id = `a${++seq}`;
            address.updatedAt = new Date(Date.now() + seq++);
            rows = [...rows.filter((row) => row.id !== address.id), address];
            return Promise.resolve(address);
        },
        listByUser: (userId) => Promise.resolve(rows.filter((row) => row.userId === userId)),
        countByUser: (userId) =>
            Promise.resolve(rows.filter((row) => row.userId === userId).length),
        findOwned: (userId, id) =>
            Promise.resolve(rows.find((row) => row.id === id && row.userId === userId) ?? null),
        remove: (address) => {
            rows = rows.filter((row) => row.id !== address.id);
            return Promise.resolve();
        },
        makeDefault: (userId, id) => {
            rows.forEach((row) => {
                if (row.userId === userId) row.isDefault = row.id === id;
            });
            return Promise.resolve();
        },
        promoteNewest: async (userId) => {
            const [newest] = rows
                .filter((row) => row.userId === userId)
                .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            if (newest) await repo.makeDefault(userId, newest.id);
        },
    };
    return {
        repo,
        defaults: (userId: string) => rows.filter((r) => r.userId === userId && r.isDefault),
    };
}

const input = {
    fullName: '山田 太郎',
    phone: '090-1234-5678',
    province: '大阪府',
    street: '1-2-3',
};

describe('CustomerAddressesService', () => {
    it('địa chỉ đầu tiên tự thành mặc định, cái sau thì không', async () => {
        const { repo } = inMemoryRepository();
        const service = new CustomerAddressesService(repo);
        expect((await service.create('u1', input)).isDefault).toBe(true);
        expect((await service.create('u1', input)).isDefault).toBe(false);
    });

    it('đặt mặc định mới thì bỏ cờ của cái cũ', async () => {
        const { repo, defaults } = inMemoryRepository();
        const service = new CustomerAddressesService(repo);
        await service.create('u1', input);
        const second = await service.create('u1', { ...input, isDefault: true });
        expect(defaults('u1').map((row) => row.id)).toEqual([second.id]);
    });

    it('xoá địa chỉ mặc định thì địa chỉ còn lại được nâng lên', async () => {
        const { repo, defaults } = inMemoryRepository();
        const service = new CustomerAddressesService(repo);
        const first = await service.create('u1', input);
        const second = await service.create('u1', input);
        await service.remove('u1', first.id);
        expect(defaults('u1').map((row) => row.id)).toEqual([second.id]);
    });

    it('không cho bỏ cờ mặc định bằng isDefault: false', async () => {
        const { repo } = inMemoryRepository();
        const service = new CustomerAddressesService(repo);
        const first = await service.create('u1', input);
        expect((await service.update('u1', first.id, { isDefault: false })).isDefault).toBe(true);
    });

    it('không đụng được địa chỉ của người khác, và có giới hạn số lượng', async () => {
        const { repo } = inMemoryRepository();
        const service = new CustomerAddressesService(repo);
        const mine = await service.create('u1', input);
        await expect(service.remove('u2', mine.id)).rejects.toBeInstanceOf(NotFoundException);
        for (let i = 1; i < MAX_ADDRESSES_PER_USER; i += 1) await service.create('u1', input);
        await expect(service.create('u1', input)).rejects.toBeInstanceOf(BadRequestException);
    });
});
