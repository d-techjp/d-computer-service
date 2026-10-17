import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Matches,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { toTrimmed } from '../../../../common/transformers/transform.helpers';
import { OrderItemInputDto } from '../../../orders/dto/create-order.dto';
import {
    IN_STORE_PAYMENT_METHODS,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from '../../../orders/enums/order.enum';

const READER_ID = /^tmr_[A-Za-z0-9]+$/;

/**
 * Nhân viên lên đơn tại quầy. Không có địa chỉ giao hàng — khách nhận hàng ngay.
 * Thông tin khách đều không bắt buộc; có email thì gửi biên nhận.
 *
 * Gắn đơn vào tài khoản khách: `customerId` (chọn từ gợi ý) thắng; không có thì
 * theo `customerPhone` — trùng số thì dùng khách cũ, chưa có thì tạo khách mới.
 */
export class CreatePosOrderDto {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Khách chọn từ `GET /admin/pos/customers`',
    })
    @IsUUID()
    @IsOptional()
    customerId?: string;

    @ApiProperty({ type: [OrderItemInputDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 sản phẩm' })
    @ArrayMaxSize(100)
    @ValidateNested({ each: true })
    @Type(() => OrderItemInputDto)
    items: OrderItemInputDto[];

    @ApiPropertyOptional({
        enum: IN_STORE_PAYMENT_METHODS,
        default: PaymentMethod.STRIPE_TERMINAL,
        description:
            '`stripe_terminal`: đơn chờ máy POS thu tiền. `cash` / `bank_transfer`: nhân viên ' +
            'đã nhận tiền — đơn ra `completed` + `paid` và trừ kho ngay',
    })
    @IsIn(IN_STORE_PAYMENT_METHODS, { message: 'Phương thức thanh toán tại quầy không hợp lệ' })
    @IsOptional()
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({ example: '山田 太郎' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(150)
    @IsOptional()
    customerName?: string;

    @ApiPropertyOptional({ example: '090-1234-5678' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(20)
    @IsOptional()
    customerPhone?: string;

    @ApiPropertyOptional({ example: 'khach@example.com', description: 'Có thì gửi biên nhận' })
    @Transform(toTrimmed)
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(255)
    @IsOptional()
    customerEmail?: string;

    @ApiPropertyOptional({ example: 1000, description: 'Giảm giá tại quầy (yên)' })
    @Type(() => Number)
    @IsInt({ message: 'Giảm giá phải là số yên nguyên' })
    @Min(0)
    @IsOptional()
    discount?: number;

    @ApiPropertyOptional()
    @IsString()
    @MaxLength(500)
    @IsOptional()
    note?: string;
}

export class PosReaderInputDto {
    @ApiPropertyOptional({
        example: 'tmr_Gs4nQmqUdjR2gZ',
        description: 'Bỏ trống thì dùng máy mặc định `STRIPE_TERMINAL_READER_ID`',
    })
    @Matches(READER_ID, { message: 'Mã máy POS không hợp lệ (dạng tmr_...)' })
    @IsOptional()
    readerId?: string;
}

export class SimulatePosTapDto extends PosReaderInputDto {
    @ApiPropertyOptional({
        example: '4242424242424242',
        description: 'Thẻ test của Stripe. `4000000000000002` = bị từ chối',
    })
    @Matches(/^\d{12,19}$/, { message: 'Số thẻ test không hợp lệ' })
    @IsOptional()
    cardNumber?: string;
}

export class CancelPosOrderDto extends PosReaderInputDto {
    @ApiPropertyOptional({ example: 'Khách đổi ý' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(500)
    @IsOptional()
    reason?: string;
}

export class PosCustomerQueryDto {
    @ApiProperty({ example: '0901234', description: 'Một phần số điện thoại, tối thiểu 3 chữ số' })
    @Transform(toTrimmed)
    @IsString()
    @MaxLength(20)
    phone: string;
}

export class PosCustomerDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: '山田 太郎' })
    fullName: string;

    @ApiProperty({ example: '090-1234-5678', nullable: true })
    phone: string | null;

    @ApiProperty({ example: 'khach@example.com', nullable: true })
    email: string | null;
}

export class PosReaderDto {
    @ApiProperty({ example: 'tmr_Gs4nQmqUdjR2gZ' })
    id: string;

    @ApiProperty({ example: 'Quầy 1', nullable: true })
    label: string | null;

    @ApiProperty({ example: 'simulated_stripe_s700' })
    deviceType: string;

    @ApiProperty({ example: 'online', nullable: true })
    status: string | null;

    @ApiProperty({ description: 'Reader ảo — chỉ có trong sandbox' })
    simulated: boolean;
}

export class PosReadersDto {
    @ApiProperty({ type: [PosReaderDto] })
    readers: PosReaderDto[];

    @ApiProperty({ nullable: true, description: 'Máy mặc định cấu hình trên server' })
    defaultReaderId: string | null;

    @ApiProperty({ description: 'Khoá test — admin hiện nút giả lập chạm thẻ' })
    testMode: boolean;
}

export class PosReaderActionDto {
    @ApiProperty({ enum: ['in_progress', 'succeeded', 'failed'] })
    status: string;

    @ApiProperty({ nullable: true, example: 'Your card was declined.' })
    failureMessage: string | null;
}

/**
 * Admin poll endpoint này mỗi 1–2 giây sau khi đẩy số tiền xuống máy. Dừng khi
 * `paymentStatus = paid` (thành công) hoặc `readerAction.status = failed` (cho
 * nhân viên bấm thử lại).
 */
export class PosPaymentStatusDto {
    // Tên `id` để `ActivityLogInterceptor` ghi được resourceId
    @ApiProperty({ format: 'uuid', description: 'Id đơn hàng' })
    id: string;

    @ApiProperty({ example: 'DH20261017-A1B2C3' })
    orderCode: string;

    @ApiProperty({ example: 20500 })
    total: number;

    @ApiProperty({ enum: OrderStatus })
    status: OrderStatus;

    @ApiProperty({ enum: PaymentStatus })
    paymentStatus: PaymentStatus;

    @ApiProperty({ nullable: true, example: 'pi_3Abc' })
    paymentIntentId: string | null;

    @ApiProperty({ nullable: true })
    readerId: string | null;

    @ApiProperty({
        type: PosReaderActionDto,
        nullable: true,
        description: 'Thao tác của máy cho ĐƠN NÀY; null nếu máy đang không xử lý đơn này',
    })
    readerAction: PosReaderActionDto | null;
}
