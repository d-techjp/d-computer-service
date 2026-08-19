import { PartialType } from '@nestjs/swagger';
import { CreateTiktokVideoDto } from './create-tiktok-video.dto';

export class UpdateTiktokVideoDto extends PartialType(CreateTiktokVideoDto) {}
