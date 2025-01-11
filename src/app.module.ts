import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MinutaModule } from './minuta/minuta.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MinutaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
