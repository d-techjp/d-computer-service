import * as bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import type { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { slugify } from '../../common/utils/slug.util';
import { BCRYPT_SALT_ROUNDS, configuration } from '../../config/configuration';
import { Article, ArticleStatus } from '../../modules/articles/entities/article.entity';
import { Brand } from '../../modules/brands/entities/brand.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { Product, ProductStatus } from '../../modules/products/entities/product.entity';
import { User, UserStatus } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

loadEnv();

const log = (message: string): void => {
    process.stdout.write(`${message}\n`);
};

async function seedAdmin(ds: DataSource): Promise<User> {
    const { seed } = configuration();
    const users = ds.getRepository(User);

    const existing = await users.findOne({ where: { email: seed.adminEmail } });
    if (existing) {
        log(`• Admin đã tồn tại: ${existing.email}`);
        return existing;
    }

    const admin = users.create({
        email: seed.adminEmail,
        password: await bcrypt.hash(seed.adminPassword, BCRYPT_SALT_ROUNDS),
        fullName: seed.adminName,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
    });
    await users.save(admin);
    log(`✓ Tạo admin: ${seed.adminEmail} / ${seed.adminPassword}`);
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

    const products = [
        {
            name: 'Laptop Dell Vostro 3520 i5-1235U',
            sku: 'DELL-V3520-I5',
            price: 15990000,
            compareAtPrice: 17990000,
            stock: 25,
            category: 'Laptop Văn phòng',
            brand: 'Dell',
            specifications: { CPU: 'Intel Core i5-1235U', RAM: '16GB DDR4', SSD: '512GB NVMe' },
        },
        {
            name: 'Laptop Asus TUF Gaming F15 RTX 4060',
            sku: 'ASUS-TUF-F15-4060',
            price: 28990000,
            compareAtPrice: 31990000,
            stock: 12,
            category: 'Laptop Gaming',
            brand: 'Asus',
            specifications: { CPU: 'Intel Core i7-13620H', GPU: 'RTX 4060 8GB', RAM: '16GB' },
        },
        {
            name: 'MacBook Air M3 13 inch 8GB 256GB',
            sku: 'APPLE-MBA-M3-256',
            price: 26490000,
            stock: 8,
            category: 'Laptop Văn phòng',
            brand: 'Apple',
            specifications: { Chip: 'Apple M3', RAM: '8GB', SSD: '256GB' },
        },
        {
            name: 'Chuột không dây Logitech MX Master 3S',
            sku: 'LOGI-MXM3S',
            price: 2390000,
            stock: 40,
            lowStockThreshold: 10,
            category: 'Phụ kiện',
            brand: 'Logitech',
            specifications: { 'Kết nối': 'Bluetooth / USB Receiver', DPI: '8000' },
        },
    ];

    let created = 0;
    for (const item of products) {
        const exists = await repository.exists({ where: { sku: item.sku } });
        if (exists) continue;

        await repository.save(
            repository.create({
                name: item.name,
                slug: slugify(item.name),
                sku: item.sku,
                price: item.price,
                compareAtPrice: item.compareAtPrice ?? null,
                stock: item.stock,
                lowStockThreshold: item.lowStockThreshold ?? 5,
                specifications: item.specifications,
                status: ProductStatus.ACTIVE,
                isFeatured: item.stock > 20,
                categoryId: categories.get(item.category)?.id ?? null,
                brandId: brands.get(item.brand)?.id ?? null,
            }),
        );
        created += 1;
    }

    log(`✓ Sản phẩm: tạo mới ${created}/${products.length}`);
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
