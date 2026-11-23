// Formatos de los datos que la minuta envía al renderizado

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// Fecha en español ("3 de noviembre de 2026") tomada del texto AAAA-MM-DD,
// sin pasar por Date para no correrla un día por la zona horaria. Si el texto
// no trae una fecha válida se devuelve tal cual.
export function formatearFechaEnEspanol(fecha: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha ?? ''));
  if (!coincidencia) return fecha;
  const [, anio, mes, dia] = coincidencia;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes || Number(dia) < 1 || Number(dia) > 31) return fecha;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

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
