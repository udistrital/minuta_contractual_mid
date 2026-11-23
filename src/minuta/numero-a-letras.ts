// Valor en letras, portado de numeroALetras de gestion_contractual_mf
// (paso-info-presupuestal.utilidades.ts) para que la minuta diga lo mismo que
// el paso de cláusulas. Solo escribe la parte entera; los centavos no se
// escriben, igual que en el MF.
//
// Diferencias con el MF, solo en casos que el MF escribe mal:
// - desde mil millones el MF arma el número de millones con las centenas y
//   escribe "Undefined millones"; aquí se usan los miles ("mil millones",
//   "dos mil quinientos millones");
// - entre 0 y 1 (solo centavos) el MF escribe " pesos M/CTE"; aquí, "Cero
//   pesos M/CTE".
// En el resto el resultado es el mismo.
export function numeroALetras(num: number): string {
  if (isNaN(num) || num === null || num === undefined || num <= 0) {
    return 'Cero pesos M/CTE';
  }

  const unidades = (n: number): string => {
    switch (n) {
      case 1:
        return 'un';
      case 2:
        return 'dos';
      case 3:
        return 'tres';
      case 4:
        return 'cuatro';
      case 5:
        return 'cinco';
      case 6:
        return 'seis';
      case 7:
        return 'siete';
      case 8:
        return 'ocho';
      case 9:
        return 'nueve';
      default:
        return '';
    }
  };

  const decenas = (n: number): string => {
    if (n < 10) return unidades(n);
    if (n >= 10 && n <= 15) {
      const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince'];
      return especiales[n - 10];
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
    const strMillon = millon === 1 ? 'un millón' : `${miles(millon)} millones`;
    if (resto === 0) return `${strMillon} de`;
    return `${strMillon} ${miles(resto)}`;
  };

  const entero = Math.floor(Math.abs(num));
  if (entero === 0) return 'Cero pesos M/CTE';
  const resultado = millones(entero);
  const capitalizado = resultado.charAt(0).toUpperCase() + resultado.slice(1);
  return `${capitalizado} pesos M/CTE`;
}
