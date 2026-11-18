import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressesService } from './application/customer-addresses.service';
import { ClientCustomerAddressesController } from './client/client-customer-addresses.controller';
import { CustomerAddressesRepository } from './domain/customer-addresses.repository';
import { CustomerAddress } from './entities/customer-address.entity';
import { TypeOrmCustomerAddressesRepository } from './infrastructure/typeorm-customer-addresses.repository';

/** Chỉ có phía storefront; checkout chưa đọc trực tiếp (FE gửi địa chỉ đã chọn). */
@Module({
    imports: [TypeOrmModule.forFeature([CustomerAddress])],
    controllers: [ClientCustomerAddressesController],
    providers: [
        CustomerAddressesService,
        {
            provide: CustomerAddressesRepository,
            useClass: TypeOrmCustomerAddressesRepository,
        },
    ],
})
export class CustomerAddressesModule {}
