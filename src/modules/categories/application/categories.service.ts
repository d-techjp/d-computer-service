import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { slugify } from '../../../common/utils/slug.util';
import { CategoriesRepository } from '../domain/categories.repository';
import type { CreateCategoryDto } from '../dto/create-category.dto';
import type { QueryCategoryDto } from '../dto/query-category.dto';
import type { UpdateCategoryDto } from '../dto/update-category.dto';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesService {
    constructor(private readonly categoriesRepository: CategoriesRepository) {}

    async create(dto: CreateCategoryDto): Promise<Category> {
        const slug = await this.resolveSlug(dto.slug ?? dto.name);
        if (dto.parentId) await this.findOne(dto.parentId);

        const category = this.categoriesRepository.create({ ...dto, slug });
        return this.categoriesRepository.save(category);
    }

    async findAll(query: QueryCategoryDto): Promise<PaginatedResult<Category>> {
        const page = await this.categoriesRepository.search(query);
        return new PaginatedResult(page.items, page.total, query.page, query.limit);
    }

    /** Trả cây danh mục 1 lần truy vấn rồi dựng quan hệ cha-con trong bộ nhớ. */
    async findTree(onlyActive = true): Promise<Category[]> {
        const categories = await this.categoriesRepository.findAllForTree(onlyActive);

        const byId = new Map<string, Category>();
        for (const category of categories) {
            category.children = [];
            byId.set(category.id, category);
        }

        const roots: Category[] = [];
        for (const category of categories) {
            const parent = category.parentId ? byId.get(category.parentId) : undefined;
            if (parent) parent.children.push(category);
            else roots.push(category);
        }
        return roots;
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoriesRepository.findById(id);
        if (!category) throw new NotFoundException(`Không tìm thấy danh mục với id ${id}`);
        return category;
    }

    async findBySlug(slug: string): Promise<Category> {
        const category = await this.categoriesRepository.findBySlug(slug);
        if (!category) throw new NotFoundException(`Không tìm thấy danh mục với slug ${slug}`);
        return category;
    }

    async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findOne(id);

        if (dto.slug && dto.slug !== category.slug) {
            category.slug = await this.resolveSlug(dto.slug, id);
        } else if (dto.name && dto.name !== category.name && !dto.slug) {
            category.slug = await this.resolveSlug(dto.name, id);
        }

        if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
            await this.assertValidParent(id, dto.parentId);
        }

        const { slug: _slug, ...rest } = dto;
        Object.assign(category, rest);
        return this.categoriesRepository.save(category);
    }

    async remove(id: string): Promise<void> {
        const category = await this.findOne(id);

        const childCount = await this.categoriesRepository.countByParentId(id);
        if (childCount > 0) {
            throw new BadRequestException(
                'Không thể xoá danh mục đang có danh mục con — hãy xoá hoặc chuyển danh mục con trước',
            );
        }

        const productCount = await this.categoriesRepository.countProductsByCategoryId(id);
        if (productCount > 0) {
            throw new BadRequestException(
                `Không thể xoá danh mục đang có ${productCount} sản phẩm — hãy chuyển sản phẩm sang danh mục khác trước`,
            );
        }

        await this.categoriesRepository.softRemove(category);
    }

    /** Sinh slug duy nhất; nếu trùng thì nối hậu tố -2, -3, ... */
    private async resolveSlug(source: string, excludeId?: string): Promise<string> {
        const base = slugify(source);
        if (!base) throw new BadRequestException('Không tạo được slug hợp lệ từ tên danh mục');

        let candidate = base;
        let suffix = 1;
        while ((await this.categoriesRepository.countBySlug(candidate, excludeId)) > 0) {
            suffix += 1;
            candidate = `${base}-${suffix}`;
        }
        return candidate;
    }

    /** Chặn tự làm cha của chính mình và chặn tạo vòng lặp cha-con. */
    private async assertValidParent(
        id: string,
        parentId: string | null | undefined,
    ): Promise<void> {
        if (!parentId) return;
        if (parentId === id)
            throw new BadRequestException('Danh mục không thể là cha của chính nó');

        await this.findOne(parentId);

        const descendantIds = await this.collectDescendantIds(id);
        if (descendantIds.has(parentId)) {
            throw new BadRequestException('Không thể chuyển danh mục vào chính nhánh con của nó');
        }
    }

    private async collectDescendantIds(rootId: string): Promise<Set<string>> {
        const result = new Set<string>();
        let frontier = [rootId];

        while (frontier.length > 0) {
            const childIds = await this.categoriesRepository.findIdsByParentIds(frontier);
            frontier = childIds.filter((childId) => !result.has(childId));
            for (const childId of frontier) result.add(childId);
        }
        return result;
    }

    /** Id của danh mục và toàn bộ nhánh con — dùng khi lọc sản phẩm theo danh mục. */
    async collectSubtreeIds(rootId: string): Promise<string[]> {
        const descendants = await this.collectDescendantIds(rootId);
        return [rootId, ...descendants];
    }

    /**
     * Id mọi danh mục không được hiển thị ở storefront: chính nó bị tắt, hoặc có
     * tổ tiên bị tắt — tắt một danh mục cha kéo theo toàn bộ nhánh con ẩn theo,
     * kể cả những nhánh con tự thân vẫn đang `isActive: true`. Dùng để ẩn sản
     * phẩm thuộc các nhánh này khỏi API public.
     */
    async collectHiddenCategoryIds(): Promise<Set<string>> {
        const categories = await this.categoriesRepository.findAllForTree(false);

        const childIdsByParent = new Map<string, string[]>();
        const inactiveIds: string[] = [];
        for (const category of categories) {
            if (category.parentId) {
                const siblings = childIdsByParent.get(category.parentId) ?? [];
                siblings.push(category.id);
                childIdsByParent.set(category.parentId, siblings);
            }
            if (!category.isActive) inactiveIds.push(category.id);
        }

        const hidden = new Set<string>();
        let frontier = inactiveIds;
        while (frontier.length > 0) {
            const next: string[] = [];
            for (const id of frontier) {
                if (hidden.has(id)) continue;
                hidden.add(id);
                next.push(...(childIdsByParent.get(id) ?? []));
            }
            frontier = next;
        }
        return hidden;
    }

    async countActive(): Promise<number> {
        return this.categoriesRepository.countActiveRoots();
    }

    /** Cập nhật hàng loạt `sortOrder` sau khi kéo-thả sắp xếp lại danh mục ở màn quản trị. */
    async reorder(items: { id: string; sortOrder: number }[]): Promise<void> {
        await this.categoriesRepository.bulkUpdateSortOrder(items);
    }
}
