import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MinutaModule } from './minuta/minuta.module';
import { ActaInicioModule } from './acta_inicio/acta_inicio.module';
import { ActaPolizaModule } from './acta_poliza/acta_poliza.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MinutaModule,
    ActaInicioModule,
    ActaPolizaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
