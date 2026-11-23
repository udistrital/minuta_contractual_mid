import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CONTRATO_ID_MAXIMO, ContratoIdPipe } from '../utils/contrato-id.pipe';
import { ActaPolizaService, FilaAmparoBorrador } from './acta_poliza.service';

@Controller('acta-poliza')
export class ActaPolizaController {
  constructor(private readonly actaPolizaService: ActaPolizaService) {}

  @Get('contratos/:id')
  @ApiOperation({
    summary: 'Generación del acta de aprobación de póliza en PDF (base64)',
  })
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
  @ApiResponse({ status: 400, description: 'Póliza inconsistente' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @ApiResponse({
    status: 502,
    description: 'Servicio dependiente no disponible',
  })
  async obtenerActaPoliza(@Param('id') id: number) {
    return await this.actaPolizaService.obtenerActaPoliza(id);
  }

  @Post('contratos/borrador')
  @ApiOperation({
    summary:
      'Borrador del acta de aprobación de póliza en PDF (base64), con amparos aún sin registrar',
  })
  @ApiQuery({
    name: 'contrato-id',
    required: true,
    description: 'Id del contrato general',
    schema: {
      type: 'integer',
      format: 'int32',
      minimum: 1,
      maximum: CONTRATO_ID_MAXIMO,
      example: 9001,
    },
  })
  @ApiBody({
    schema: {
      example: {
        amparos: [
          {
            id: 1,
            valor: 5000000,
            fecha_inicio: '2024-01-15',
            fecha_fin: '2025-01-15',
          },
        ],
      },
    },
  })
  // HTTP 201 en todos los resultados de la generación; el resultado va en Status
  // (README). Solo contrato-id inválido responde con HTTP 400.
  @ApiResponse({
    status: 201,
    description:
      'Solicitud procesada; Status 200 borrador generado, 400 póliza inconsistente, 404 recurso no encontrado, 502 servicio dependiente no disponible',
  })
  @ApiResponse({ status: 400, description: 'contrato-id ausente o inválido' })
  async obtenerBorradorActaPoliza(
    @Query('contrato-id', ContratoIdPipe) contratoId: number,
    @Body() body: { amparos?: FilaAmparoBorrador[] },
  ) {
    return await this.actaPolizaService.obtenerActaPoliza(
      contratoId,
      Array.isArray(body?.amparos) ? body.amparos : [],
    );
  }
}
