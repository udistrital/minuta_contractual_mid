import { Controller, Get, Param, Res } from '@nestjs/common';
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
    description: 'Id del contrato general (entero positivo)',
    required: true,
  })
  // El código HTTP es igual a Status; el cuerpo es el mismo en todos los casos
  @ApiResponse({
    status: 200,
    type: RespuestaMinutaDto,
    description: 'Minuta generada: Data trae el PDF en base64',
  })
  @ApiResponse({
    status: 400,
    type: RespuestaMinutaDto,
    description: 'El id del contrato no es un entero positivo',
  })
  @ApiResponse({
    status: 404,
    type: RespuestaMinutaDto,
    description:
      'Contrato general no encontrado, o plantilla no configurada para su unidad ejecutora y tipo de contrato',
  })
  @ApiResponse({
    status: 422,
    type: RespuestaMinutaDto,
    description:
      'Faltan datos obligatorios (contratista, ordenador, vigencia o cláusulas): "Faltan datos: <lista>"',
  })
  @ApiResponse({
    status: 502,
    type: RespuestaMinutaDto,
    description:
      'Un servicio no respondió o respondió con error: "Servicio no disponible: <servicio>"',
  })
  @ApiResponse({
    status: 500,
    type: RespuestaMinutaDto,
    description: 'Error inesperado',
  })
  async obtenerMinuta(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaMinutaDto> {
    const respuesta = await this.minutaService.obtenerMinuta(id);
    // Único punto donde se fija el código HTTP: es el mismo Status del cuerpo
    res.status(respuesta.Status);
    return respuesta;
  }
}
