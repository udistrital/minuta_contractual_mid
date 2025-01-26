import { Module } from '@nestjs/common';
import { ActaInicioService } from './acta_inicio.service';
import { ActaInicioController } from './acta_inicio.controller';

@Module({
  controllers: [ActaInicioController],
  providers: [ActaInicioService],
})
export class ActaInicioModule {}
