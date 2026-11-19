import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PersonaActaDto {
  @ApiPropertyOptional({ example: 'Ing. Martha Lucía Ramírez' })
  @IsOptional()
  @IsString()
  nombres_apellidos?: string;

  @ApiPropertyOptional({ example: 'Director de Obra' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ example: 'Ingeniería Civil / Estructuras' })
  @IsOptional()
  @IsString()
  especialidad?: string;

  @ApiPropertyOptional({ example: 'IC-456789-CND' })
  @IsOptional()
  @IsString()
  tarjeta_profesional?: string;
}

export class MaquinariaActaDto {
  @ApiPropertyOptional({ example: 'Excavadora de Orugas' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ example: 'CAT 320 GC' })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  cantidad?: number;

  @ApiPropertyOptional({ example: 'Excelente' })
  @IsOptional()
  @IsString()
  estado?: string;
}

export class EquipoActaDto {
  @ApiPropertyOptional({ example: 'Analizador de Energía' })
  @IsOptional()
  @IsString()
  equipo?: string;

  @ApiPropertyOptional({
    example: 'Analizador de calidad de energía trifásico',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'CERT-CAL-2026-8891' })
  @IsOptional()
  @IsString()
  certificado_calibracion?: string;

  @ApiPropertyOptional({ example: 'EQ-FLUKE-1736' })
  @IsOptional()
  @IsString()
  codigo_referencia?: string;
}

// Datos capturados o corregidos en el formulario del acta de inicio.
// Todos son opcionales: si no se envían se usan los datos precargados del contrato.
export class DatosActaInicioDto {
  @ApiPropertyOptional({
    example: '2026-02-15',
    description: 'Fecha de inicio de ejecución',
  })
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @ApiPropertyOptional({
    example: '2026-12-15',
    description: 'Fecha de terminación. Si no se envía se calcula con el plazo',
  })
  @IsOptional()
  @IsDateString()
  fecha_terminacion?: string;

  @ApiPropertyOptional({
    example: '2026-02-15',
    description: 'Fecha de suscripción del acta. Por defecto, la fecha actual',
  })
  @IsOptional()
  @IsDateString()
  fecha_suscripcion?: string;

  @ApiPropertyOptional({ example: 'ACT-005-2026' })
  @IsOptional()
  @IsString()
  numero_acta?: string;

  @ApiPropertyOptional({ example: 'Bogotá D.C.' })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({ example: 360000000 })
  @IsOptional()
  @IsNumber()
  valor_anticipo?: number;

  @ApiPropertyOptional({ example: 45000000 })
  @IsOptional()
  @IsNumber()
  valor_disponibilidad?: number;

  @ApiPropertyOptional({ example: 45000000 })
  @IsOptional()
  @IsNumber()
  valor_registro?: number;

  @ApiPropertyOptional({ example: 'Sede Tecnológica - Bogotá D.C.' })
  @IsOptional()
  @IsString()
  localizacion_proyecto?: string;

  @ApiPropertyOptional({ example: 'Interventorías Globales Ltda.' })
  @IsOptional()
  @IsString()
  nombre_interventor?: string;

  @ApiPropertyOptional({ example: 'Medellín' })
  @IsOptional()
  @IsString()
  ciudad_expedicion_supervisor?: string;

  @ApiPropertyOptional({
    description:
      'Facultad donde se ejecuta el contrato (compraventa). Si no se envía, se toma la dependencia del lugar de ejecución',
    example: 'Ingeniería',
  })
  @IsOptional()
  @IsString()
  nombre_facultad?: string;

  @ApiPropertyOptional({
    description:
      'Otras variables de plantilla a sobrescribir (clave: nombre de la variable)',
    example: { nombre_supervisor: 'María Fernanda Restrepo' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({ type: [PersonaActaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaActaDto)
  personal_directivo?: PersonaActaDto[];

  @ApiPropertyOptional({ type: [PersonaActaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaActaDto)
  personal_operativo?: PersonaActaDto[];

  @ApiPropertyOptional({ type: [MaquinariaActaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaquinariaActaDto)
  maquinaria_equipo?: MaquinariaActaDto[];

  @ApiPropertyOptional({ type: [EquipoActaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipoActaDto)
  equipos?: EquipoActaDto[];
}

export class GenerarActaInicioDto extends DatosActaInicioDto {
  @ApiProperty({ example: 1, description: 'Id del usuario que genera el acta' })
  @IsNotEmpty()
  @IsInt()
  usuario_id: number;

  @ApiProperty({
    example: 'ABOGADO_CONTRATACION_RECTOR',
    description: 'Rol del usuario que genera el acta',
  })
  @IsNotEmpty()
  @IsString()
  usuario_rol: string;

  @ApiPropertyOptional({ example: 'Acta de inicio del contrato' })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
