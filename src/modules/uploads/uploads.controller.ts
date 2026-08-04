import {
    Controller,
    Post,
    Query,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity } from '../../common/decorators/activity-log.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import { ActivityAction } from '../activity-logs/enums/activity-action.enum';
import { MAX_IMAGES_PER_REQUEST } from './constants/upload.constants';
import { UploadImageQueryDto } from './dto/upload-image-query.dto';
import { UploadImageResponseDto } from './dto/upload-image-response.dto';
import { buildImageMulterOptions } from './multer-options';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post('images')
    // Ảnh dùng cho cả sản phẩm lẫn bài viết -> chỉ cần một trong hai quyền
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE, PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'upload' })
    @UseInterceptors(FileInterceptor('file', buildImageMulterOptions()))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Tải 1 ảnh lên R2',
        description:
            'Trả về URL công khai — dùng URL này cho field thumbnail khi tạo/sửa sản phẩm hoặc bài viết. Tối đa 5MB, chỉ nhận jpeg/png/webp/gif.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file'],
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Query() query: UploadImageQueryDto,
    ): Promise<UploadImageResponseDto> {
        return this.uploadsService.uploadImage(file, query.folder);
    }

    @Post('images/multiple')
    // Ảnh dùng cho cả sản phẩm lẫn bài viết -> chỉ cần một trong hai quyền
    @RequirePermissions(PermissionCode.PRODUCT_MANAGE, PermissionCode.ARTICLE_MANAGE)
    @LogActivity({ action: ActivityAction.CREATE, resource: 'upload' })
    @UseInterceptors(
        FilesInterceptor(
            'files',
            MAX_IMAGES_PER_REQUEST,
            buildImageMulterOptions(MAX_IMAGES_PER_REQUEST),
        ),
    )
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: `Tải nhiều ảnh lên R2 (tối đa ${MAX_IMAGES_PER_REQUEST} ảnh)`,
        description:
            'Dùng cho field images[] của sản phẩm — trả về danh sách URL theo đúng thứ tự file đã gửi.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['files'],
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    })
    uploadImages(
        @UploadedFiles() files: Express.Multer.File[],
        @Query() query: UploadImageQueryDto,
    ): Promise<UploadImageResponseDto[]> {
        return this.uploadsService.uploadImages(files, query.folder);
    }
}
