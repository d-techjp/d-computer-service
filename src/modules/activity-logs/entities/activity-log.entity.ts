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
import { User } from '../../users/entities/user.entity';
import { ActivityStatus } from '../enums/activity-action.enum';

/**
 * Bảng chỉ ghi thêm (append-only) — không update/delete từ tầng nghiệp vụ.
 * Vì vậy không dùng BaseEntity (không cần updated_at / deleted_at).
 */
@Entity('activity_logs')
@Index('idx_activity_logs_user_created', ['userId', 'createdAt'])
@Index('idx_activity_logs_resource', ['resource', 'resourceId'])
export class ActivityLog {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiPropertyOptional({ description: 'null nếu là hành động của khách chưa đăng nhập' })
    @Column({ type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string | null;

    @ApiProperty({ example: 'create' })
    @Column({ type: 'varchar', length: 64 })
    action: string;

    @ApiProperty({ example: 'product' })
    @Column({ type: 'varchar', length: 64 })
    resource: string;

    @ApiPropertyOptional({ description: 'Id bản ghi bị tác động' })
    @Column({ type: 'varchar', length: 64, nullable: true })
    resourceId: string | null;

    @ApiProperty({ enum: ActivityStatus })
    @Column({ type: 'enum', enum: ActivityStatus, default: ActivityStatus.SUCCESS })
    status: ActivityStatus;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string | null;

    @ApiPropertyOptional({ example: 'POST' })
    @Column({ type: 'varchar', length: 10, nullable: true })
    method: string | null;

    @ApiPropertyOptional({ example: '/api/v1/products' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    path: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'int', nullable: true })
    statusCode: number | null;

    @ApiPropertyOptional({ description: 'Thời gian xử lý request (ms)' })
    @Column({ type: 'int', nullable: true })
    durationMs: number | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 64, nullable: true })
    ipAddress: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent: string | null;

    @ApiPropertyOptional({ description: 'Payload/ngữ cảnh bổ sung (đã che dữ liệu nhạy cảm)' })
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @ApiProperty()
    @Index('idx_activity_logs_created_at')
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
