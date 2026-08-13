import { PartialType } from '@nestjs/swagger';
import { CreateCarouselDto } from './create-carousel.dto';

/**
 * `filters` gửi lên THAY THẾ nguyên cụm, không merge từng key — merge thì admin
 * không còn cách nào bỏ một điều kiện đã đặt. Gửi `{}` để xoá sạch bộ lọc.
 */
export class UpdateCarouselDto extends PartialType(CreateCarouselDto) {}
