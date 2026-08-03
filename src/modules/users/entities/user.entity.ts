import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { Role } from '../../../common/enums/role.enum';
import { Article } from '../../articles/entities/article.entity';
import { Order } from '../../orders/entities/order.entity';

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BANNED = 'banned',
}

@Entity('users')
export class User extends SoftDeletableEntity {
    @ApiProperty({ example: 'admin@dcomputer.local' })
    @Index('uq_users_email', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 255 })
    email: string;

    /** Luôn bị loại khỏi response nhờ @Exclude + ClassSerializerInterceptor. */
    @Exclude({ toPlainOnly: true })
    @Column({ type: 'varchar', length: 255, select: false })
    password: string;

    @ApiProperty({ example: 'Nguyễn Văn A' })
    @Column({ type: 'varchar', length: 150 })
    fullName: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    avatarUrl: string | null;

    @ApiProperty({ enum: Role, default: Role.CUSTOMER })
    @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
    role: Role;

    @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    @ApiPropertyOptional()
    @Column({ type: 'timestamptz', nullable: true })
    lastLoginAt: Date | null;

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    @OneToMany(() => Article, (article) => article.author)
    articles: Article[];

    get isActive(): boolean {
        return this.status === UserStatus.ACTIVE;
    }
}
