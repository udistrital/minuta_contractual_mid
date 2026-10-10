import { environment } from 'src/environments/environment';

// Datos simulados de los servicios externos para probar el acta de inicio sin
// conexión al CRUD, los MID, Parámetros, Plantillas ni el Gestor Documental.
// Cada escenario es un contrato con la forma exacta que devuelven esos servicios.

const { UNIDADES_EJECUTORAS, TIPOS_DE_CONTRATO, ESTADOS_GENERALES } =
  environment;

// Unidades de ejecución (Parámetros CRUD, tipo 7)
export const PARAMETROS_MOCK: Record<number, any> = {
  210: { Id: 210, Nombre: 'DIA', TipoParametroId: { Id: 7 } },
  211: { Id: 211, Nombre: 'MES', TipoParametroId: { Id: 7 } },
  212: { Id: 212, Nombre: 'AÑO', TipoParametroId: { Id: 7 } },
  [environment.TIPO_DOCUMENTO_ID_PARAMETROS.MINUTA]: {
    Id: environment.TIPO_DOCUMENTO_ID_PARAMETROS.MINUTA,
    Nombre: 'MINUTA',
    TipoParametroId: { Id: 140 },
  },
  6900: {
    Id: 6900,
    Nombre: 'ACTA DE INICIO',
    Activo: true,
    TipoParametroId: { Id: 140 },
  },
};

export interface EscenarioMock {
  descripcion: string;
  contrato: any;
  contratista: any;
  supervisoresDetalle: any[];
  polizas: any[];
  cdps: any[];
  lugaresEjecucion: any[];
  estadoActual: any;
  // Datos del formulario que no existen en ningún servicio
  datosFormulario: Record<string, any>;
}

const auditoria = {
  activo: true,
  fecha_creacion: '2026-01-20T10:00:00.000Z',
  fecha_modificacion: '2026-01-20T10:00:00.000Z',
};

export const ESCENARIOS_MOCK: Record<number, EscenarioMock> = {
  9001: {
    descripcion:
      'Prestación de servicios profesionales (Rectoría). Cumple todos los prerrequisitos',
    contrato: {
      id: 9001,
      numero_contrato: 'CPS-0145-2026',
      vigencia: '2026',
      objeto:
        'Prestar servicios profesionales para el desarrollo, mantenimiento y soporte de los sistemas de información de gestión contractual de la Universidad.',
      valor_pesos: '54600000.00',
      plazo_ejecucion: 7,
      unidad_ejecucion_id: 211,
      unidad_ejecutora_id: UNIDADES_EJECUTORAS.RECTORIA,
      unidad_ejecutora: 'RECTORÍA',
      tipo_contrato_id: TIPOS_DE_CONTRATO.PRESTACION_DE_SERVICIOS_PROFESIONALES,
      tipo_contrato: 'Contrato de Prestación de Servicios Profesionales',
      aplica_poliza: true,
      fecha_inicial: '2026-02-02',
      fecha_final: null,
      ...auditoria,
    },
    contratista: {
      numero_documento: '1032456789',
      proveedor: {
        nombre_completo_proveedor: 'Laura Marcela Rincón Vargas',
        numero_documento: '1032456789',
        ciudad_expedicion_documento: 'Bogotá D.C.',
        tipo_persona: 'NATURAL',
      },
    },
    supervisoresDetalle: [
      {
        documento: 79845123,
        nombre_supervisor: 'Carlos Andrés Mejía Torres',
        cargo_supervisor: 'Jefe Oficina Asesora de Sistemas',
      },
    ],
    polizas: [
      {
        id: 41,
        numero_poliza: 'SEG-12-44-101234',
        fecha_expedicion: '2026-01-26',
        fecha_aprobacion: '2026-01-29',
        ...auditoria,
      },
    ],
    cdps: [{ id: 51, numero_cdp_id: 1287, vigencia_cdp: 2026, ...auditoria }],
    lugaresEjecucion: [],
    estadoActual: {
      id: 71,
      estado_parametro_id: ESTADOS_GENERALES.LEGALIZADO,
      estado_interno_parametro_id: 6817,
      actual: true,
    },
    datosFormulario: {
      fecha_suscripcion: '2026-02-02',
      valor_disponibilidad: 54600000,
    },
  },
  9002: {
    descripcion:
      'Contrato de obra (Rectoría) con contratista persona jurídica. Cumple todos los prerrequisitos',
    contrato: {
      id: 9002,
      numero_contrato: 'OBR-0021-2026',
      vigencia: '2026',
      objeto:
        'Adecuación de laboratorios de ingeniería eléctrica en la Facultad Tecnológica, incluidas redes eléctricas, hidrosanitarias y obra civil.',
      valor_pesos: '1450000000.00',
      plazo_ejecucion: 10,
      unidad_ejecucion_id: 211,
      unidad_ejecutora_id: UNIDADES_EJECUTORAS.RECTORIA,
      unidad_ejecutora: 'RECTORÍA',
      tipo_contrato_id: TIPOS_DE_CONTRATO.OBRA,
      tipo_contrato: 'Contrato de Obra',
      aplica_poliza: true,
      fecha_inicial: '2026-03-02',
      fecha_final: null,
      ...auditoria,
    },
    contratista: {
      numero_documento: '900456123',
      proveedor: {
        nombre_completo_proveedor: 'Construcciones Andinas S.A.S.',
        numero_documento: '900456123',
        ciudad_expedicion_documento: null,
        tipo_persona: 'JURIDICA',
      },
      representante: {
        primer_nombre: 'Jorge',
        segundo_nombre: 'Enrique',
        primer_apellido: 'Salazar',
        segundo_apellido: 'Pineda',
        numero_documento: '80123456',
      },
    },
    supervisoresDetalle: [
      {
        documento: 52789456,
        nombre_supervisor: 'Ing. Diana Patricia Cárdenas Ruiz',
        cargo_supervisor: 'Jefe Sección de Planta Física',
      },
    ],
    polizas: [
      {
        id: 42,
        numero_poliza: 'CUM-994512-7',
        fecha_expedicion: '2026-02-20',
        fecha_aprobacion: '2026-02-25',
        ...auditoria,
      },
    ],
    cdps: [{ id: 52, numero_cdp_id: 1301, vigencia_cdp: 2026, ...auditoria }],
    lugaresEjecucion: [
      {
        id: 81,
        direccion: 'Facultad Tecnológica, Transversal 70B No. 73 Bis A Sur 20',
        sede_id: 3,
        dependencia_id: 31,
        ...auditoria,
      },
    ],
    estadoActual: {
      id: 72,
      estado_parametro_id: ESTADOS_GENERALES.LEGALIZADO,
      estado_interno_parametro_id: 6817,
      actual: true,
    },
    datosFormulario: {
      fecha_suscripcion: '2026-03-02',
      valor_anticipo: 435000000,
      personal_directivo: [
        {
          nombres_apellidos: 'Ing. Andrés Felipe Gómez',
          cargo: 'Director de obra',
          especialidad: 'Ingeniería civil',
          tarjeta_profesional: '25202-123456 CND',
        },
        {
          nombres_apellidos: 'Ing. Natalia Ruiz Peña',
          cargo: 'Residente eléctrica',
          especialidad: 'Ingeniería eléctrica',
          tarjeta_profesional: 'CN205-78945',
        },
      ],
      personal_operativo: [
        { cargo: 'Maestro general', nombres_apellidos: 'Luis Alberto Mora' },
        {
          cargo: 'Inspector SST',
          nombres_apellidos: 'Sandra Milena Cruz',
        },
      ],
      maquinaria_equipo: [
        {
          tipo: 'Mezcladora de concreto',
          referencia: 'MX-350',
          cantidad: 2,
          estado: 'Bueno',
        },
        {
          tipo: 'Andamio tubular certificado',
          referencia: 'AT-2M',
          cantidad: 20,
          estado: 'Excelente',
        },
      ],
    },
  },
  9003: {
    descripcion:
      'Contrato interadministrativo de interventoría (Rectoría), sin póliza. Cumple todos los prerrequisitos',
    contrato: {
      id: 9003,
      numero_contrato: 'CIA-0007-2026',
      vigencia: '2026',
      objeto:
        'Interventoría técnica, administrativa, financiera y ambiental a la adecuación de laboratorios de la Facultad Tecnológica.',
      valor_pesos: '174000000.00',
      plazo_ejecucion: 300,
      unidad_ejecucion_id: 210,
      unidad_ejecutora_id: UNIDADES_EJECUTORAS.RECTORIA,
      unidad_ejecutora: 'RECTORÍA',
      tipo_contrato_id: TIPOS_DE_CONTRATO.INTERADMINISTRATIVO,
      tipo_contrato: 'Contrato Interadministrativo',
      aplica_poliza: false,
      fecha_inicial: '2026-03-02',
      fecha_final: null,
      ...auditoria,
    },
    contratista: {
      numero_documento: '899999063',
      proveedor: {
        nombre_completo_proveedor: 'Empresa de Desarrollo Urbano Distrital',
        numero_documento: '899999063',
        ciudad_expedicion_documento: null,
        tipo_persona: 'JURIDICA',
      },
    },
    supervisoresDetalle: [
      {
        documento: 52789456,
        nombre_supervisor: 'Ing. Diana Patricia Cárdenas Ruiz',
        cargo_supervisor: 'Jefe Sección de Planta Física',
      },
    ],
    polizas: [],
    cdps: [{ id: 53, numero_cdp_id: 1302, vigencia_cdp: 2026, ...auditoria }],
    lugaresEjecucion: [
      {
        id: 82,
        direccion: 'Facultad Tecnológica, Bogotá D.C.',
        sede_id: 3,
        dependencia_id: 31,
        ...auditoria,
      },
    ],
    estadoActual: {
      id: 73,
      estado_parametro_id: ESTADOS_GENERALES.SUSCRITO,
      estado_interno_parametro_id: 6817,
      actual: true,
    },
    datosFormulario: {
      fecha_suscripcion: '2026-03-02',
      numero_acta: 'AI-001-2026',
      valor_anticipo: 0,
      nombre_interventor: 'Empresa de Desarrollo Urbano Distrital',
      personal_directivo: [
        {
          nombres_apellidos: 'Ing. Martha Lucía Ramírez',
          cargo: 'Directora de interventoría',
          especialidad: 'Ingeniería civil',
          tarjeta_profesional: '25202-998877 CND',
        },
      ],
      personal_operativo: [
        {
          cargo: 'Inspector de obra',
          nombres_apellidos: 'Héctor Fabio Benítez',
        },
      ],
      equipos: [
        {
          equipo: 'Analizador de energía',
          descripcion: 'Analizador trifásico de calidad de energía',
          certificado_calibracion: 'CAL-2026-0311',
          codigo_referencia: 'FLUKE-1736',
        },
      ],
    },
  },
  9005: {
    descripcion:
      'Compraventa (Rectoría) de equipos de laboratorio con persona jurídica. Cumple todos los prerrequisitos',
    contrato: {
      id: 9005,
      numero_contrato: 'CPV-042-2026',
      vigencia: '2026',
      objeto:
        'Suministro, instalación y puesta en funcionamiento de equipos de laboratorio para alta acreditación.',
      valor_pesos: '350000000.00',
      plazo_ejecucion: 6,
      unidad_ejecucion_id: 211,
      unidad_ejecutora_id: UNIDADES_EJECUTORAS.RECTORIA,
      unidad_ejecutora: 'RECTORÍA',
      tipo_contrato_id: TIPOS_DE_CONTRATO.COMPRA_VENTA,
      tipo_contrato: 'Compraventa',
      aplica_poliza: true,
      fecha_inicial: '2026-05-12',
      fecha_final: null,
      ...auditoria,
    },
    contratista: {
      numero_documento: '901345678',
      proveedor: {
        nombre_completo_proveedor: 'Tecnologías Científicas Avanzadas S.A.S.',
        numero_documento: '901345678',
        digito_verificacion: '9',
        ciudad_expedicion_documento: null,
        tipo_persona: 'JURIDICA',
      },
      representante: {
        primer_nombre: 'Alejandro',
        primer_apellido: 'Restrepo',
        segundo_apellido: 'Hoyos',
        numero_documento: '1020443221',
        ciudad_expedicion_documento: 'Bogotá D.C.',
      },
    },
    supervisoresDetalle: [
      {
        documento: 79887654,
        nombre_supervisor: 'Ing. Carlos Alberto Martínez',
        cargo_supervisor: 'Coordinador de Laboratorios',
      },
    ],
    polizas: [
      {
        id: 45,
        numero_poliza: 'CUM-778899-2',
        fecha_expedicion: '2026-05-04',
        fecha_aprobacion: '2026-05-08',
        ...auditoria,
      },
    ],
    cdps: [{ id: 55, numero_cdp_id: 1355, vigencia_cdp: 2026, ...auditoria }],
    lugaresEjecucion: [
      {
        id: 85,
        direccion: 'Laboratorios de la Facultad de Ingeniería',
        sede_id: 1,
        dependencia_id: 14,
        ...auditoria,
      },
    ],
    estadoActual: {
      id: 75,
      estado_parametro_id: ESTADOS_GENERALES.LEGALIZADO,
      estado_interno_parametro_id: 6817,
      actual: true,
    },
    datosFormulario: {
      fecha_suscripcion: '2026-05-12',
      valor_anticipo: 0,
    },
  },
};

// Supervisores registrados en proveedores_mid (ciudad de expedición del documento)
export const PROVEEDORES_SUPERVISORES_MOCK: Record<string, any> = {
  '79845123': { ciudad_expedicion_documento: 'Bogotá D.C.' },
  '52789456': { ciudad_expedicion_documento: 'Tunja' },
  '79887654': { ciudad_expedicion_documento: 'Bogotá D.C.' },
};

// Dependencias por sede (gestion_contractual_mid espacios-fisicos/dependencias-sede/:id)
export const DEPENDENCIAS_MOCK: Record<
  number,
  { id: number; nombre: string }[]
> = {
  1: [
    { id: 14, nombre: 'Ingeniería' },
    { id: 15, nombre: 'Ciencias y Educación' },
  ],
  3: [{ id: 31, nombre: 'Facultad Tecnológica' }],
};
