import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { toInteger } from '../../../common/transformers/transform.helpers';

export class ReorderTiktokVideoItemDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    id: string;

    @ApiProperty({ minimum: 0 })
    @Transform(toInteger)
    @IsInt()
    @Min(0)
    sortOrder: number;
}

export class ReorderTiktokVideosDto {
    @ApiProperty({
        type: [ReorderTiktokVideoItemDto],
        description: 'Toàn bộ thứ tự sau khi kéo-thả',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ReorderTiktokVideoItemDto)
    items: ReorderTiktokVideoItemDto[];
}
