import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CartsService } from '../application/carts.service';
import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartMutationResultDto, PublicCartDto } from './dto/public-cart.dto';

/**
 * Giỏ hàng storefront. `@Public()` để vô hiệu `JwtAuthGuard` toàn cục (khách vãng
 * lai phải dùng được), `OptionalJwtAuthGuard` để vẫn nhận ra người đã đăng nhập —
 * riêng `@Public()` thôi thì `request.user` luôn `undefined` kể cả có token.
 *
 * KHÔNG gắn `@LogActivity`: giỏ hàng là endpoint tần suất rất cao, ghi log mỗi
 * lần bấm +/- sẽ làm ngập bảng `activity_logs`.
 */
@ApiTags('Cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('carts')
export class ClientCartsController {
    constructor(private readonly cartsService: CartsService) {}

    @Post()
    @ApiCreatedResponse({ type: PublicCartDto })
    @ApiOperation({
        summary: 'Tạo giỏ hàng rỗng',
        description:
            'Trả `id` để client lưu vào localStorage và dùng cho mọi request sau. Nên gọi ' +
            'lazily ở lần bấm "thêm vào giỏ" đầu tiên để tránh sinh giỏ rác.',
    })
    create(@CurrentUser() user?: AuthenticatedUser): Promise<PublicCartDto> {
        return this.cartsService.create(user);
    }

    @Get(':cartId')
    @ApiOkResponse({ type: PublicCartDto })
    @ApiOperation({
        summary: 'Xem giỏ hàng',
        description: '`unitPrice` là giá hiện tại trong DB, không phải giá lúc thêm vào giỏ.',
    })
    findOne(
        @Param('cartId', ParseUUIDPipe) cartId: string,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<PublicCartDto> {
        return this.cartsService.findOne(cartId, user);
    }

    // 200 chứ không phải 201 mặc định của POST: không tạo tài nguyên mới nào —
    // cùng biến thể chỉ cộng dồn vào dòng sẵn có, và có thể bị từ chối hoàn toàn.
    @Post(':cartId/items')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: CartMutationResultDto })
    @ApiOperation({
        summary: 'Thêm sản phẩm vào giỏ',
        description:
            'Cùng biến thể thì cộng dồn vào dòng sẵn có. LUÔN trả 200 kể cả khi hết hàng — ' +
            'đọc `result.status` (`added`/`adjusted`/`rejected`) để biết kết quả.',
    })
    addItem(
        @Param('cartId', ParseUUIDPipe) cartId: string,
        @Body() dto: AddCartItemDto,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<CartMutationResultDto> {
        return this.cartsService.addItem(cartId, dto, user);
    }

    @Patch(':cartId/items/:itemId')
    @ApiOkResponse({ type: CartMutationResultDto })
    @ApiOperation({
        summary: 'Đổi số lượng một dòng',
        description: 'Số lượng tuyệt đối, không phải cộng thêm. Cùng shape response như thêm mới.',
    })
    updateItem(
        @Param('cartId', ParseUUIDPipe) cartId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @Body() dto: UpdateCartItemDto,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<CartMutationResultDto> {
        return this.cartsService.updateItem(cartId, itemId, dto, user);
    }

    @Delete(':cartId/items/:itemId')
    @ApiOkResponse({ type: PublicCartDto })
    @ApiOperation({ summary: 'Bỏ một dòng khỏi giỏ' })
    removeItem(
        @Param('cartId', ParseUUIDPipe) cartId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<PublicCartDto> {
        return this.cartsService.removeItem(cartId, itemId, user);
    }

    @Delete(':cartId/items')
    @ApiOkResponse({ type: PublicCartDto })
    @ApiOperation({ summary: 'Xoá sạch giỏ hàng' })
    clear(
        @Param('cartId', ParseUUIDPipe) cartId: string,
        @CurrentUser() user?: AuthenticatedUser,
    ): Promise<PublicCartDto> {
        return this.cartsService.clear(cartId, user);
    }
}
