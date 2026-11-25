import { BadRequestException, HttpStatus, PipeTransform } from '@nestjs/common';

// Llave de contrato_general: SERIAL (int4) en el CRUD.
export const CONTRATO_ID_MAXIMO = 2147483647;

export const MENSAJE_CONTRATO_ID_INVALIDO =
  'El id del contrato es obligatorio y debe ser un entero positivo';

export const MENSAJE_ID_RUTA_INVALIDO =
  'El id del contrato debe ser un entero positivo';

// Valida el id de un contrato general: entero en base 10, sin signo, espacios,
// decimales ni notación científica o hexadecimal. Por defecto lee el parámetro
// de consulta `contrato_id`; con `mensaje` se usa también para un id de ruta.
export class ContratoIdPipe implements PipeTransform<unknown, number> {
  constructor(private readonly mensaje = MENSAJE_CONTRATO_ID_INVALIDO) {}

  transform(valor: unknown): number {
    if (
      typeof valor !== 'string' ||
      !/^[1-9]\d{0,9}$/.test(valor) ||
      Number(valor) > CONTRATO_ID_MAXIMO
    ) {
      throw new BadRequestException({
        Success: false,
        Status: HttpStatus.BAD_REQUEST,
        Message: this.mensaje,
      });
    }
    return Number(valor);
  }
}
