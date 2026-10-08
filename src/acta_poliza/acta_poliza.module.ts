import { Module } from '@nestjs/common';
import { ActaPolizaService } from './acta_poliza.service';
import { ActaPolizaController } from './acta_poliza.controller';

@Module({
  controllers: [ActaPolizaController],
  providers: [ActaPolizaService],
})
export class ActaPolizaModule {}
