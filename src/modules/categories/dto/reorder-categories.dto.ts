import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { toInteger } from '../../../common/transformers/transform.helpers';

export class ReorderCategoryItemDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    id: string;

    @ApiProperty({ minimum: 0, description: 'Vị trí hiển thị mới, nhỏ hơn đứng trước' })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    sortOrder: number;
}

export class ReorderCategoriesDto {
    @ApiProperty({ type: [ReorderCategoryItemDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ReorderCategoryItemDto)
    items: ReorderCategoryItemDto[];
}
