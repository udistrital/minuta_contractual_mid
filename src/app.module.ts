import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { MinutaModule } from './minuta/minuta.module';
import { ActaInicioModule } from './acta_inicio/acta_inicio.module';
import { ActaInicioMockModule } from './acta_inicio/mock/acta_inicio_mock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MinutaModule,
    ActaInicioModule,
    // Datos simulados para probar el acta de inicio (ACTA_INICIO_MOCK=true)
    ConditionalModule.registerWhen(
      ActaInicioMockModule,
      (env) => env.ACTA_INICIO_MOCK === 'true',
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

