import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MinutaService } from './minuta.service';
import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RespuestaMinutaDto } from './dto/respuesta-minuta.dto';

@Controller('minutas')
export class MinutaController {
  constructor(private readonly minutaService: MinutaService) {}

  @Get('contratos/:id')
  @ApiOperation({ summary: 'Generación de minuta en PDF (base64)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general (entero positivo)',
    required: true,
  })
  @ApiOkResponse({
    type: RespuestaMinutaDto,
    description:
      'Siempre HTTP 200. El resultado va en Status del cuerpo (200, 400, 404, 422, 502 o 500) y Data solo trae el PDF cuando Status es 200.',
  })
  async obtenerMinuta(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaMinutaDto> {
    const respuesta = await this.minutaService.obtenerMinuta(id);
    // Único punto donde se fija el código HTTP. Por compatibilidad responde
    // siempre 200 y el resultado va en Status; para responder el código real,
    // usar respuesta.Status.
    res.status(HttpStatus.OK);
    return respuesta;
  }
}
