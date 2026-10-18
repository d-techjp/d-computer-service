import { Injectable } from '@nestjs/common';
import { SiteSettingsService } from '../../site-settings/application/site-settings.service';
import type { OrderReceiptDto } from '../admin/dto/order-receipt.dto';
import { OrdersService } from './orders.service';

/**
 * Cửa hàng chỉ bán hàng điện tử — toàn bộ chịu thuế tiêu dùng 10%, giá niêm yết
 * đã gồm thuế (内税). Có thêm mặt hàng 8% thì phải lưu thuế suất theo từng dòng.
 */
const STANDARD_TAX_RATE = 10;

/**
 * Dữ liệu để in bill (レシート / 適格簡易請求書): thông tin cửa hàng + đơn + thuế.
 * Gom ở backend để nhân viên chỉ có quyền đơn hàng vẫn in được, không cần quyền
 * sửa thông tin cửa hàng.
 */
@Injectable()
export class OrderReceiptService {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly siteSettingsService: SiteSettingsService,
    ) {}

    async build(orderId: string): Promise<OrderReceiptDto> {
        const [order, settings] = await Promise.all([
            this.ordersService.findOne(orderId),
            this.siteSettingsService.get(),
        ]);

        return {
            shop: {
                name: settings.companyName,
                phone: settings.phone,
                address: settings.address,
                invoiceRegistrationNumber: settings.invoiceRegistrationNumber || null,
            },
            order,
            // Thuế tính một lần trên tổng theo thuế suất (sau giảm giá, gồm phí ship)
            // — đúng cách インボイス yêu cầu: làm tròn một lần cho mỗi thuế suất.
            taxLines: [
                {
                    rate: STANDARD_TAX_RATE,
                    taxableAmount: order.total,
                    taxAmount: Math.floor(
                        (order.total * STANDARD_TAX_RATE) / (100 + STANDARD_TAX_RATE),
                    ),
                },
            ],
        };
    }
}
