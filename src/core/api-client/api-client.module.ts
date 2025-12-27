import { Module } from '@nestjs/common';
import { ApiClientService } from './api-client.service';
import { LogModule } from '../logger/log.module';

@Module({
  imports: [LogModule],
  providers: [ApiClientService],
  exports: [ApiClientService],
})
export class ApiClientModule {}
