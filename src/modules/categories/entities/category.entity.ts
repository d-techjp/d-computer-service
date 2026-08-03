import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category extends SoftDeletableEntity {
    @ApiProperty({ example: 'Laptop' })
    @Column({ type: 'varchar', length: 150 })
    name: string;

    @ApiProperty({ example: 'laptop' })
    @Index('uq_categories_slug', { unique: true, where: '"deleted_at" IS NULL' })
    @Column({ type: 'varchar', length: 180 })
    slug: string;

    @ApiPropertyOptional()
    @Column({ type: 'text', nullable: true })
    description: string | null;

    @ApiPropertyOptional()
    @Column({ type: 'varchar', length: 500, nullable: true })
    imageUrl: string | null;

    @ApiPropertyOptional({ description: 'Danh mục cha — null nếu là danh mục gốc' })
    @Column({ type: 'uuid', nullable: true })
    parentId: string | null;

    @ManyToOne(() => Category, (category) => category.children, {
        onDelete: 'SET NULL',
        nullable: true,
    })
    @JoinColumn({ name: 'parent_id' })
    parent: Category | null;

    @OneToMany(() => Category, (category) => category.parent)
    children: Category[];

    @ApiProperty({ default: 0 })
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    @ApiProperty({ default: true })
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];
}
