import { formatearFechaEnEspanol, formatearValorPesos } from './formatos';

describe('formatearFechaEnEspanol', () => {
  it.each([
    ['2026-11-03', '3 de noviembre de 2026'],
    ['2026-01-01', '1 de enero de 2026'],
    ['2026-12-31', '31 de diciembre de 2026'],
    ['2026-09-15', '15 de septiembre de 2026'],
  ])('%s → %s', (fecha, esperado) => {
    expect(formatearFechaEnEspanol(fecha)).toBe(esperado);
  });

  it('toma la fecha del texto aunque traiga hora y zona (sin correrla un día)', () => {
    expect(formatearFechaEnEspanol('2026-11-03T00:00:00Z')).toBe(
      '3 de noviembre de 2026',
    );
    expect(formatearFechaEnEspanol('2026-11-03T23:59:59-05:00')).toBe(
      '3 de noviembre de 2026',
    );
  });

  it('no depende de la zona horaria del proceso', () => {
    const zonaOriginal = process.env.TZ;
    try {
      for (const zona of ['UTC', 'America/Bogota', 'Pacific/Kiritimati']) {
        process.env.TZ = zona;
        expect(formatearFechaEnEspanol('2026-01-01')).toBe(
          '1 de enero de 2026',
        );
      }
    } finally {
      process.env.TZ = zonaOriginal;
    }
  });

  it.each(['', 'sin fecha', '2026-13-01', '2026-00-10', '2026-11-00'])(
    'devuelve el texto tal cual si no es una fecha válida: %p',
    (texto) => {
      expect(formatearFechaEnEspanol(texto)).toBe(texto);
    },
  );
});

describe('formatearValorPesos', () => {
  it.each([
    [1500000, '1.500.000'],
    [1500, '1.500'],
    [999999999, '999.999.999'],
    [0, '0'],
    ['2500000', '2.500.000'],
    [1500000.5, '1.500.000,50'],
    [1500000.05, '1.500.000,05'],
    [1500000.004, '1.500.000'],
    [1500000.999, '1.500.001'],
  ])('%p → %p (sin símbolo; centavos solo si hay)', (valor, esperado) => {
    expect(formatearValorPesos(valor)).toBe(esperado);
  });

  it.each([null, undefined, '', 'abc', NaN, Infinity])(
    'vacío si no hay un número: %p',
    (valor) => {
      expect(formatearValorPesos(valor)).toBe('');
    },
  );
});
