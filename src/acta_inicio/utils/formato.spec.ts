import {
  descomponerFecha,
  formatearDocumento,
  formatearPlazo,
  sumarPlazo,
} from './formato';

describe('formato acta de inicio', () => {
  it('descompone fechas sin desfase de zona horaria', () => {
    expect(descomponerFecha('2027-03-01')).toEqual({
      iso: '2027-03-01',
      dia_letras: 'primero',
      dia_numero: '1',
      mes: 'marzo',
      year: '2027',
    });
    expect(descomponerFecha('2026-02-15T00:00:00.000Z').dia_letras).toBe(
      'quince',
    );
    expect(descomponerFecha(null)).toBeNull();
  });

  it('suma plazos en días, meses y años', () => {
    expect(sumarPlazo('2026-02-15', 10, 'MES')).toBe('2026-12-15');
    expect(sumarPlazo('2026-01-31', 1, 'Mes(es)')).toBe('2026-02-28');
    expect(sumarPlazo('2026-04-10', 30, 'DIA')).toBe('2026-05-10');
    expect(sumarPlazo('2026-03-01', 1, 'Año')).toBe('2027-03-01');
    expect(sumarPlazo('2026-03-01', 1, 'SEMANA')).toBeNull();
  });

  it('formatea plazo, pesos y documentos', () => {
    expect(formatearPlazo(10, 'MES')).toBe('10 meses');
    expect(formatearPlazo(1, 'Año')).toBe('1 año');
    expect(formatearDocumento('1015432109')).toBe('1.015.432.109');
    expect(formatearDocumento('52345678')).toBe('52.345.678');
  });
});
