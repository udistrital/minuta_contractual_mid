// Simulación del motor de plantillas (plantillas_mid) para pruebas locales.
// Reproduce la estructura de cada acta de inicio con las variables que recibe
// la plantilla real. El formato institucional definitivo lo da plantillas_mid.

export const PLANTILLAS_ACTA = {
  PRESTACION_SERVICIOS: '67930c2a206ae652dbeb3d0b',
  OBRA: '67930bb0206ae652dbeb3d09',
  INTERADMINISTRATIVO: '67930b1a206ae652dbeb3d07',
  COMPRAVENTA: '67930c80206ae652dbeb3d0d',
};

const NOMBRES_PLANTILLA: Record<string, string> = {
  [PLANTILLAS_ACTA.PRESTACION_SERVICIOS]:
    'ACTA DE INICIO CONTRATO DE PRESTACIÓN DE SERVICIOS',
  [PLANTILLAS_ACTA.OBRA]: 'ACTA DE INICIO CONTRATO DE OBRA',
  [PLANTILLAS_ACTA.INTERADMINISTRATIVO]:
    'ACTA DE INICIO CONTRATO INTERADMINISTRATIVO',
  [PLANTILLAS_ACTA.COMPRAVENTA]: 'ACTA DE INICIO CONTRATO DE COMPRAVENTA',
};

const MARCA_PLANTILLA = /<!--\s*plantilla:([a-f0-9]+)\s*-->/;

// Paso 1 del motor: HTML con los datos (incluye la plantilla para el paso 2)
export function renderizarHtmlMock(plantillaId: string, datos: any): string {
  const filas = Object.entries(datos ?? {})
    .filter(([, valor]) => typeof valor !== 'object')
    .map(([clave, valor]) => `<tr><th>${clave}</th><td>${valor}</td></tr>`)
    .join('');
  return `<!-- plantilla:${plantillaId} --><html><body><h1>${
    NOMBRES_PLANTILLA[plantillaId] ?? 'ACTA DE INICIO'
  }</h1><table>${filas}</table></body></html>`;
}

export function obtenerPlantillaDeHtml(html: string): string {
  return MARCA_PLANTILLA.exec(html ?? '')?.[1] ?? null;
}

// Paso 2 del motor: PDF fijo de una página ("ACTA DE INICIO - PDF SIMULADO").
// El mid no crea PDFs; el PDF real lo genera plantillas_mid
export const PDF_MOCK = [
  'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIg',
  'Pj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0g',
  'L0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVu',
  'dCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9G',
  'b250IDw8IC9GMSA1IDAgUiA+PiA+PiAvQ29udGVudHMgNCAwIFIgPj4KZW5kb2Jq',
  'CjQgMCBvYmoKPDwgL0xlbmd0aCA2MCA+PgpzdHJlYW0KQlQgL0YxIDE2IFRmIDcy',
  'IDcyMCBUZCAoQUNUQSBERSBJTklDSU8gLSBQREYgU0lNVUxBRE8pIFRqIEVUCmVu',
  'ZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAv',
  'VHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAw',
  'MDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4',
  'IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBu',
  'IAowMDAwMDAwMzUxIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAx',
  'IDAgUiA+PgpzdGFydHhyZWYKNDIxCiUlRU9GCg==',
].join('');
