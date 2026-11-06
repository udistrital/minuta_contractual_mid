import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DatosActaInicioDto } from './datos-acta-inicio.dto';

// Validación del cuerpo que envía el formulario del acta de inicio
describe('DatosActaInicioDto', () => {
  const errores = async (cuerpo: any) =>
    (await validate(plainToInstance(DatosActaInicioDto, cuerpo))).map(
      (error) => error.property,
    );

  it('acepta los datos del formulario y las listas de obra e interventoría', async () => {
    expect(
      await errores({
        valor_disponibilidad: 54600000,
        variables: { numero_acta: 'AI-01' },
        personal_directivo: [
          { nombres_apellidos: 'Ana Pérez', cargo: 'Directora' },
        ],
        personal_operativo: [{ nombres_apellidos: 'Luis Gómez' }],
        maquinaria_equipo: [{ tipo: 'Retroexcavadora', cantidad: 1 }],
        equipos: [{ equipo: 'Estación total' }],
      }),
    ).toEqual([]);
  });

  it('rechaza valores en pesos como texto y elementos inválidos en las listas', async () => {
    expect(
      await errores({
        valor_disponibilidad: '$ 54.600.000',
        maquinaria_equipo: [{ cantidad: 'una' }],
      }),
    ).toEqual(['valor_disponibilidad', 'maquinaria_equipo']);
  });
});
