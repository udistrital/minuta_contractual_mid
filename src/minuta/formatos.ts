// Formatos de los datos que la minuta envía al renderizado

// Valor con formato colombiano y sin símbolo: 1.500.000, o 1.500.000,50 si
// tiene centavos. Vacío si no hay un número.
export function formatearValorPesos(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  const redondeado = Math.round(numero * 100) / 100;
  const decimales = Number.isInteger(redondeado) ? 0 : 2;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(redondeado);
}
