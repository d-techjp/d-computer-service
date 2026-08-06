import * as bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import type { DataSource } from 'typeorm';
import { PERMISSION_CATALOG, SYSTEM_ROLES } from '../../common/enums/permission.enum';
import { RoleCode } from '../../common/enums/role.enum';
import { slugify } from '../../common/utils/slug.util';
import { BCRYPT_SALT_ROUNDS, configuration } from '../../config/configuration';
import { Article, ArticleStatus } from '../../modules/articles/entities/article.entity';
import { Brand } from '../../modules/brands/entities/brand.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { ProductBundleItem } from '../../modules/products/entities/product-bundle-item.entity';
import { ProductOptionValue } from '../../modules/products/entities/product-option-value.entity';
import { ProductOption } from '../../modules/products/entities/product-option.entity';
import {
    BundleInventoryPolicy,
    ProductVariant,
} from '../../modules/products/entities/product-variant.entity';
import {
    Product,
    ProductStatus,
    ProductType,
} from '../../modules/products/entities/product.entity';
import { refreshProductAggregates } from '../../modules/products/infrastructure/product-aggregates';
import { Permission } from '../../modules/rbac/entities/permission.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import { User, UserStatus } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

loadEnv();

const log = (message: string): void => {
    process.stdout.write(`${message}\n`);
};

/**
 * Đồng bộ bảng `permissions` với PERMISSION_CATALOG. Chỉ thêm mới / cập nhật
 * metadata — không xoá permission lạ vì admin có thể đã tự tạo qua API.
 */
async function seedPermissions(ds: DataSource): Promise<Map<string, Permission>> {
    const repository = ds.getRepository(Permission);
    const result = new Map<string, Permission>();

    for (const definition of PERMISSION_CATALOG) {
        let permission = await repository.findOne({ where: { code: definition.code } });

        if (permission) {
            permission.name = definition.name;
            permission.module = definition.module;
            permission.description = definition.description;
            permission = await repository.save(permission);
        } else {
            permission = await repository.save(repository.create(definition));
        }
        result.set(definition.code, permission);
    }

    log(`✓ Permission: ${result.size} bản ghi`);
    return result;
}

/**
 * Tạo 3 role hệ thống. Role đã tồn tại thì **không đụng vào permission** — admin
 * có thể đã chỉnh qua API, seed chạy lại không được ghi đè lựa chọn đó.
 */
async function seedRoles(ds: DataSource, permissions: Map<string, Permission>): Promise<void> {
    const repository = ds.getRepository(Role);
    let created = 0;

    for (const definition of SYSTEM_ROLES) {
        const existing = await repository.findOne({ where: { code: definition.code } });
        if (existing) continue;

        await repository.save(
            repository.create({
                code: definition.code,
                name: definition.name,
                description: definition.description,
                isSystem: true,
                permissions: definition.permissions
                    .map((code) => permissions.get(code))
                    .filter((permission): permission is Permission => permission !== undefined),
            }),
        );
        created += 1;
    }

    log(`✓ Vai trò: tạo mới ${created}/${SYSTEM_ROLES.length}`);
}

async function seedAdmin(ds: DataSource): Promise<User> {
    const { seed } = configuration();
    const users = ds.getRepository(User);

    const existing = await users.findOne({ where: { username: seed.adminUsername } });
    if (existing) {
        log(`• Admin đã tồn tại: ${existing.username}`);
        return existing;
    }

    const adminRole = await ds.getRepository(Role).findOneOrFail({
        where: { code: RoleCode.ADMIN },
    });

    const admin = users.create({
        username: seed.adminUsername,
        email: seed.adminEmail,
        password: await bcrypt.hash(seed.adminPassword, BCRYPT_SALT_ROUNDS),
        fullName: seed.adminName,
        roleId: adminRole.id,
        status: UserStatus.ACTIVE,
    });
    await users.save(admin);
    log(`✓ Tạo admin: ${seed.adminUsername} / ${seed.adminPassword}`);
    return admin;
}

async function seedCategories(ds: DataSource): Promise<Map<string, Category>> {
    const repository = ds.getRepository(Category);
    const result = new Map<string, Category>();

    const roots = [
        { name: 'Laptop', description: 'Máy tính xách tay các loại', sortOrder: 1 },
        { name: 'PC & Linh kiện', description: 'Máy tính để bàn và linh kiện', sortOrder: 2 },
        { name: 'Phụ kiện', description: 'Chuột, bàn phím, tai nghe', sortOrder: 3 },
    ];

    for (const item of roots) {
        const slug = slugify(item.name);
        let category = await repository.findOne({ where: { slug } });
        category ??= await repository.save(repository.create({ ...item, slug }));
        result.set(item.name, category);
    }

    const children = [
        { name: 'Laptop Gaming', parent: 'Laptop', sortOrder: 1 },
        { name: 'Laptop Văn phòng', parent: 'Laptop', sortOrder: 2 },
        { name: 'Card đồ họa', parent: 'PC & Linh kiện', sortOrder: 1 },
    ];

    for (const item of children) {
        const slug = slugify(item.name);
        let category = await repository.findOne({ where: { slug } });
        category ??= await repository.save(
            repository.create({
                name: item.name,
                slug,
                sortOrder: item.sortOrder,
                parentId: result.get(item.parent)?.id ?? null,
            }),
        );
        result.set(item.name, category);
    }

    log(`✓ Danh mục: ${result.size} bản ghi`);
    return result;
}

async function seedBrands(ds: DataSource): Promise<Map<string, Brand>> {
    const repository = ds.getRepository(Brand);
    const result = new Map<string, Brand>();

    const brands = [
        { name: 'Dell', country: 'US', website: 'https://www.dell.com' },
        { name: 'Asus', country: 'TW', website: 'https://www.asus.com' },
        { name: 'Apple', country: 'US', website: 'https://www.apple.com' },
        { name: 'Logitech', country: 'CH', website: 'https://www.logitech.com' },
    ];

    for (const item of brands) {
        const slug = slugify(item.name);
        let brand = await repository.findOne({ where: { slug } });
        brand ??= await repository.save(repository.create({ ...item, slug }));
        result.set(item.name, brand);
    }

    log(`✓ Thương hiệu: ${result.size} bản ghi`);
    return result;
}

async function seedProducts(
    ds: DataSource,
    categories: Map<string, Category>,
    brands: Map<string, Brand>,
): Promise<void> {
    const repository = ds.getRepository(Product);

    const variantsRepository = ds.getRepository(ProductVariant);

    /**
     * Mỗi sản phẩm luôn kèm ít nhất một biến thể. Dữ liệu mẫu cố tình phủ cả ba
     * `productType` để FE có sẵn ví dụ thật cho từng luồng hiển thị.
     */
    const products: SeedProduct[] = [
        {
            name: 'Laptop Dell Vostro 3520 i5-1235U',
            category: 'Laptop Văn phòng',
            brand: 'Dell',
            specifications: { CPU: 'Intel Core i5-1235U', 'Màn hình': '15.6" FHD' },
            // Sản phẩm nhiều cấu hình: giá và kho khác nhau theo từng biến thể.
            options: [
                { name: 'RAM', values: ['8GB', '16GB'] },
                { name: 'SSD', values: ['512GB'] },
            ],
            variants: [
                { name: '8GB / 512GB', sku: 'DELL-V3520-8-512', price: 15990000, stock: 25 },
                {
                    name: '16GB / 512GB',
                    sku: 'DELL-V3520-16-512',
                    price: 17990000,
                    compareAtPrice: 19990000,
                    stock: 10,
                },
            ],
        },
        {
            name: 'Laptop Asus TUF Gaming F15 RTX 4060',
            category: 'Laptop Gaming',
            brand: 'Asus',
            specifications: { CPU: 'Intel Core i7-13620H', GPU: 'RTX 4060 8GB', RAM: '16GB' },
            variants: [
                {
                    sku: 'ASUS-TUF-F15-4060',
                    price: 28990000,
                    compareAtPrice: 31990000,
                    stock: 12,
                },
            ],
        },
        {
            name: 'MacBook Air M3 13 inch 8GB 256GB',
            category: 'Laptop Văn phòng',
            brand: 'Apple',
            specifications: { Chip: 'Apple M3', RAM: '8GB', SSD: '256GB' },
            variants: [{ sku: 'APPLE-MBA-M3-256', price: 26490000, stock: 8 }],
        },
        {
            name: 'Chuột không dây Logitech MX Master 3S',
            category: 'Phụ kiện',
            brand: 'Logitech',
            specifications: { 'Kết nối': 'Bluetooth / USB Receiver', DPI: '8000' },
            variants: [{ sku: 'LOGI-MXM3S', price: 2390000, stock: 40, lowStockThreshold: 10 }],
        },
        {
            name: 'Dịch vụ vệ sinh & tra keo tản nhiệt laptop',
            category: 'Phụ kiện',
            brand: 'Logitech',
            productType: ProductType.SERVICE,
            variants: [
                // Dịch vụ không có kho -> trackInventory = false, stock bị bỏ qua.
                { sku: 'SRV-CLEAN-LAPTOP', price: 250000, trackInventory: false },
            ],
        },
        {
            name: 'Combo Dell Vostro 3520 + chuột MX Master 3S',
            category: 'Laptop Văn phòng',
            brand: 'Dell',
            productType: ProductType.BUNDLE,
            variants: [
                {
                    sku: 'COMBO-DELL-MX',
                    price: 17990000,
                    compareAtPrice: 18380000,
                    // Kho suy ra từ thành phần, không nhập tay.
                    bundleInventoryPolicy: BundleInventoryPolicy.DERIVED_FROM_COMPONENTS,
                },
            ],
            bundleOf: [
                { sku: 'DELL-V3520-8-512', quantity: 1 },
                { sku: 'LOGI-MXM3S', quantity: 1 },
            ],
        },
    ];

    let created = 0;
    for (const item of products) {
        // Bỏ qua khi slug HOẶC bất kỳ SKU nào đã tồn tại: dữ liệu dev có thể đã
        // giữ SKU này dưới một tên/slug khác, khi đó insert sẽ vỡ unique index.
        const slug = slugify(item.name);
        const taken =
            (await repository.exists({ where: { slug } })) ||
            (await variantsRepository.exists({
                where: item.variants.map((variant) => ({ sku: variant.sku })),
            }));
        if (taken) continue;

        const product = await repository.save(
            repository.create({
                name: item.name,
                slug,
                productType: item.productType ?? ProductType.STANDARD,
                specifications: item.specifications ?? null,
                status: ProductStatus.ACTIVE,
                isFeatured: item.variants.length > 1,
                categoryId: categories.get(item.category)?.id ?? null,
                brandId: brands.get(item.brand)?.id ?? null,
                variants: item.variants.map((variant, index) =>
                    variantsRepository.create({
                        name: variant.name ?? item.name,
                        sku: variant.sku,
                        price: variant.price,
                        compareAtPrice: variant.compareAtPrice ?? null,
                        stock: variant.stock ?? 0,
                        lowStockThreshold: variant.lowStockThreshold ?? 5,
                        position: index,
                        isDefault: index === 0,
                        trackInventory: variant.trackInventory ?? true,
                        bundleInventoryPolicy: variant.bundleInventoryPolicy ?? null,
                    }),
                ),
            }),
        );

        if (item.options) await seedProductOptions(ds, product.id, item.options);
        if (item.bundleOf) await seedBundleItems(ds, product.id, item.bundleOf);

        await refreshProductAggregates(ds.manager, product.id);
        created += 1;
    }

    log(`✓ Sản phẩm: tạo mới ${created}/${products.length}`);
}

interface SeedVariant {
    name?: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    bundleInventoryPolicy?: BundleInventoryPolicy;
}

interface SeedProduct {
    name: string;
    category: string;
    brand: string;
    productType?: ProductType;
    specifications?: Record<string, string>;
    options?: { name: string; values: string[] }[];
    variants: SeedVariant[];
    bundleOf?: { sku: string; quantity: number }[];
}

/**
 * Khai option rồi gắn giá trị vào biến thể theo `name` đã ghép sẵn ("16GB / 512GB").
 * Cách này chỉ đủ dùng cho seed — API thật nhận thẳng `optionValueIds`.
 */
async function seedProductOptions(
    ds: DataSource,
    productId: string,
    options: { name: string; values: string[] }[],
): Promise<void> {
    const saved = await ds.getRepository(ProductOption).save(
        options.map((option, optionIndex) =>
            ds.getRepository(ProductOption).create({
                productId,
                name: option.name,
                position: optionIndex,
                values: option.values.map((value, valueIndex) =>
                    ds.getRepository(ProductOptionValue).create({ value, position: valueIndex }),
                ),
            }),
        ),
    );

    const valueByLabel = new Map(
        saved.flatMap((option) => option.values.map((value) => [value.value, value])),
    );

    const variantsRepository = ds.getRepository(ProductVariant);
    for (const variant of await variantsRepository.find({ where: { productId } })) {
        variant.optionValues = variant.name
            .split(' / ')
            .map((label) => valueByLabel.get(label.trim()))
            .filter((value): value is ProductOptionValue => value !== undefined);

        if (variant.optionValues.length > 0) await variantsRepository.save(variant);
    }
}

async function seedBundleItems(
    ds: DataSource,
    bundleProductId: string,
    components: { sku: string; quantity: number }[],
): Promise<void> {
    const variantsRepository = ds.getRepository(ProductVariant);
    const bundleVariant = await variantsRepository.findOne({
        where: { productId: bundleProductId, isDefault: true },
    });
    if (!bundleVariant) return;

    const itemsRepository = ds.getRepository(ProductBundleItem);
    let stock: number | null = null;

    for (const [index, component] of components.entries()) {
        const variant = await variantsRepository.findOne({ where: { sku: component.sku } });
        if (!variant) continue;

        await itemsRepository.save(
            itemsRepository.create({
                bundleVariantId: bundleVariant.id,
                componentVariantId: variant.id,
                quantity: component.quantity,
                position: index,
            }),
        );

        // available = MIN(floor(stock thành phần / số lượng cần)) — xem ProductBundlesService.
        const possible = Math.floor(variant.stock / component.quantity);
        stock = stock === null ? possible : Math.min(stock, possible);
    }

    bundleVariant.stock = stock ?? 0;
    await variantsRepository.save(bundleVariant);
}

async function seedArticles(ds: DataSource, author: User): Promise<void> {
    const repository = ds.getRepository(Article);
    const title = 'Top 5 laptop văn phòng đáng mua 2026';
    const slug = slugify(title);

    if (await repository.exists({ where: { slug } })) {
        log('• Bài viết mẫu đã tồn tại');
        return;
    }

    await repository.save(
        repository.create({
            title,
            slug,
            excerpt: 'Gợi ý những mẫu laptop văn phòng cân bằng giữa hiệu năng, pin và giá bán.',
            content:
                '<p>Laptop văn phòng năm 2026 đã có bước tiến lớn về thời lượng pin và hiệu năng ' +
                'trên mỗi watt. Dưới đây là 5 lựa chọn đáng cân nhắc trong tầm giá 15-30 triệu.</p>',
            status: ArticleStatus.PUBLISHED,
            publishedAt: new Date(),
            tags: ['laptop', 'tu-van', 'van-phong'],
            authorId: author.id,
        }),
    );
    log('✓ Bài viết mẫu đã tạo');
}

async function main(): Promise<void> {
    const ds = await dataSource.initialize();
    log('— Bắt đầu seed dữ liệu —');

    try {
        // RBAC phải chạy trước: user cần role_id trỏ tới vai trò đã tồn tại
        const permissions = await seedPermissions(ds);
        await seedRoles(ds, permissions);

        const admin = await seedAdmin(ds);
        const categories = await seedCategories(ds);
        const brands = await seedBrands(ds);
        await seedProducts(ds, categories, brands);
        await seedArticles(ds, admin);
        log('— Seed hoàn tất —');
    } finally {
        await ds.destroy();
    }
}

main().catch((error: unknown) => {
    process.stderr.write(
        `Seed thất bại: ${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exit(1);
});
