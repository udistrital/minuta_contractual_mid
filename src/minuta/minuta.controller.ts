import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MinutaService } from './minuta.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RespuestaMinutaDto } from './dto/respuesta-minuta.dto';

@Controller('minutas')
export class MinutaController {
  constructor(private readonly minutaService: MinutaService) {}

  @Get('contratos/:id')
  @ApiOperation({ summary: 'Generación de minuta en PDF (base64)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada correctamente',
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
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
