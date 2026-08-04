import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** `code` bị khoá sau khi tạo: nó đã đi vào JWT và các `@Roles(...)` hard-code. */
export class UpdateRoleDto extends PartialType(OmitType(CreateRoleDto, ['code'] as const)) {}
