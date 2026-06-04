import { Global, Module } from '@nestjs/common';
import { HashService } from './hash.service';


const sharedProviders = [HashService];

@Global()
@Module({
  providers: sharedProviders,
  exports: sharedProviders,
})
export class CryptoModule {}