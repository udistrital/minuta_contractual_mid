import { numeroALetras } from './numero-a-letras';

// Copia literal de numeroALetras de gestion_contractual_mf
// (paso-info-presupuestal.utilidades.ts), para comprobar que la minuta escribe
// lo mismo que el paso de cláusulas.
function numeroALetrasMf(num: number): string {
  if (isNaN(num) || num === null || num === undefined || num <= 0) {
    return 'Cero pesos M/CTE';
  }
  const unidades = (n: number): string =>
    [
      '',
      'un',
      'dos',
      'tres',
      'cuatro',
      'cinco',
      'seis',
      'siete',
      'ocho',
      'nueve',
    ][n] ?? '';
  const decenas = (n: number): string => {
    if (n < 10) return unidades(n);
    if (n >= 10 && n <= 15) {
      return ['diez', 'once', 'doce', 'trece', 'catorce', 'quince'][n - 10];
    }
    if (n < 20) return 'dieci' + unidades(n - 10);
    if (n === 20) return 'veinte';
    if (n < 30) return 'veinti' + unidades(n - 20);
    const d = Math.floor(n / 10);
    const u = n % 10;
    const nombresD = [
      '',
      '',
      '',
      'treinta',
      'cuarenta',
      'cincuenta',
      'sesenta',
      'setenta',
      'ochenta',
      'noventa',
    ];
    return u === 0 ? nombresD[d] : `${nombresD[d]} y ${unidades(u)}`;
  };
  const centenas = (n: number): string => {
    if (n < 100) return decenas(n);
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100);
    const r = n % 100;
    const nombresC = [
      '',
      'ciento',
      'doscientos',
      'trescientos',
      'cuatrocientos',
      'quinientos',
      'seiscientos',
      'setecientos',
      'ochocientos',
      'novecientos',
    ];
    return r === 0 ? nombresC[c] : `${nombresC[c]} ${decenas(r)}`;
  };
  const miles = (n: number): string => {
    if (n < 1000) return centenas(n);
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    const strMil = mil === 1 ? 'mil' : `${centenas(mil)} mil`;
    if (resto === 0) return strMil;
    return `${strMil} ${centenas(resto)}`;
  };
  const millones = (n: number): string => {
    if (n < 1000000) return miles(n);
    const millon = Math.floor(n / 1000000);
    const resto = n % 1000000;
    const strMillon =
      millon === 1 ? 'un millón' : `${centenas(millon)} millones`;
    if (resto === 0) return `${strMillon} de`;
    return `${strMillon} ${miles(resto)}`;
  };
  const entero = Math.floor(Math.abs(num));
  const resultado = millones(entero);
  return `${resultado.charAt(0).toUpperCase() + resultado.slice(1)} pesos M/CTE`;
}

describe('numeroALetras', () => {
  it.each([
    [0, 'Cero pesos M/CTE'],
    [-5, 'Cero pesos M/CTE'],
    [NaN, 'Cero pesos M/CTE'],
    [null as unknown as number, 'Cero pesos M/CTE'],
    [undefined as unknown as number, 'Cero pesos M/CTE'],
  ])('cero, negativos y valores no numéricos: %p', (valor, esperado) => {
    expect(numeroALetras(valor)).toBe(esperado);
  });

  it.each([
    [1, 'Un pesos M/CTE'],
    [15, 'Quince pesos M/CTE'],
    [16, 'Dieciseis pesos M/CTE'],
    [21, 'Veintiun pesos M/CTE'],
    [45, 'Cuarenta y cinco pesos M/CTE'],
    [100, 'Cien pesos M/CTE'],
    [101, 'Ciento un pesos M/CTE'],
    [999, 'Novecientos noventa y nueve pesos M/CTE'],
  ])('unidades, decenas y centenas: %p', (valor, esperado) => {
    expect(numeroALetras(valor)).toBe(esperado);
  });

  it.each([
    [1000, 'Mil pesos M/CTE'],
    [1001, 'Mil un pesos M/CTE'],
    [21000, 'Veintiun mil pesos M/CTE'],
    [150000, 'Ciento cincuenta mil pesos M/CTE'],
    [
      999999,
      'Novecientos noventa y nueve mil novecientos noventa y nueve pesos M/CTE',
    ],
  ])('miles: %p', (valor, esperado) => {
    expect(numeroALetras(valor)).toBe(esperado);
  });

  it.each([
    [1000000, 'Un millón de pesos M/CTE'],
    [1500000, 'Un millón quinientos mil pesos M/CTE'],
    [2000000, 'Dos millones de pesos M/CTE'],
    [
      25300450,
      'Veinticinco millones trescientos mil cuatrocientos cincuenta pesos M/CTE',
    ],
  ])('millones: %p', (valor, esperado) => {
    expect(numeroALetras(valor)).toBe(esperado);
  });

  it('los centavos no se escriben, igual que en el MF (con solo centavos, cero)', () => {
    expect(numeroALetras(1500000.5)).toBe(
      'Un millón quinientos mil pesos M/CTE',
    );
    expect(numeroALetras(0.75)).toBe('Cero pesos M/CTE');
    expect(numeroALetrasMf(0.75)).toBe(' pesos M/CTE');
  });

  it('desde mil millones usa los miles (el MF escribe "undefined millones")', () => {
    expect(numeroALetras(1000000000)).toBe('Mil millones de pesos M/CTE');
    expect(numeroALetras(2500000000)).toBe(
      'Dos mil quinientos millones de pesos M/CTE',
    );
    expect(numeroALetrasMf(1000000000)).toMatch(/undefined/i);
  });

  it('da el mismo resultado que el MF por debajo de mil millones', () => {
    const valores = [
      1, 9, 10, 19, 20, 29, 30, 99, 110, 555, 1999, 12345, 100000, 999999,
      1000001, 7654321, 10000000, 123456789, 999999999, 3500000.99,
    ];
    for (let n = 1; n <= 3000; n += 7) valores.push(n);
    for (let n = 1000; n < 999999999; n = Math.floor(n * 1.37) + 13) {
      valores.push(n);
    }
    for (const valor of valores) {
      expect(numeroALetras(valor)).toBe(numeroALetrasMf(valor));
    }
  });
});
