import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 502, description: 'Servicio dependiente no disponible' })
  async obtenerActaPoliza(@Param('id') id: number) {
    return await this.actaPolizaService.obtenerActaPoliza(id);
  }

  @Post('contratos/:id/borrador')
  @ApiOperation({
    summary:
      'Borrador del acta de aprobación de póliza en PDF (base64), con amparos aún sin registrar',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
    required: true,
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
  @ApiResponse({ status: 200, description: 'Borrador generado correctamente' })
  @ApiResponse({ status: 400, description: 'Póliza inconsistente' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  @ApiResponse({ status: 502, description: 'Servicio dependiente no disponible' })
  async obtenerBorradorActaPoliza(
    @Param('id') id: number,
    @Body() body: { amparos?: FilaAmparoBorrador[] },
  ) {
    return await this.actaPolizaService.obtenerActaPoliza(
      id,
      Array.isArray(body?.amparos) ? body.amparos : [],
    );
  }
}
