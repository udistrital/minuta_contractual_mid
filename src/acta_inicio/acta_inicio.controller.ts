import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ActaInicioService } from './acta_inicio.service';
import {
  DatosActaInicioDto,
  GenerarActaInicioDto,
} from './dto/datos-acta-inicio.dto';

@Controller('acta-inicio')
export class ActaInicioController {
  constructor(private readonly actaInicioService: ActaInicioService) {}

  @Get('contratos/:id')
  @ApiOperation({
    summary:
      'Datos precargados del acta de inicio, campos faltantes y prerrequisitos',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada correctamente',
  })
  async obtenerPrecarga(@Param('id') id: number) {
    return await this.actaInicioService.obtenerPrecarga(id);
  }

  @Post('contratos/:id/previsualizacion')
  @ApiOperation({ summary: 'Vista previa del acta de inicio en PDF (base64)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud procesada correctamente',
  })
  async previsualizar(
    @Param('id') id: number,
    @Body() datos: DatosActaInicioDto,
  ) {
    return await this.actaInicioService.obtenerMinuta(id, datos);
  }

  @Post('contratos/:id')
  @ApiOperation({
    summary:
      'Genera el acta de inicio: PDF, gestor documental, registro del acta y contrato en ejecución',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud procesada correctamente',
  })
  async generar(@Param('id') id: number, @Body() datos: GenerarActaInicioDto) {
    return await this.actaInicioService.generarActaInicio(id, datos);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Acta de inicio registrada para un contrato y su documento',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Id del contrato general',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada correctamente',
  })
  async obtenerActaPorContrato(@Param('id') id: number) {
    return await this.actaInicioService.obtenerActaPorContrato(id);
  }
}
