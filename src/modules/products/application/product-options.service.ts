import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductOptionsRepository } from '../domain/product-options.repository';
import { ProductsRepository } from '../domain/products.repository';
import type { SetProductOptionsDto } from '../dto/set-product-options.dto';
import type { ProductOption } from '../entities/product-option.entity';
import { ProductType } from '../entities/product.entity';

@Injectable()
export class ProductOptionsService {
    constructor(
        private readonly optionsRepository: ProductOptionsRepository,
        private readonly productsRepository: ProductsRepository,
    ) {}

    async findByProduct(productId: string): Promise<ProductOption[]> {
        await this.assertProductExists(productId);
        return this.optionsRepository.findByProductId(productId);
    }

    /**
     * Thay thế toàn bộ bộ option. Chặn nếu payload bỏ mất một giá trị đang được
     * biến thể sử dụng — xoá nó sẽ làm biến thể đó mất tổ hợp và không ai còn
     * biết SKU ấy là cấu hình gì.
     */
    async replace(productId: string, dto: SetProductOptionsDto): Promise<ProductOption[]> {
        const product = await this.assertProductExists(productId);
        if (product.productType === ProductType.BUNDLE) {
            throw new BadRequestException('Combo không dùng option — khai thành phần thay vào đó');
        }

        this.assertNoDuplicateNames(dto);

        const inUse = await this.optionsRepository.findValueIdsInUse(productId);
        if (inUse.length > 0) {
            const current = await this.optionsRepository.findByProductId(productId);
            const survivingLabels = new Set(
                dto.options.flatMap((option) =>
                    option.values.map((value) => this.label(option.name, value.value)),
                ),
            );

            const removed = current
                .flatMap((option) =>
                    option.values.map((value) => ({
                        id: value.id,
                        label: this.label(option.name, value.value),
                    })),
                )
                .filter((entry) => inUse.includes(entry.id) && !survivingLabels.has(entry.label));

            if (removed.length > 0) {
                throw new BadRequestException(
                    `Không xoá được giá trị đang có biến thể sử dụng: ${removed
                        .map((entry) => entry.label)
                        .join(', ')}. Xoá các biến thể đó trước.`,
                );
            }
        }

        return this.optionsRepository.replaceAll(productId, dto.options);
    }

    private assertNoDuplicateNames(dto: SetProductOptionsDto): void {
        const names = dto.options.map((option) => option.name.toLowerCase());
        if (new Set(names).size !== names.length) {
            throw new BadRequestException('Tên option bị trùng');
        }

        for (const option of dto.options) {
            const values = option.values.map((value) => value.value.toLowerCase());
            if (new Set(values).size !== values.length) {
                throw new BadRequestException(`Option "${option.name}" có giá trị trùng nhau`);
            }
        }
    }

    /** Option bị xoá rồi tạo lại nên id không giữ được — so khớp theo cặp tên/giá trị. */
    private label(optionName: string, value: string): string {
        return `${optionName.toLowerCase()}::${value.toLowerCase()}`;
    }

    private async assertProductExists(productId: string) {
        const product = await this.productsRepository.findById(productId);
        if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với id ${productId}`);
        return product;
    }
}
