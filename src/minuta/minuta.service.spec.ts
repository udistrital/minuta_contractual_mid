import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MinutaService } from './minuta.service';
import { environment } from 'src/environments/environment';

describe('MinutaService', () => {
  let service: MinutaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MinutaService, ConfigService],
    }).compile();

    service = module.get<MinutaService>(MinutaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerMinuta', () => {
    const { RECTORIA, IDEXUD } = environment.UNIDADES_EJECUTORAS;
    const { ORDEN_DE_COMPRA, OBRA } = environment.TIPOS_DE_CONTRATO;
    const exitosa = (Data: any) => ({
      data: { Success: true, Status: 200, Data },
    });
    const fallida = { data: { Success: false, Status: 404 } };

    const contratoOrdenCompra = {
      id: 1,
      unidad_ejecutora_id: RECTORIA,
      tipo_contrato_id: ORDEN_DE_COMPRA,
      aplica_poliza: true,
      vigencia: 2026,
      modalidad_seleccion: 'Contratación directa',
      fecha_suscripcion_estudios: '2026-01-15',
      perfil_contratista: 'Profesional especializado',
    };

    // Respuestas de los servicios por URL; las que no están responden error
    const responderGet = (rutas: Record<string, any>) =>
      jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        const ruta = Object.keys(rutas).find((clave) => url.startsWith(clave));
        return ruta ? exitosa(rutas[ruta]) : fallida;
      });

    const rutasCompletas = (contrato: any) => ({
      'http://mid/contratos-generales/1?ids=true': contrato,
      'http://crud/contratistas/contrato/1': { numero_documento: 900123 },
      'http://proveedores/contratistas?id=900123': {
        proveedor: {
          nombre_completo_proveedor: 'Suministros S.A.S.',
          tipo_persona: 'JURIDICA',
          numero_documento: '900123',
          ciudad_expedicion_documento: 'Bogotá D.C.',
        },
        representante: {
          primer_nombre: 'Ana',
          primer_apellido: 'Pérez',
          numero_documento: '52345678',
          ciudad_expedicion_documento: 'Tunja',
        },
      },
      'http://crud/ordenador-contrato/contrato/1': { ordenador_argo_id: 7 },
      'http://ordenadores/ordenadores/7': {
        nombre_ordenador: 'Ordenador del Gasto',
        documento: '79111222',
        nombre_ciudad: 'Bogotá D.C.',
        rol_nombre: 'Rector',
        info_resolucion: 'Resolución 001',
      },
      'http://clausulas/contratos/9512': [{ nombre: 'Cláusula primera' }],
      'http://crud/especificaciones-tecnicas': [
        {
          descripcion: 'Computador',
          cantidad: 2,
          valor_unitario: 1500000,
          valor_total: 3000000,
        },
      ],
    });

    beforeEach(() => {
      service = new MinutaService(
        new ConfigService({
          GESTION_CONTRACTUAL_MID: 'http://mid/',
          GESTION_CONTRACTUAL_CRUD: 'http://crud/',
          PROVEEDORES_MID: 'http://proveedores/',
          ORDENADORES_SUPERVISORES_CONTRATACION_MID: 'http://ordenadores/',
          CLAUSULAS_PARAGRAFOS_CRUD: 'http://clausulas/',
          PLANTILLAS_MID: 'http://plantillas/',
        }),
      );
    });

    afterEach(() => jest.restoreAllMocks());

    it('genera la minuta con los datos del contrato, el contratista y el ordenador', async () => {
      responderGet(rutasCompletas(contratoOrdenCompra));
      const post = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce(exitosa('<html></html>'))
        .mockResolvedValueOnce(exitosa('pdf-base64'));

      expect(await service.obtenerMinuta(1)).toEqual({
        Success: true,
        Status: 200,
        Message: 'Minuta generada exitosamente',
        Data: 'pdf-base64',
      });
      const { data } = post.mock.calls[0][1] as any;
      expect(data).toEqual(
        expect.objectContaining({
          vigencia: 2026,
          ordenador_nombre: 'Ordenador del Gasto',
          contratista_nombre: 'Suministros S.A.S.',
          representante_nombre: 'Ana Pérez',
          representante_numero_documento: '52345678',
          perfil_profesional: true,
          amparos: [],
          clausulas: [{ nombre: 'Cláusula primera' }],
        }),
      );
      // Intl separa el signo con un espacio no separable
      const [especificacion] = data.especificaciones;
      expect(especificacion.cantidad).toBe(2);
      expect(especificacion.valor_unitario.replace(/\s/g, ' ')).toBe(
        '$ 1.500.000',
      );
      expect(especificacion.valor_total.replace(/\s/g, ' ')).toBe(
        '$ 3.000.000',
      );
    });

    it('tolera contrato y representante vacíos al armar los datos', async () => {
      const datos = await (service as any).obtenerDatosIniciales({});
      expect(datos.vigencia).toBe('XXXXXXX');
      expect((service as any).obtenerRepresentante(undefined)).toEqual({
        representante_nombre: 'XXXXXXX',
        representante_numero_documento: 'XXXXXXX',
        representante_lugar_exp: 'XXXXXXX',
      });
    });

    it('marca como faltantes los datos que no responden los servicios', async () => {
      responderGet({
        'http://mid/contratos-generales/1?ids=true': {
          unidad_ejecutora_id: RECTORIA,
          tipo_contrato_id: OBRA,
          perfil_contratista: 'Técnico',
        },
        'http://crud/contratistas/contrato/1': { numero_documento: 1 },
        'http://proveedores/contratistas?id=1': {
          proveedor: {},
          representante: {},
        },
      });
      const post = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce(exitosa('<html></html>'))
        .mockResolvedValueOnce(exitosa('pdf-base64'));

      expect((await service.obtenerMinuta(1)).Success).toBe(true);
      const { data } = post.mock.calls[0][1] as any;
      expect(data).toEqual(
        expect.objectContaining({
          vigencia: 'XXXXXXX',
          ordenador_nombre: 'XXXXXXX',
          contratista_nombre: 'XXXXXXX',
          representante_nombre: 'XXXXXXX',
          perfil_profesional: false,
        }),
      );
      expect(data).not.toHaveProperty('especificaciones');
      expect(data).not.toHaveProperty('amparos');
      expect(data).not.toHaveProperty('clausulas');
    });

    it('sin perfil ni contratista el contrato no es profesional', async () => {
      responderGet({
        'http://mid/contratos-generales/1?ids=true': {
          unidad_ejecutora_id: RECTORIA,
          tipo_contrato_id: OBRA,
        },
      });
      const post = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce(exitosa('<html></html>'))
        .mockResolvedValueOnce(exitosa('pdf-base64'));

      await service.obtenerMinuta(1);
      const { data } = post.mock.calls[0][1] as any;
      expect(data.perfil_profesional).toBe(false);
      expect(data).not.toHaveProperty('representante_nombre');
    });

    it('responde 404 si el contrato no existe o el servicio no responde', async () => {
      responderGet({});
      expect((await service.obtenerMinuta(1)).Status).toBe(404);
      jest.spyOn(axios, 'get').mockRejectedValue(new Error('sin conexión'));
      expect((await service.obtenerMinuta(1)).Status).toBe(404);
    });

    it('responde 404 si no hay plantilla para el contrato', async () => {
      responderGet({
        'http://mid/contratos-generales/1?ids=true': {
          unidad_ejecutora_id: IDEXUD,
          tipo_contrato_id: OBRA,
        },
      });
      expect(await service.obtenerMinuta(1)).toEqual(
        expect.objectContaining({
          Status: 404,
          Message: 'Plantilla no encontrada',
        }),
      );
    });

    it('responde 500 si plantillas_mid no genera el HTML o el PDF', async () => {
      responderGet(rutasCompletas(contratoOrdenCompra));
      const post = jest.spyOn(axios, 'post').mockResolvedValueOnce(fallida);
      expect((await service.obtenerMinuta(1)).Message).toBe(
        'Error al generar minuta, paso 1',
      );

      post
        .mockResolvedValueOnce(exitosa('<html></html>'))
        .mockRejectedValueOnce(new Error('sin conexión'));
      expect((await service.obtenerMinuta(1)).Message).toBe(
        'Error al generar minuta, paso 2',
      );
    });

    it('responde el estado del error inesperado o 500 por defecto', async () => {
      responderGet(rutasCompletas(contratoOrdenCompra));
      const plantilla = jest
        .spyOn(service as any, 'obtenerIdPlantilla')
        .mockImplementationOnce(() => {
          throw Object.assign(new Error('Falla del servicio'), {
            response: { status: 502 },
          });
        });
      expect(await service.obtenerMinuta(1)).toEqual({
        Success: false,
        Status: 502,
        Message: 'Falla del servicio',
      });

      plantilla.mockImplementationOnce(() => {
        throw {};
      });
      expect(await service.obtenerMinuta(1)).toEqual({
        Success: false,
        Status: 500,
        Message: 'Error al obtener minuta',
      });
    });
  });
});

