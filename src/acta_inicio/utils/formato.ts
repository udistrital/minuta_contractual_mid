const DIAS_EN_LETRAS = [
  'primero',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
  'treinta',
  'treinta y uno',
];

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

export interface FechaDescompuesta {
  iso: string;
  dia_letras: string;
  dia_numero: string;
  mes: string;
  year: string;
}

// Fecha actual (YYYY-MM-DD) en la zona horaria de Colombia
export function fechaActualColombia(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
  }).format(new Date());
}

// Convierte una fecha (Date o 'YYYY-MM-DD...') a 'YYYY-MM-DD' sin desfase de zona horaria
export function aFechaIso(fecha: string | Date | null | undefined): string {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().substring(0, 10);
  }
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (coincidencia) return coincidencia[0];
  const convertida = new Date(fecha);
  return isNaN(convertida.getTime())
    ? null
    : convertida.toISOString().substring(0, 10);
}

export function descomponerFecha(
  fecha: string | Date | null | undefined,
): FechaDescompuesta {
  const iso = aFechaIso(fecha);
  if (!iso) return null;
  const [year, mes, dia] = iso.split('-').map(Number);
  return {
    iso,
    dia_letras: DIAS_EN_LETRAS[dia - 1],
    dia_numero: String(dia),
    mes: MESES[mes - 1],
    year: String(year),
  };
}

// Suma un plazo a una fecha ISO según la unidad de ejecución (día, mes o año)
export function sumarPlazo(
  fechaIso: string,
  plazo: number,
  unidad: string,
): string {
  if (!fechaIso || !plazo || !unidad) return null;
  const tipo = normalizarUnidad(unidad);
  if (!tipo) return null;
  const [year, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(year, mes - 1, dia));
  if (tipo === 'DIA') {
    fecha.setUTCDate(fecha.getUTCDate() + plazo);
  } else {
    const meses = tipo === 'MES' ? plazo : plazo * 12;
    const destino = new Date(Date.UTC(year, mes - 1 + meses, 1));
    const ultimoDia = new Date(
      Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0),
    ).getUTCDate();
    destino.setUTCDate(Math.min(dia, ultimoDia));
    return destino.toISOString().substring(0, 10);
  }
  return fecha.toISOString().substring(0, 10);
}

function normalizarUnidad(unidad: string): 'DIA' | 'MES' | 'ANIO' | null {
  const texto = unidad.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (texto.startsWith('DIA')) return 'DIA';
  if (texto.startsWith('MES')) return 'MES';
  if (texto.startsWith('ANO')) return 'ANIO';
  return null;
}

// Texto del plazo, p. ej. "10 meses" o "1 año"
export function formatearPlazo(plazo: number, unidad: string): string {
  if (!plazo || !unidad) return null;
  const nombres = {
    DIA: ['día', 'días'],
    MES: ['mes', 'meses'],
    ANIO: ['año', 'años'],
  };
  const tipo = normalizarUnidad(unidad);
  if (!tipo) return `${plazo} ${unidad.toLowerCase()}`;
  return `${plazo} ${nombres[tipo][plazo === 1 ? 0 : 1]}`;
}

// Número de documento con separador de miles, p. ej. "1.015.432.109"
export function formatearDocumento(documento: number | string): string {
  if (documento === null || documento === undefined || documento === '')
    return null;
  const texto = String(documento).trim();
  if (!/^\d+$/.test(texto)) return texto;
  return texto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
