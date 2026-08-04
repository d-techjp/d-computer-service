import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from './role.entity';

/**
 * Một quyền thao tác, định danh bằng `code` dạng `module.action`.
 *
 * Không soft-delete: permission bị xoá phải rời khỏi mọi role ngay, giữ lại bản ghi
 * đã xoá chỉ làm sai lệch kết quả kiểm tra quyền.
 */
@Entity('permissions')
export class Permission extends BaseEntity {
    @ApiProperty({ example: 'product.manage' })
    @Index('uq_permissions_code', { unique: true })
    @Column({ type: 'varchar', length: 100 })
    code: string;

    @ApiProperty({ example: 'Quản lý sản phẩm' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    /** Gom nhóm để admin UI hiển thị theo module thay vì một danh sách phẳng. */
    @ApiProperty({ example: 'product' })
    @Index('idx_permissions_module')
    @Column({ type: 'varchar', length: 50 })
    module: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string | null;

    @ManyToMany(() => Role, (role) => role.permissions)
    roles: Role[];
}
