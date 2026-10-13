import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ActaInicioService } from '../acta_inicio.service';
import { ActaInicioMockController } from './acta_inicio_mock.controller';
import { SERVICIOS_MOCK, ServiciosMock } from './servicios-mock';

// Solo se registra con ACTA_INICIO_MOCK=true (ver app.module.ts)
@Module({
  controllers: [ActaInicioMockController],
  providers: [
    ActaInicioService,
    {
      provide: ServiciosMock,
      inject: [ConfigService],
      // Las URL de los servicios se leen del .env
      useFactory: (configService: ConfigService) =>
        new ServiciosMock(
          Object.fromEntries(
            SERVICIOS_MOCK.map((servicio) => [
              servicio,
              configService.get<string>(servicio),
            ]),
          ),
        ),
    },
  ],
})
export class ActaInicioMockModule implements OnModuleInit, OnModuleDestroy {
  private adaptadorOriginal = axios.defaults.adapter;

  constructor(private readonly serviciosMock: ServiciosMock) {}

  onModuleInit() {
    axios.defaults.adapter = this.serviciosMock.crearAdaptador(
      axios.getAdapter(this.adaptadorOriginal),
    );
  }

  onModuleDestroy() {
    axios.defaults.adapter = this.adaptadorOriginal;
  }
}
