import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  CONTRATO_ID_MAXIMO,
  ContratoIdPipe,
  MENSAJE_ID_RUTA_INVALIDO,
} from '../utils/contrato-id.pipe';
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

  // Debe declararse antes de POST contratos/:id: Express resuelve las rutas en
  // orden de registro y 'previsualizacion' caería en la generación del acta.
  // Lo cubre test/actas-rutas.e2e-spec.ts.
  @Post('contratos/previsualizacion')
  @ApiOperation({ summary: 'Vista previa del acta de inicio en PDF (base64)' })
  @ApiQuery({
    name: 'contrato_id',
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
  @ApiResponse({
    status: 201,
    description: 'Solicitud procesada correctamente',
  })
  @ApiResponse({ status: 400, description: 'contrato_id ausente o inválido' })
  async previsualizar(
    @Query('contrato_id', ContratoIdPipe) contratoId: number,
    @Body() datos: DatosActaInicioDto,
  ) {
    return await this.actaInicioService.obtenerMinuta(contratoId, datos);
  }

  @Post('contratos/:id')
  @ApiOperation({
    summary:
      'Genera el acta de inicio: PDF (base64), registro del acta y contrato en ejecución',
  })
  @ApiParam({
    name: 'id',
    description: 'Id del contrato general',
    schema: {
      type: 'integer',
      format: 'int32',
      minimum: 1,
      maximum: CONTRATO_ID_MAXIMO,
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud procesada correctamente',
  })
  @ApiResponse({ status: 400, description: 'id inválido o cuerpo inválido' })
  async generar(
    @Param('id', new ContratoIdPipe(MENSAJE_ID_RUTA_INVALIDO)) id: number,
    @Body() datos: GenerarActaInicioDto,
  ) {
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
