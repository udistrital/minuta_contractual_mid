import { Controller } from '@nestjs/common';
import { ActaInicioService } from './acta_inicio.service';

@Controller('acta-inicio')
export class ActaInicioController {
  constructor(private readonly actaInicioService: ActaInicioService) {}
}
