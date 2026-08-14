import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { User } from '../../users/entities/user.entity';
import {
    InventoryReasonCode,
    InventoryReferenceType,
    InventoryTransactionType,
} from '../enums/inventory.enum';

/**
 * Sổ nhập-xuất kho — chỉ ghi thêm (append-only), không update/delete từ tầng
 * nghiệp vụ. Vì vậy không dùng BaseEntity (không cần updated_at / deleted_at),
 * mô phỏng đúng `ActivityLog`.
 */
@Entity('inventory_transactions')
@Index('idx_inventory_transactions_variant_created', ['variantId', 'createdAt'])
@Index('idx_inventory_transactions_reference', ['referenceType', 'referenceId'])
export class InventoryTransaction {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiPropertyOptional({ description: 'null nếu biến thể đã bị xoá' })
    @Column({ type: 'uuid', nullable: true })
    variantId: string | null;

    @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'variant_id' })
    variant: ProductVariant | null;

    @ApiProperty({ enum: InventoryTransactionType })
    @Column({ type: 'enum', enum: InventoryTransactionType })
    type: InventoryTransactionType;

    @ApiProperty({ enum: InventoryReasonCode })
    @Column({ type: 'enum', enum: InventoryReasonCode })
    reasonCode: InventoryReasonCode;

    @ApiProperty({ example: 10, description: 'Luôn dương — chiều nhập/xuất nằm ở `type`' })
    @Column({ type: 'int' })
    quantity: number;

    @ApiProperty({ example: 25 })
    @Column({ type: 'int' })
    stockBefore: number;

    @ApiProperty({ example: 35 })
    @Column({ type: 'int' })
    stockAfter: number;

    @ApiPropertyOptional({ enum: InventoryReferenceType })
    @Column({ type: 'enum', enum: InventoryReferenceType, nullable: true })
    referenceType: InventoryReferenceType | null;

    @ApiPropertyOptional({ description: 'Id đơn hàng khi referenceType = order' })
    @Column({ type: 'uuid', nullable: true })
    referenceId: string | null;

    @ApiPropertyOptional({ description: 'null nếu do hệ thống tự ghi (vd huỷ đơn tự động)' })
    @Column({ type: 'uuid', nullable: true })
    performedById: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'performed_by_id' })
    performedBy: User | null;

    @ApiPropertyOptional()
    @Column({ type: 'text', nullable: true })
    note: string | null;

    @ApiProperty()
    @Index('idx_inventory_transactions_created_at')
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
