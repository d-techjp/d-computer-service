import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('brands')
export class Brand extends SoftDeletableEntity {
    @ApiProperty({ example: 'Dell' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @ApiProperty({ example: 'dell' })
    @Index('uq_brands_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 180 })
    slug: string;

    @ApiPropertyOptional()
    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    logoUrl: string | null;

    @ApiPropertyOptional({ example: 'https://www.dell.com' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    website: string | null;

    @ApiPropertyOptional({ example: 'US' })
    @Column({ type: 'varchar', length: 100, nullable: true })
    country: string | null;

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @ApiProperty({ default: true })
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany(() => Product, (product) => product.brand)
    products: Product[];
}
