import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MARCADOR_FALTANTE, MinutaService } from './minuta.service';
import { environment } from 'src/environments/environment';

// Pruebas generales del servicio de la minuta con el CRUD Beego. Las de cada
// consulta, los datos obligatorios (422) y los servicios caídos (502) están en
// minuta-crud.service.spec.ts.
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
    const { RECTORIA } = environment.UNIDADES_EJECUTORAS;
    const { ORDEN_DE_COMPRA, OBRA } = environment.TIPOS_DE_CONTRATO;
    const exitosa = (Data: any) => ({
      data: { Success: true, Status: 200, Data },
    });
    const noEncontrada = { data: { Success: false, Status: 404 } };

    // Orden de compra de Rectoría con contratista persona jurídica (datos ficticios)
    const contratoOrdenCompra = {
      id: 1,
      numero_contrato: 'OC-2026-001',
      vigencia_id: 9002,
      unidad_ejecutora_id: RECTORIA,
      tipo_contrato_id: ORDEN_DE_COMPRA,
      aplica_poliza: true,
      justificacion: 'Justificación ficticia',
      modalidad_seleccion: 'Contratación directa',
      fecha_suscripcion_estudios: '2026-01-15',
      perfil_contratista: 'Profesional especializado',
      proveedor_numero_documento: '900123',
    };

    // Respuestas de los servicios por prefijo de URL; las demás responden 404
    const responderGet = (rutas: Record<string, any>) =>
      jest.spyOn(axios, 'get').mockImplementation(async (url: string) => {
        const ruta = Object.keys(rutas).find((clave) => url.startsWith(clave));
        return ruta ? exitosa(rutas[ruta]) : noEncontrada;
      });

    const rutasCompletas = (contrato: any) => ({
      'http://mid/contratos-generales/1?ids=true': contrato,
      'http://crud/v1/ordenadores/?query=contrato_general_id.id:1,': [
        { ordenador_argo_id: 7 },
      ],
      'http://crud/v1/especificaciones-tecnicas/?query=contrato_general_id.id:1,':
        [
          {
            descripcion: 'Computador',
            cantidad: 2,
            valor_unitario: 1500000,
            valor_total: 3000000,
          },
        ],
      'http://parametros/v1/parametro/9002': { Id: 9002, Nombre: '2026' },
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
      'http://ordenadores/ordenadores/7': {
        nombre_ordenador: 'Ordenador del Gasto',
        documento: '79111222',
        nombre_ciudad: 'Bogotá D.C.',
        rol_nombre: 'Rector',
        info_resolucion: 'Resolución 001',
      },
      'http://clausulas/contratos/1': [{ nombre: 'Cláusula primera' }],
    });

    beforeEach(() => {
      service = new MinutaService(
        new ConfigService({
          GESTION_CONTRACTUAL_MID: 'http://mid/',
          GESTION_CONTRACTUAL_CRUD: 'http://crud/v1/',
          PARAMETROS_CRUD: 'http://parametros/v1/',
          PROVEEDORES_MID: 'http://proveedores/',
          ORDENADORES_SUPERVISORES_CONTRATACION_MID: 'http://ordenadores/',
          CLAUSULAS_PARAGRAFOS_CRUD: 'http://clausulas/',
          PLANTILLAS_MID: 'http://plantillas/',
        }),
      );
    });

    afterEach(() => jest.restoreAllMocks());

    it('genera la minuta con los datos del contrato, el contratista y el ordenador', async () => {
      const get = responderGet(rutasCompletas(contratoOrdenCompra));
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
          contrato_numero: 'OC-2026-001',
          vigencia: '2026',
          ordenador_nombre: 'Ordenador del Gasto',
          contratista_nombre: 'Suministros S.A.S.',
          contratista_numero_documento: '900123',
          representante_nombre: 'Ana Pérez',
          representante_numero_documento: '52345678',
          justificacion: 'Justificación ficticia',
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
      // Rutas del CRUD Beego: sin contratistas/contrato ni ordenador-contrato,
      // y cláusulas del contrato pedido (no las del 9512)
      const urls = get.mock.calls.map(([url]) => url as string);
      expect(urls.some((u) => u.includes('contratistas/contrato'))).toBe(false);
      expect(urls.some((u) => u.includes('ordenador-contrato'))).toBe(false);
      expect(urls).not.toContain('http://clausulas/contratos/9512');
    });

    it('tolera contrato y representante vacíos al armar los datos', () => {
      const datos = (service as any).obtenerDatosIniciales({});
      expect(datos).toEqual(
        expect.objectContaining({
          contrato_numero: MARCADOR_FALTANTE,
          justificacion: MARCADOR_FALTANTE,
          ordenador_nombre: MARCADOR_FALTANTE,
          contratista_nombre: MARCADOR_FALTANTE,
          perfil_profesional: false,
        }),
      );
      expect((service as any).obtenerRepresentante(undefined)).toEqual({
        representante_nombre: MARCADOR_FALTANTE,
        representante_numero_documento: MARCADOR_FALTANTE,
        representante_lugar_exp: MARCADOR_FALTANTE,
      });
    });

    it('persona natural sin perfil profesional y sin póliza: sin representante, especificaciones ni amparos', async () => {
      responderGet({
        ...rutasCompletas({
          ...contratoOrdenCompra,
          tipo_contrato_id: OBRA,
          aplica_poliza: false,
          perfil_contratista: 'Técnico',
          proveedor_numero_documento: '1012345678',
        }),
        'http://proveedores/contratistas?id=1012345678': {
          proveedor: {
            nombre_completo_proveedor: 'Contratista Ficticio',
            tipo_persona: 'NATURAL',
            numero_documento: '1012345678',
            ciudad_expedicion_documento: 'Bogotá D.C.',
          },
          representante: null,
        },
      });
      const post = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce(exitosa('<html></html>'))
        .mockResolvedValueOnce(exitosa('pdf-base64'));

      expect((await service.obtenerMinuta(1)).Status).toBe(200);
      const { data } = post.mock.calls[0][1] as any;
      expect(data.perfil_profesional).toBe(false);
      expect(data.contratista_tipo_persona).toBe('NATURAL');
      expect(data).not.toHaveProperty('representante_nombre');
      expect(data).not.toHaveProperty('especificaciones');
      expect(data).not.toHaveProperty('amparos');
    });

    it('un error inesperado responde 500 sin tomar el estado del error', async () => {
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
        Status: 500,
        Message: 'Error al generar la minuta',
      });

      plantilla.mockImplementationOnce(() => {
        throw {};
      });
      expect(await service.obtenerMinuta(1)).toEqual({
        Success: false,
        Status: 500,
        Message: 'Error al generar la minuta',
      });
    });
  });
});
