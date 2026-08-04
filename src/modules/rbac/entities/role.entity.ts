import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Permission } from './permission.entity';

/**
 * Vai trò gán cho user. `code` là thứ đi vào JWT và được `@Roles(...)` so khớp,
 * nên không cho sửa sau khi tạo.
 */
@Entity('roles')
export class Role extends SoftDeletableEntity {
    @ApiProperty({ example: 'admin' })
    @Index('uq_roles_code', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 50 })
    code: string;

    @ApiProperty({ example: 'Quản trị viên' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string | null;

    /**
     * Role hệ thống (admin/staff/customer) — code đang được hard-code trong
     * `@Roles(...)` và luồng đăng ký, nên chặn xoá để không hỏng phân quyền.
     */
    @ApiProperty({ default: false })
    @Column({ type: 'boolean', default: false })
    isSystem: boolean;

    @ApiPropertyOptional({ type: () => Permission, isArray: true })
    @ManyToMany(() => Permission, (permission) => permission.roles, { cascade: false })
    @JoinTable({
        name: 'role_permissions',
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
    })
    permissions: Permission[];

    @OneToMany(() => User, (user) => user.role)
    users: User[];
}
