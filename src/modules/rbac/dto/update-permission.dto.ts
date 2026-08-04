import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePermissionDto } from './create-permission.dto';

/** `code` bị khoá sau khi tạo: nó là thứ `@RequirePermissions(...)` so khớp. */
export class UpdatePermissionDto extends PartialType(
    OmitType(CreatePermissionDto, ['code'] as const),
) {}
