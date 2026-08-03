import { toInteger, toTrimmed } from '../../../common/transformers/transform.helpers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    Matches,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export const SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE = 'Slug chỉ gồm chữ thường, số và dấu gạch ngang';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Laptop Gaming' })
    @Transform(toTrimmed)
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    name: string;

    @ApiPropertyOptional({
        example: 'laptop-gaming',
        description: 'Bỏ trống để tự sinh từ name',
    })
    @IsString()
    @MaxLength(180)
    @Matches(SLUG_RULE, { message: SLUG_MESSAGE })
    @IsOptional()
    slug?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.dcomputer.local/categories/laptop.jpg' })
    @IsUrl()
    @MaxLength(500)
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    parentId?: string;

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
