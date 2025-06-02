import { Module } from '@nestjs/common';
import { CoreModule } from '@src/core/core.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [CoreModule, UsersModule],
})
export class AppModule {}
