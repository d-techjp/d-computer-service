import { Module } from '@nestjs/common';
import { RedisTokenVersionStore } from './redis-token-version.store';
import { TokenVersionStore } from './token-version.store';

/**
 * Tách riêng khỏi AuthModule để UsersModule dùng được store mà không tạo vòng
 * phụ thuộc (AuthModule đã import UsersModule).
 */
@Module({
    providers: [{ provide: TokenVersionStore, useClass: RedisTokenVersionStore }],
    exports: [TokenVersionStore],
})
export class TokenVersionModule {}
