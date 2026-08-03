import { ApiProperty } from '@nestjs/swagger';
import {
    CreateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

/** Khóa chính UUID + timestamps, dùng cho mọi entity nghiệp vụ. */
export abstract class BaseEntity {
    @ApiProperty({ format: 'uuid' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty()
    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}

/** Như BaseEntity nhưng hỗ trợ soft delete (deleted_at). */
export abstract class SoftDeletableEntity extends BaseEntity {
    @ApiProperty({ required: false, nullable: true })
    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deletedAt: Date | null;
}
