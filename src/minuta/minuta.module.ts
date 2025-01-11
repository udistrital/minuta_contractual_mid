import { Module } from '@nestjs/common';
import { MinutaService } from './minuta.service';
import { MinutaController } from './minuta.controller';

@Module({
  controllers: [MinutaController],
  providers: [MinutaService],
})
export class MinutaModule {}
