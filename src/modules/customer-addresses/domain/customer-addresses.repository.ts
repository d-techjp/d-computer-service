import type { CustomerAddress } from '../entities/customer-address.entity';

export abstract class CustomerAddressesRepository {
    abstract create(data: Partial<CustomerAddress>): CustomerAddress;

    abstract save(address: CustomerAddress): Promise<CustomerAddress>;

    /** Mặc định đứng đầu, sau đó mới sửa gần nhất. */
    abstract listByUser(userId: string): Promise<CustomerAddress[]>;

    abstract countByUser(userId: string): Promise<number>;

    /** `null` khi không có hoặc không thuộc về `userId`. */
    abstract findOwned(userId: string, id: string): Promise<CustomerAddress | null>;

    abstract remove(address: CustomerAddress): Promise<void>;

    /** Bỏ cờ mặc định cũ rồi gắn cho `id`, trong một transaction. */
    abstract makeDefault(userId: string, id: string): Promise<void>;

    /** Gắn mặc định cho địa chỉ sửa gần nhất — dùng sau khi xoá địa chỉ mặc định. */
    abstract promoteNewest(userId: string): Promise<void>;
}
