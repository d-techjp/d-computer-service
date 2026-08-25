import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { toTrimmed } from '../../../common/transformers/transform.helpers';
import { FooterLinkDto } from './footer-link.dto';

export class FooterColumnDto {
    @ApiPropertyOptional({
        format: 'uuid',
        description: 'Để trống khi thêm mới — server tự sinh id',
    })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({ example: 'Sản phẩm · Dịch vụ' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    title: string;

    @ApiProperty({ type: [FooterLinkDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FooterLinkDto)
    links: FooterLinkDto[];
}
