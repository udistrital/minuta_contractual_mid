import { Controller, Post, Param } from '@nestjs/common';
import { MinutaService } from './minuta.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('minutas')
export class MinutaController {
  constructor(private readonly minutaService: MinutaService) {}

  @Post('contratos/:id')
  @ApiOperation({ summary: 'Generación de minuta en PDF (base64)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Solicitud procesada correctamente' })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async obtenerMinuta(@Param('id') id: number) {
    return await this.minutaService.obtenerMinuta(id);
  }
}
