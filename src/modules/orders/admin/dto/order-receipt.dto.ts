import { ApiProperty } from '@nestjs/swagger';
import { Order } from '../../entities/order.entity';

export class ReceiptShopDto {
    @ApiProperty({ example: 'D-TECH' })
    name: string;

    @ApiProperty({ example: '080-6473-2260' })
    phone: string;

    @ApiProperty({ example: '大阪市西成区玉出東１－３－１６ ドエル１番館103号' })
    address: string;

    @ApiProperty({
        example: 'T1234567890123',
        nullable: true,
        description: 'null = chưa đăng ký インボイス',
    })
    invoiceRegistrationNumber: string | null;
}

/** Một dòng "10%対象 ¥X（内消費税 ¥Y）" trên bill. */
export class ReceiptTaxLineDto {
    @ApiProperty({ example: 10, description: 'Thuế suất %' })
    rate: number;

    @ApiProperty({ example: 20500, description: 'Số tiền chịu thuế, đã gồm thuế' })
    taxableAmount: number;

    @ApiProperty({
        example: 1863,
        description: 'Tiền thuế nằm trong `taxableAmount`, làm tròn xuống',
    })
    taxAmount: number;
}

export class OrderReceiptDto {
    @ApiProperty({ type: ReceiptShopDto })
    shop: ReceiptShopDto;

    @ApiProperty({ type: Order })
    order: Order;

    @ApiProperty({ type: [ReceiptTaxLineDto] })
    taxLines: ReceiptTaxLineDto[];
}
