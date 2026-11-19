import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { ActaInicioService } from '../acta_inicio.service';
import { ESCENARIOS_MOCK } from './datos-mock';
import { ServiciosMock } from './servicios-mock';

// Endpoints para ver en Swagger el PDF de cada plantilla con datos simulados
@Controller('acta-inicio/mock')
export class ActaInicioMockController {
  constructor(
    private readonly actaInicioService: ActaInicioService,
    private readonly serviciosMock: ServiciosMock,
  ) {}

  @Get('contratos/:id/pdf')
  @ApiOperation({
    summary:
      'PDF del acta de inicio del contrato simulado (9001, 9002, 9003 y 9005) con sus datos de formulario',
  })
  @ApiParam({ name: 'id', type: 'number', example: 9001 })
  @ApiProduces('application/pdf')
  async pdf(@Param('id') id: number, @Res() res: Response) {
    const respuesta: any = await this.actaInicioService.obtenerMinuta(
      id,
      ESCENARIOS_MOCK[id]?.datosFormulario ?? {},
    );
    if (!respuesta.Success) {
      res.status(respuesta.Status).json(respuesta);
      return;
    }
    const archivo = Buffer.from(respuesta.Data.pdf, 'base64');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="acta-inicio-${id}.pdf"`,
    });
    res.end(archivo);
  }

  @Post('reiniciar')
  @ApiOperation({ summary: 'Borra las actas, documentos y estados simulados' })
  reiniciar() {
    this.serviciosMock.reiniciar();
    return {
      Success: true,
      Status: 200,
      Message: 'Datos simulados reiniciados',
    };
  }
}
