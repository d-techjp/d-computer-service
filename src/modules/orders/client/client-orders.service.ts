import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../common/dto/paginated-result.dto';
import { OrdersService } from '../application/orders.service';
import type { QueryOrderDto } from '../dto/query-order.dto';
import { Order } from '../entities/order.entity';
import type { ClientQueryOrderDto } from './dto/client-query-order.dto';

/** Lớp mỏng bọc `OrdersService` cho khách: danh sách luôn bị khoá về đơn của chính họ. */
@Injectable()
export class ClientOrdersService {
    constructor(private readonly ordersService: OrdersService) {}

    findMine(query: ClientQueryOrderDto, userId: string): Promise<PaginatedResult<Order>> {
        // Gán trực tiếp lên instance thay vì spread để giữ getter `skip` trên prototype
        const criteria: QueryOrderDto = Object.assign(query, { userId });
        return this.ordersService.findAll(criteria);
    }
}
