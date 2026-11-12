import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Sobre de respuesta de GET /minutas/contratos/{id}
export class RespuestaMinutaDto {
  @ApiProperty({
    example: true,
    description: 'true solo cuando Status es 200',
  })
  Success: boolean;

  @ApiProperty({
    example: 200,
    enum: [200, 400, 404, 422, 500, 502],
    description:
      'Resultado: 200 minuta generada; 400 id inválido; 404 contrato o plantilla no encontrados; 422 faltan datos obligatorios; 502 servicio no disponible; 500 error inesperado',
  })
  Status: number;

  @ApiProperty({
    example: 'Minuta generada exitosamente',
    description:
      'Mensaje del resultado. En 422: "Faltan datos: <lista>"; en 502: "Servicio no disponible: <servicio>"',
  })
  Message: string;

  @ApiPropertyOptional({
    example: 'JVBERi0xLjcK...',
    description: 'PDF de la minuta en base64; solo viene con Status 200',
  })
  Data?: string;
}
