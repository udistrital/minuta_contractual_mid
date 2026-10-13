import type {
  Content,
  TDocumentDefinitions,
  TableCell,
} from 'pdfmake/interfaces';

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

// Paso 2 del motor: definición del PDF según la plantilla
export function definirDocumentoMock(
  plantillaId: string,
  d: Record<string, any>,
): TDocumentDefinitions {
  const titulo = NOMBRES_PLANTILLA[plantillaId] ?? 'ACTA DE INICIO';
  let cuerpo: Content[];
  switch (plantillaId) {
    case PLANTILLAS_ACTA.OBRA:
      cuerpo = cuerpoObra(d);
      break;
    case PLANTILLAS_ACTA.INTERADMINISTRATIVO:
      cuerpo = cuerpoInteradministrativo(d);
      break;
    case PLANTILLAS_ACTA.COMPRAVENTA:
      cuerpo = cuerpoCompraventa(d);
      break;
    default:
      cuerpo = cuerpoPrestacionServicios(d);
  }

  return {
    pageSize: 'LETTER',
    // Márgenes institucionales: 3 cm izquierda, 2,5 cm resto (en puntos)
    pageMargins: [85, 110, 70, 70],
    info: { title: `${titulo} ${d.numero_contrato ?? ''}`.trim() },
    defaultStyle: { font: 'Helvetica', fontSize: 10, lineHeight: 1.2 },
    header: (): Content => ({
      margin: [85, 30, 70, 0],
      stack: [
        {
          text: 'UNIVERSIDAD DISTRITAL FRANCISCO JOSÉ DE CALDAS',
          style: 'institucion',
        },
        { text: 'Oficina Asesora Jurídica - Contratación', style: 'subtitulo' },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 6, x2: 457, y2: 6, lineWidth: 1 },
          ],
        },
      ],
    }),
    footer: (pagina, total): Content => ({
      margin: [85, 20, 70, 0],
      columns: [
        { text: 'Documento generado en modo de prueba (mock)', style: 'pie' },
        {
          text: `Página ${pagina} de ${total}`,
          alignment: 'right',
          style: 'pie',
        },
      ],
    }),
    content: [
      { text: titulo, style: 'titulo' },
      {
        text: `Contrato No. ${d.numero_contrato}`,
        style: 'subtitulo',
        margin: [0, 0, 0, 14],
      },
      ...cuerpo,
    ],
    styles: {
      institucion: { fontSize: 11, bold: true, alignment: 'center' },
      subtitulo: { fontSize: 9, alignment: 'center' },
      titulo: {
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      seccion: { fontSize: 10, bold: true, margin: [0, 12, 0, 6] },
      etiqueta: { bold: true },
      encabezadoTabla: { bold: true, fillColor: '#e6e6e6' },
      parrafo: { alignment: 'justify', margin: [0, 6, 0, 6] },
      pie: { fontSize: 7, color: '#666666' },
    },
  };
}

function tablaDatos(filas: [string, any][]): Content {
  return {
    table: {
      widths: [170, '*'],
      body: filas.map(([etiqueta, valor]) => [
        { text: etiqueta, style: 'etiqueta' },
        { text: `${valor ?? ''}` },
      ]),
    },
    layout: 'lightHorizontalLines',
  };
}

function tablaLista(
  titulo: string,
  columnas: [string, string][],
  filas: any[],
): Content[] {
  if (!filas?.length) return [];
  const encabezado: TableCell[] = columnas.map(([, etiqueta]) => ({
    text: etiqueta,
    style: 'encabezadoTabla',
  }));
  return [
    { text: titulo, style: 'seccion' },
    {
      table: {
        headerRows: 1,
        widths: columnas.map(() => '*'),
        body: [
          encabezado,
          ...filas.map((fila) =>
            columnas.map(([clave]) => ({ text: `${fila[clave] ?? ''}` })),
          ),
        ],
      },
    },
  ];
}

function firmas(firmantes: [string, string][]): Content {
  // Las firmas no se parten entre páginas
  return {
    unbreakable: true,
    margin: [0, 40, 0, 0],
    columnGap: 12,
    columns: firmantes.map(([nombre, rol]) => ({
      stack: [
        {
          text: '_'.repeat(firmantes.length > 2 ? 22 : 31),
          alignment: 'center',
        },
        { text: nombre, bold: true, alignment: 'center' },
        { text: rol, alignment: 'center', fontSize: 9 },
      ],
    })),
  };
}

function cuerpoPrestacionServicios(d: Record<string, any>): Content[] {
  return [
    tablaDatos([
      ['Contrato No.', d.numero_contrato],
      ['Objeto', d.objeto_contrato],
      ['Valor', d.valor_contrato],
      ['Plazo', d.plazo_contrato],
      ['Fecha de inicio', d.fecha_inicio],
      ['Fecha de terminación', d.fecha_terminacion],
      ['Póliza No.', d.numero_poliza],
      ['Fecha de expedición póliza', d.fecha_expedicion_poliza],
      ['Fecha de aprobación póliza', d.fecha_aprobacion_poliza],
      ['Certificado de disponibilidad', d.certificado_disponibilidad],
      ['Valor disponibilidad', d.valor_disponibilidad],
      ['Certificado de registro', d.certificado_registro],
      ['Valor registro', d.valor_registro],
      ['Contratista', d.nombre_contratista],
      ['Supervisor', d.nombre_supervisor],
    ]),
    {
      style: 'parrafo',
      text: [
        `En la ciudad de ${d.ciudad}, a los ${d.dia} (${d.dia_numero}) días del mes de ${d.mes} de ${d.year}, se reunieron `,
        { text: d.nombre_supervisor, bold: true },
        `, identificado(a) con cédula de ciudadanía No. ${d.cedula_supervisor} expedida en ${d.ciudad_expedicion_supervisor}, en calidad de supervisor(a), y `,
        { text: d.nombre_contratista, bold: true },
        `, identificado(a) con cédula de ciudadanía No. ${d.cedula_contratista} expedida en ${d.ciudad_expedicion_contratista}, en calidad de contratista, con el fin de dar inicio a la ejecución del contrato No. ${d.numero_contrato}.`,
      ],
    },
    {
      style: 'parrafo',
      text: `Verificados los requisitos de perfeccionamiento y ejecución, las partes acuerdan iniciar la ejecución del contrato a partir del día ${d.dia_inicio} de ${d.mes_inicio} de ${d.year_inicio}, por un plazo de ${d.plazo_contrato}, con terminación prevista el ${d.fecha_terminacion}.`,
    },
    {
      style: 'parrafo',
      text: 'Para constancia se firma por quienes en ella intervinieron.',
    },
    firmas([
      [d.nombre_supervisor, 'Supervisor(a)'],
      [d.nombre_contratista, 'Contratista'],
    ]),
  ];
}

// Estructura del formato GC-PR-013-FR-051
function cuerpoCompraventa(d: Record<string, any>): Content[] {
  const compromisos = [
    'Para el desarrollo del contrato de compraventa es indispensable mantener los términos de entrega establecidos en el cronograma y cualquier alteración debe convenirse entre las partes.',
    'Que en todo momento debe acatarse las instrucciones o exigencias que presente el(los) Supervisor(es).',
    'La obligación de vigilar el cumplimiento en forma permanente de las normas sobre impacto ambiental por parte del contratista y demás normas para aminorar el impacto ciudadano.',
    'El contratista puso de presente que conoce las normas y especificaciones consignadas en el pliego de condiciones o las que rigen para este contrato de compraventa y las que tiene contempladas la Universidad Distrital para este tipo de contratos.',
    'La capacitación, si es requerida para los equipos o software entregados e instalados en los Laboratorios de la Universidad, será concertada de acuerdo con el contrato de compraventa y el cronograma entregado por el(los) Supervisor(es).',
    'Se realizará acta de cada capacitación, si esta se requiere en el contrato de compraventa, la cual hará parte del archivo en el proceso de supervisión.',
  ];
  return [
    tablaDatos([
      ['Tipo de contrato', d.tipo_contrato],
      ['Contrato No.', d.numero_contrato],
      ['Objeto', d.objeto_contrato],
      ['Localización del proyecto', d.localizacion_proyecto],
      ['Valor', d.valor_contrato],
      ['Contratista', d.nombre_contratista],
      ['Plazo vigencia', d.plazo_vigencia],
      ['Valor anticipo', d.valor_anticipo],
      ['Fecha de iniciación', d.fecha_iniciacion],
      ['Fecha de terminación', d.fecha_terminacion],
    ]),
    {
      style: 'parrafo',
      text: [
        `En los laboratorios de ${d.nombre_facultad} el día ${d.dia} del mes de ${d.mes} del año ${d.year} se reunieron: `,
        { text: d.nombre_supervisor, bold: true },
        ` identificado(a) con cédula de ciudadanía No. ${d.cedula_supervisor} de ${d.ciudad_expedicion_supervisor}, quien ejerce como supervisor por parte de la Universidad Distrital Francisco José de Caldas y `,
        { text: d.nombre_representante, bold: true },
        ` identificado(a) con cédula de ciudadanía No. ${d.cedula_contratista} como representante legal de la empresa ${d.nombre_contratista} con NIT. ${d.nit_representante}, con el objeto de dejar constancia del inicio real y efectivo del contrato de compraventa anteriormente citado, previo cumplimiento de los requisitos de legalización del contrato.`,
      ],
    },
    {
      style: 'parrafo',
      text: `El Supervisor del contrato de compraventa No. ${d.numero_contrato} puso en conocimiento del contratista lo siguiente:`,
    },
    { ol: compromisos, style: 'parrafo' },
    {
      style: 'parrafo',
      text: `En consecuencia, se procede a la iniciación del contrato de compraventa, el cual debe concluir el día ${d.dia_conclusion} (${d.dia_numero}) del mes ${d.mes_conclusion} del año ${d.year_conclusion}, o antes si a satisfacción se recibe el objeto contratado.`,
    },
    {
      style: 'parrafo',
      text: 'Para constancia de lo anterior, se firma la presente acta bajo la responsabilidad expresa de los que intervienen en ella:',
    },
    firmas([
      [d.nombre_representante, `Representante legal ${d.nombre_contratista}`],
      [d.nombre_supervisor, 'Supervisor - Universidad Distrital F. J. C.'],
    ]),
  ];
}

function cuerpoObra(d: Record<string, any>): Content[] {
  return [
    tablaDatos([
      ['Tipo de contrato', d.tipo_contrato],
      ['Contrato No.', d.numero_contrato],
      ['Objeto', d.objeto_contrato],
      ['Localización del proyecto', d.localizacion_proyecto],
      ['Valor', d.valor_contrato],
      ['Plazo', d.plazo_vigencia],
      ['Valor del anticipo', d.valor_anticipo],
      ['Fecha de iniciación', d.fecha_iniciacion],
      ['Fecha de terminación', d.fecha_terminacion],
      ['Contratista', d.contratista],
      ['Representante legal', d.nombre_representante_legal],
      ['Supervisor', d.nombre_supervisor],
    ]),
    {
      style: 'parrafo',
      text: `En ${d.ciudad}, el día ${d.dia} de ${d.mes} de ${d.year}, se reunieron el supervisor y el representante legal del contratista para dar inicio a la obra, la cual deberá concluir el día ${d.dia_conclusion} (${d.dia_numero}) de ${d.mes_conclusion} de ${d.year_conclusion}.`,
    },
    ...tablaLista(
      'Personal directivo',
      [
        ['nombres_apellidos', 'Nombres y apellidos'],
        ['cargo', 'Cargo'],
        ['especialidad', 'Especialidad'],
        ['tarjeta_professional', 'Tarjeta profesional'],
      ],
      d.personal_directivo,
    ),
    ...tablaLista(
      'Personal operativo',
      [
        ['cargo', 'Cargo'],
        ['nombres_apellidos', 'Nombres y apellidos'],
      ],
      d.personal_operativo,
    ),
    ...tablaLista(
      'Maquinaria y equipo',
      [
        ['tipo', 'Tipo'],
        ['referencia', 'Referencia'],
        ['cantidad', 'Cantidad'],
        ['estado', 'Estado'],
      ],
      d.maquinaria_equipo,
    ),
    firmas([
      [d.nombre_supervisor, 'Supervisor(a)'],
      [d.nombre_representante_legal, `Representante legal ${d.contratista}`],
    ]),
  ];
}

function cuerpoInteradministrativo(d: Record<string, any>): Content[] {
  return [
    {
      text: `Acta No. ${d.numero_acta}`,
      alignment: 'right',
      margin: [0, 0, 0, 8],
    },
    tablaDatos([
      ['Contrato No.', d.numero_contrato],
      ['Objeto', d.objeto_contrato],
      ['Localización del proyecto', d.localizacion_proyecto],
      ['Valor', d.valor_contrato],
      ['Contratista', d.nombre_contratista],
      ['Plazo', d.plazo_vigencia],
      ['Valor del anticipo', d.valor_anticipo],
      ['Fecha de iniciación', d.fecha_iniciacion],
      ['Fecha de terminación', d.fecha_terminacion],
      ['Supervisor', d.nombre_supervisor],
      ['Interventor', d.nombre_interventor],
    ]),
    {
      style: 'parrafo',
      text: `En ${d.ciudad}, el día ${d.dia} de ${d.mes} de ${d.year}, se reunieron el supervisor, el interventor y el contratista para dar inicio al contrato, cuya terminación está prevista para el día ${d.dia_conclusion} (${d.dia_numero}) de ${d.mes_conclusion} de ${d.year_conclusion}.`,
    },
    ...tablaLista(
      'Personal directivo',
      [
        ['nombre', 'Nombre'],
        ['cargo', 'Cargo'],
        ['especialidad', 'Especialidad'],
        ['tarjeta_profesional', 'Tarjeta profesional'],
      ],
      d.personal_directivo,
    ),
    ...tablaLista(
      'Personal operativo',
      [
        ['cargo', 'Cargo'],
        ['nombres_apellidos', 'Nombres y apellidos'],
      ],
      d.personal_operativo,
    ),
    ...tablaLista(
      'Equipos',
      [
        ['equipo', 'Equipo'],
        ['descripcion', 'Descripción'],
        ['certificado_calibracion', 'Certificado de calibración'],
        ['codigo_referencia', 'Código de referencia'],
      ],
      d.equipos,
    ),
    firmas([
      [d.nombre_supervisor, 'Supervisor(a)'],
      [d.nombre_interventor, 'Interventor'],
      [d.nombre_contratista, 'Contratista'],
    ]),
  ];
}

// Genera el PDF en base64 con las fuentes estándar (no requiere archivos de fuentes)
export async function generarPdfMock(
  definicion: TDocumentDefinitions,
): Promise<string> {
  // pdfmake se carga solo en modo mock
  const modulo: any = await import('pdfmake');
  const PdfPrinter = modulo.default ?? modulo;
  const impresora = new PdfPrinter({
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  });
  const documento = impresora.createPdfKitDocument(definicion);
  const partes: Buffer[] = [];
  return new Promise((resolve, reject) => {
    documento.on('data', (parte: Buffer) => partes.push(parte));
    documento.on('end', () =>
      resolve(Buffer.concat(partes).toString('base64')),
    );
    documento.on('error', reject);
    documento.end();
  });
}
