import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  CAMPOS_OBLIGATORIOS_MINUTA,
  MARCADOR_FALTANTE,
  MinutaService,
} from './minuta.service';
import { MinutaController } from './minuta.controller';

// Datos ficticios. Las URL replican la forma de las variables de entorno:
// terminan en "/" y la del CRUD incluye v1/.
const config: Record<string, string> = {
  GESTION_CONTRACTUAL_CRUD: 'http://crud/v1/',
  GESTION_CONTRACTUAL_MID: 'http://mid/',
  PARAMETROS_CRUD: 'http://parametros/v1/',
  PROVEEDORES_MID: 'http://proveedores/',
  ORDENADORES_SUPERVISORES_CONTRATACION_MID: 'http://ordenadores/v1/',
  CLAUSULAS_PARAGRAFOS_CRUD: 'http://clausulas/v1/',
  PLANTILLAS_MID: 'http://plantillas/v1/',
};

const URL = {
  contrato: (id: number) => `http://mid/contratos-generales/${id}?ids=true`,
  ordenador: (id: number) =>
    `http://crud/v1/ordenadores/?query=contrato_general_id.id:${id},activo:true&sortby=fecha_creacion,id&order=desc&limit=1`,
  especificaciones: (id: number) =>
    `http://crud/v1/especificaciones-tecnicas/?query=contrato_general_id.id:${id},activo:true&limit=0`,
  vigencia: (id: number) => `http://parametros/v1/parametro/${id}`,
  contratista: (doc: string) => `http://proveedores/contratistas?id=${doc}`,
  ordenadorArgo: (id: number) => `http://ordenadores/v1/ordenadores/${id}`,
  clausulas: (id: number) => `http://clausulas/v1/contratos/${id}`,
  html: 'http://plantillas/v1/plantilla/renderizar-html',
  pdf: 'http://plantillas/v1/plantilla/renderizar-pdf',
};

const ok = (Data: any) => ({
  data: { Success: true, Status: 200, Message: 'Request successful', Data },
});
const noEncontrado = () =>
  Object.assign(new Error('Request failed with status code 404'), {
    response: { status: 404, data: { Success: false, Status: '404' } },
  });
const caido = () =>
  Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
const error500 = () =>
  Object.assign(new Error('Request failed with status code 500'), {
    response: { status: 500, data: { Success: false, Status: 500 } },
  });

// Contrato de prestación de servicios profesionales de Rectoría, sin número
const contratoServicios = () => ({
  id: 1,
  numero_contrato: null,
  vigencia_id: 9002,
  unidad_ejecutora_id: 6818,
  tipo_contrato_id: 6546,
  aplica_poliza: false,
  justificacion: 'Justificación ficticia',
  modalidad_seleccion: 'Contratación Directa',
  perfil_contratista: 'Profesional Especializado',
  fecha_suscripcion_estudios: '2026-11-02',
  proveedor_numero_documento: '1012345678',
});

// Orden de compra de Rectoría con número
const ordenCompra = () => ({
  ...contratoServicios(),
  id: 2,
  numero_contrato: 'OC-15',
  tipo_contrato_id: 6538,
  proveedor_numero_documento: '900123456',
});

const proveedorNatural = {
  proveedor: {
    nombre_completo_proveedor: 'CONTRATISTA FICTICIO',
    tipo_persona: 'NATURAL',
    numero_documento: '1012345678',
    ciudad_expedicion_documento: 'Bogotá',
  },
  representante: null,
};

const proveedorJuridico = {
  proveedor: {
    nombre_completo_proveedor: 'EMPRESA FICTICIA SAS',
    tipo_persona: 'JURIDICA',
    numero_documento: '900123456',
    ciudad_expedicion_documento: 'Bogotá',
  },
  representante: {
    primer_nombre: 'ANA',
    primer_apellido: 'PRUEBA',
    numero_documento: 41000111,
    ciudad_expedicion_documento: 'Tunja',
  },
};

const ordenadorArgo = {
  nombre_ordenador: 'ORDENADOR FICTICIO',
  documento: '79000111',
  nombre_ciudad: 'Bogotá',
  rol_nombre: 'Rector',
  info_resolucion: 'Resolución 1 de 2026',
};

type Respuesta = () => any;

describe('MinutaService con el CRUD de gestión contractual', () => {
  let service: MinutaService;
  let rutasGet: Record<string, Respuesta>;
  let rutasPost: Record<string, Respuesta>;
  let get: jest.SpyInstance;
  let post: jest.SpyInstance;

  // Rutas de un contrato completo: id 1 (servicios) o 2 (orden de compra)
  const rutasContrato = (contrato: any, proveedor: any) => ({
    [URL.contrato(contrato.id)]: () => ok(contrato),
    [URL.ordenador(contrato.id)]: () => ok([{ id: 7, ordenador_argo_id: 55 }]),
    [URL.vigencia(9002)]: () => ok({ Id: 9002, Nombre: '2026' }),
    [URL.clausulas(contrato.id)]: () =>
      ok([{ nombre: `Cláusula del contrato ${contrato.id}`, paragrafos: [] }]),
    [URL.contratista(contrato.proveedor_numero_documento)]: () => ok(proveedor),
    [URL.ordenadorArgo(55)]: () => ok(ordenadorArgo),
  });

  const responder =
    (rutas: () => Record<string, Respuesta>) => async (url: string) => {
      const ruta = rutas()[url];
      if (!ruta) throw new Error(`URL no simulada: ${url}`);
      return ruta();
    };

  // Datos que llegaron al renderizador en el paso 2
  const datosRenderizados = () =>
    post.mock.calls.find(([url]) => url === URL.pdf)?.[1]?.data;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinutaService,
        { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
      ],
    }).compile();
    service = module.get<MinutaService>(MinutaService);

    rutasGet = rutasContrato(contratoServicios(), proveedorNatural);
    rutasPost = {
      [URL.html]: () => ok('<html>minuta</html>'),
      [URL.pdf]: () => ok('UERGLWJhc2U2NA=='),
    };
    get = jest
      .spyOn(axios, 'get')
      .mockImplementation(responder(() => rutasGet));
    post = jest
      .spyOn(axios, 'post')
      .mockImplementation(responder(() => rutasPost) as any);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('consultas', () => {
    it('genera la minuta con las rutas nuevas y sin contratistas/contrato', async () => {
      const r = await service.obtenerMinuta('1');

      expect(r).toEqual({
        Success: true,
        Status: 200,
        Message: 'Minuta generada exitosamente',
        Data: 'UERGLWJhc2U2NA==',
      });
      const urls = get.mock.calls.map(([url]) => url);
      expect(urls).toEqual(
        expect.arrayContaining([
          URL.contrato(1),
          URL.ordenador(1),
          URL.vigencia(9002),
          URL.clausulas(1),
          URL.contratista('1012345678'),
          URL.ordenadorArgo(55),
        ]),
      );
      expect(urls.some((u) => u.includes('contratistas/contrato'))).toBe(false);
      expect(urls.some((u) => u.includes('ordenador-contrato'))).toBe(false);
      // Prestación de servicios: no consulta especificaciones
      expect(urls).not.toContain(URL.especificaciones(1));
    });

    it('envía al renderizador vigencia, justificación, contratista y ordenador', async () => {
      await service.obtenerMinuta(1);

      expect(datosRenderizados()).toEqual(
        expect.objectContaining({
          vigencia: '2026',
          justificacion: 'Justificación ficticia',
          contratista_nombre: 'CONTRATISTA FICTICIO',
          contratista_numero_documento: '1012345678',
          ordenador_nombre: 'ORDENADOR FICTICIO',
          ordenador_resolucion: 'Resolución 1 de 2026',
          modalidad_seleccion_tipo: 'Contratación Directa',
          perfil_profesional: true,
        }),
      );
      expect(post).toHaveBeenCalledWith(URL.html, {
        plantilla_id: '678af37d58bf2385b5ccd4ee',
        data: datosRenderizados(),
      });
    });

    it('usa el marcador cuando el contrato todavía no tiene número', async () => {
      await service.obtenerMinuta(1);
      expect(datosRenderizados().contrato_numero).toBe(MARCADOR_FALTANTE);
    });

    it('usa el número del contrato cuando existe', async () => {
      rutasGet = {
        ...rutasContrato(ordenCompra(), proveedorJuridico),
        [URL.especificaciones(2)]: () => ok([]),
      };
      await service.obtenerMinuta(2);
      expect(datosRenderizados().contrato_numero).toBe('OC-15');
    });

    it('trae las cláusulas del contrato solicitado, no las de otro', async () => {
      await service.obtenerMinuta(1);

      expect(get).toHaveBeenCalledWith(URL.clausulas(1));
      expect(get).not.toHaveBeenCalledWith(URL.clausulas(9512));
      expect(datosRenderizados().clausulas).toEqual([
        { nombre: 'Cláusula del contrato 1', paragrafos: [] },
      ]);
    });

    it('formatea las especificaciones de una orden de compra', async () => {
      rutasGet = {
        ...rutasContrato(ordenCompra(), proveedorJuridico),
        [URL.especificaciones(2)]: () =>
          ok([
            {
              descripcion: 'Portátil',
              cantidad: 2,
              valor_unitario: 4000000,
              valor_total: 8000000,
            },
            {
              descripcion: 'Monitor',
              cantidad: 3,
              valor_unitario: 1000000,
              valor_total: 3000000,
            },
          ]),
      };
      const r = await service.obtenerMinuta(2);

      expect(r.Status).toBe(200);
      const [primera, segunda] = datosRenderizados().especificaciones;
      expect(primera).toEqual(
        expect.objectContaining({ descripcion: 'Portátil', cantidad: 2 }),
      );
      expect(primera.valor_total).toMatch(/8\.000\.000/);
      expect(segunda.descripcion).toBe('Monitor');
    });

    it.each([
      ['un arreglo vacío', () => ok([])],
      [
        'un 404',
        () => {
          throw noEncontrado();
        },
      ],
    ])('no se rompe si las especificaciones responden %s', async (_, resp) => {
      rutasGet = {
        ...rutasContrato(ordenCompra(), proveedorJuridico),
        [URL.especificaciones(2)]: resp,
      };
      const r = await service.obtenerMinuta(2);

      expect(r.Status).toBe(200);
      expect(datosRenderizados().especificaciones).toEqual([]);
    });

    it('incluye el representante de una persona jurídica', async () => {
      rutasGet = {
        ...rutasContrato(ordenCompra(), proveedorJuridico),
        [URL.especificaciones(2)]: () => ok([]),
      };
      await service.obtenerMinuta(2);

      expect(datosRenderizados()).toEqual(
        expect.objectContaining({
          representante_nombre: 'ANA PRUEBA',
          representante_numero_documento: 41000111,
          representante_lugar_exp: 'Tunja',
        }),
      );
    });

    it('el representante no es obligatorio para una persona natural', async () => {
      const r = await service.obtenerMinuta(1);

      expect(r.Status).toBe(200);
      expect(datosRenderizados()).not.toHaveProperty('representante_nombre');
    });
  });

  describe('400: id inválido', () => {
    it.each(['abc', '0', '-3', '1.5', '', ' ', undefined, '9007199254740993'])(
      'rechaza %p sin consultar servicios',
      async (id) => {
        const r = await service.obtenerMinuta(id);

        expect(r).toEqual({
          Success: false,
          Status: 400,
          Message: 'El id del contrato debe ser un entero positivo',
        });
        expect(get).not.toHaveBeenCalled();
      },
    );
  });

  describe('404', () => {
    it('contrato inexistente', async () => {
      rutasGet[URL.contrato(1)] = () => {
        throw noEncontrado();
      };
      const r = await service.obtenerMinuta(1);

      expect(r).toEqual({
        Success: false,
        Status: 404,
        Message: 'Contrato general no encontrado',
      });
      expect(post).not.toHaveBeenCalled();
    });

    it('plantilla no configurada (IDEXUD)', async () => {
      rutasGet[URL.contrato(1)] = () =>
        ok({ ...contratoServicios(), unidad_ejecutora_id: 6819 });
      const r = await service.obtenerMinuta(1);

      expect(r).toEqual({
        Success: false,
        Status: 404,
        Message: 'Plantilla no encontrada',
      });
    });
  });

  describe('422: datos obligatorios', () => {
    it('la lista de obligatorios es contratista, ordenador, vigencia y cláusulas (sin plantilla)', () => {
      expect([...CAMPOS_OBLIGATORIOS_MINUTA]).toEqual([
        'contratista',
        'ordenador',
        'vigencia',
        'clausulas',
      ]);
    });

    it('sin ordenador registrado ([] en el CRUD) no genera el documento', async () => {
      rutasGet[URL.ordenador(1)] = () => ok([]);
      const r = await service.obtenerMinuta(1);

      expect(r).toEqual({
        Success: false,
        Status: 422,
        Message: 'Faltan datos: ordenador',
      });
      expect(r).not.toHaveProperty('Data');
      expect(post).not.toHaveBeenCalled();
      expect(get).not.toHaveBeenCalledWith(URL.ordenadorArgo(55));
    });

    it('ordenador no encontrado en ordenador_supervisor_mid', async () => {
      rutasGet[URL.ordenadorArgo(55)] = () => {
        throw noEncontrado();
      };
      const r = await service.obtenerMinuta(1);
      expect(r.Message).toBe('Faltan datos: ordenador');
    });

    it('contratista no encontrado en proveedores_mid', async () => {
      rutasGet[URL.contratista('1012345678')] = () => {
        throw noEncontrado();
      };
      const r = await service.obtenerMinuta(1);

      expect(r.Status).toBe(422);
      expect(r.Message).toBe('Faltan datos: contratista');
    });

    it('contrato sin documento del proveedor: no consulta proveedores_mid', async () => {
      rutasGet[URL.contrato(1)] = () =>
        ok({ ...contratoServicios(), proveedor_numero_documento: null });
      const r = await service.obtenerMinuta(1);

      expect(r.Message).toBe('Faltan datos: contratista');
      expect(get.mock.calls.some(([u]) => u.includes('contratistas'))).toBe(
        false,
      );
    });

    it('lista todos los faltantes en orden: sin vigencia y sin cláusulas', async () => {
      rutasGet[URL.contrato(1)] = () =>
        ok({ ...contratoServicios(), vigencia_id: null });
      rutasGet[URL.clausulas(1)] = () => ok([]);
      const r = await service.obtenerMinuta(1);

      expect(r).toEqual({
        Success: false,
        Status: 422,
        Message: 'Faltan datos: vigencia, clausulas',
      });
    });

    it('vigencia inexistente en Parámetros', async () => {
      rutasGet[URL.vigencia(9002)] = () => {
        throw noEncontrado();
      };
      const r = await service.obtenerMinuta(1);
      expect(r.Message).toBe('Faltan datos: vigencia');
    });
  });

  describe('502: servicio no disponible', () => {
    it.each([
      [
        'el MID responde 500',
        URL.contrato(1),
        error500,
        'gestion_contractual_mid',
      ],
      [
        'el CRUD está apagado',
        URL.ordenador(1),
        caido,
        'gestion_contractual_crud',
      ],
      [
        'Parámetros responde Success false',
        URL.vigencia(9002),
        () => ({ data: { Success: false, Status: '500' } }),
        'parametros_crud',
      ],
      [
        'proveedores_mid está apagado',
        URL.contratista('1012345678'),
        caido,
        'proveedores_mid',
      ],
      [
        'ordenador_supervisor_mid responde 500',
        URL.ordenadorArgo(55),
        error500,
        'ordenador_supervisor_mid',
      ],
      [
        'clausulas_paragrafos_crud está apagado',
        URL.clausulas(1),
        caido,
        'clausulas_paragrafos_crud',
      ],
    ])('%s', async (_, url, fallo, servicio) => {
      rutasGet[url] = () => {
        const r = fallo();
        if (r instanceof Error) throw r;
        return r;
      };
      const r = await service.obtenerMinuta(1);

      expect(r).toEqual({
        Success: false,
        Status: 502,
        Message: `Servicio no disponible: ${servicio}`,
      });
      expect(post).not.toHaveBeenCalled();
    });

    it('el renderizador falla en el paso 1 (HTML)', async () => {
      rutasPost[URL.html] = () => {
        throw error500();
      };
      const r = await service.obtenerMinuta(1);

      expect(r.Status).toBe(502);
      expect(r.Message).toBe(
        'Servicio no disponible: plantillas_mid (paso 1: HTML)',
      );
    });

    it('el renderizador falla en el paso 2 (PDF) con Success false', async () => {
      rutasPost[URL.pdf] = () => ({
        data: { Success: false, Status: 400, Message: 'error', Data: null },
      });
      const r = await service.obtenerMinuta(1);

      expect(r.Status).toBe(502);
      expect(r.Message).toBe(
        'Servicio no disponible: plantillas_mid (paso 2: PDF)',
      );
      expect(r).not.toHaveProperty('Data');
    });
  });
});

describe('MinutaController', () => {
  it('responde HTTP 200 y devuelve el sobre del servicio, incluso en errores', async () => {
    const respuesta = { Success: false, Status: 404, Message: 'x' };
    const minutaService = {
      obtenerMinuta: jest.fn().mockResolvedValue(respuesta),
    } as unknown as MinutaService;
    const controller = new MinutaController(minutaService);
    const res = { status: jest.fn() } as any;

    await expect(controller.obtenerMinuta('7', res)).resolves.toBe(respuesta);
    expect(minutaService.obtenerMinuta).toHaveBeenCalledWith('7');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
