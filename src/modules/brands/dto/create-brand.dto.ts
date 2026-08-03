import { toInteger, toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { SLUG_MESSAGE, SLUG_RULE } from '../../categories/dto/create-category.dto';

export class CreateBrandDto {
    @ApiProperty({ example: 'Dell' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({ example: 'dell', description: 'Bỏ trống để tự sinh từ name' })
    @IsString()
    @MaxLength(180)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    @IsOptional()
    slug?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/brands/dell-logo.png' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    logoUrl?: string;

    @ApiPropertyOptional({ example: 'https://www.dell.com' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    website?: string;

    @ApiPropertyOptional({ example: 'US' })
    @IsString()
    @MaxLength(100)
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ default: 0 })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
