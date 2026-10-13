import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ActaInicioService } from './acta_inicio.service';
import { environment } from 'src/environments/environment';

// Respuestas con error de los servicios externos y ramas que el flujo
// completo (acta_inicio.service.spec.ts) no recorre
describe('ActaInicioService: errores y casos límite', () => {
  let service: ActaInicioService;
  const fallida = { data: { Success: false, Status: '404', Data: null } };
  const exitosa = (Data: any) => ({
    data: { Success: true, Status: '200', Data },
  });
  const ROL = 'ABOGADO_CONTRATACION_RECTOR';

  beforeEach(() => {
    service = new ActaInicioService(
      new ConfigService({
        GESTION_CONTRACTUAL_CRUD: 'http://crud/',
        GESTION_CONTRACTUAL_MID: 'http://mid/',
        PROVEEDORES_MID: 'http://proveedores/',
        ORDENADORES_SUPERVISORES_CONTRATACION_MID: 'http://ordenadores/',
        PLANTILLAS_MID: 'http://plantillas/',
        PARAMETROS_CRUD: 'http://parametros/',
        GESTOR_DOCUMENTAL_MID: 'http://gestor/',
      }),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('consultas a los servicios', () => {
    const consultas: [string, () => Promise<any>][] = [
      ['obtenerDocumento', () => service.obtenerDocumento(1)],
      ['obtenerContratista', () => service.obtenerContratista(1)],
      ['obtenerOrdenadorArgoId', () => service.obtenerOrdenadorArgoId(1)],
      ['obtenerOrdenador', () => service.obtenerOrdenador(1)],
      ['obtenerActaInicio', () => service.obtenerActaInicio(1)],
      [
        'obtenerContratoGeneralCrud',
        () => service.obtenerContratoGeneralCrud(1),
      ],
      ['obtenerContratoGeneralMid', () => service.obtenerContratoGeneralMid(1)],
      [
        'consultar',
        () => service.consultar('GESTION_CONTRACTUAL_CRUD', 'ruta'),
      ],
    ];

    it.each(consultas)(
      '%s devuelve null si el servicio responde con error',
      async (_, consulta) => {
        jest.spyOn(axios, 'get').mockResolvedValue(fallida);
        expect(await consulta()).toBeNull();
      },
    );

    it.each(consultas)(
      '%s devuelve null si el servicio no responde',
      async (_, consulta) => {
        jest.spyOn(axios, 'get').mockRejectedValue(new Error('sin conexión'));
        expect(await consulta()).toBeNull();
      },
    );

    it('consulta el ordenador del contrato en el CRUD y en Argo', async () => {
      jest
        .spyOn(axios, 'get')
        .mockResolvedValueOnce(exitosa({ ordenador_argo_id: 7 }))
        .mockResolvedValueOnce(exitosa({ nombre: 'Ordenador' }));
      expect(await service.obtenerOrdenadorArgoId(1)).toBe(7);
      expect(await service.obtenerOrdenador(7)).toEqual({
        nombre: 'Ordenador',
      });
    });

    it('consulta el contrato en el CRUD si gestion_contractual_mid no responde', async () => {
      jest.spyOn(axios, 'get').mockResolvedValue(exitosa({ id: 1 }));
      expect(await service.obtenerContratoGeneralCrud(1)).toEqual({ id: 1 });
    });

    it('toma el acta activa más reciente del contrato', async () => {
      jest.spyOn(axios, 'get').mockResolvedValue({
        data: [
          { id: 1, contrato_general_id: 5, activo: true },
          { id: 3, contrato_general_id: 5, activo: true },
          { id: 4, contrato_general_id: 5, activo: false },
          { id: 6, contrato_general_id: 8, activo: true },
        ],
      });
      expect((await service.obtenerActaInicio(5)).id).toBe(3);
    });

    it('renderizarHTML, renderizarPDF y enviar devuelven null si el servicio falla', async () => {
      const post = jest.spyOn(axios, 'post').mockResolvedValue(fallida);
      expect(await service.renderizarHTML('plantilla', {})).toBeNull();
      expect(await service.renderizarPDF({}, '<html></html>')).toBeNull();
      post.mockRejectedValue(new Error('sin conexión'));
      expect(await service.renderizarHTML('plantilla', {})).toBeNull();
      expect(await service.renderizarPDF({}, '<html></html>')).toBeNull();
      expect(
        await service.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'ruta', {}),
      ).toBeNull();
    });

    it('ajusta el ancho del encabezado de la plantilla antes de pedir el PDF', async () => {
      const post = jest.spyOn(axios, 'post').mockResolvedValue(exitosa('pdf'));
      expect(
        await service.renderizarPDF(
          {},
          '<html><head></head><body></body></html>',
        ),
      ).toBe('pdf');
      const { html } = post.mock.calls[0][1] as any;
      expect(html).toContain('.header-table td:first-child { width: 17%; }');
      expect(html).toContain('</style></head>');
    });

    it('sin el tipo de documento de la minuta no hay tipo para el acta', async () => {
      jest.spyOn(service, 'consultar').mockResolvedValue(null);
      expect(await service.obtenerTipoDocumentoActa()).toBeNull();
    });

    it('sin el parámetro "acta de inicio" no hay tipo para el acta', async () => {
      jest
        .spyOn(service, 'consultar')
        .mockResolvedValueOnce({ TipoParametroId: { Id: 3 } })
        .mockResolvedValueOnce([]);
      expect(await service.obtenerTipoDocumentoActa()).toBeNull();
    });

    it('enviar devuelve Data o la respuesta tal cual si no tiene formato estándar', async () => {
      jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce({ data: { Data: { id: 2 } } })
        .mockResolvedValueOnce({ data: { id: 1 } });
      expect(
        await service.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'ruta', {}),
      ).toEqual({ id: 2 });
      expect(
        await service.enviar('post', 'GESTION_CONTRACTUAL_CRUD', 'ruta', {}),
      ).toEqual({ id: 1 });
    });

    it('la dependencia es null si no hay dependencias o ninguna coincide', async () => {
      const consultar = jest
        .spyOn(service, 'consultar')
        .mockResolvedValue(null);
      expect(await service.obtenerDependencia(1, 2)).toBeNull();
      consultar.mockResolvedValue([{ id: 3, nombre: 'Otra' }]);
      expect(await service.obtenerDependencia(1, 2)).toBeNull();
    });

    it('el gestor documental debe responder el id del documento', async () => {
      jest.spyOn(service, 'enviar').mockResolvedValue({ Status: '500' });
      expect(
        await service.guardarEnGestorDocumental(
          1,
          { numero_contrato: 'CPS-1' },
          'pdf',
        ),
      ).toBeNull();
    });
  });

  describe('datos del acta', () => {
    it('el representante y la unidad ejecutora toleran datos vacíos', () => {
      expect(service.obtenerRepresentante(undefined)).toEqual({
        representante_nombre: 'XXXXXXX',
        representante_numero_documento: 'XXXXXXX',
        representante_lugar_exp: 'XXXXXXX',
      });
      expect(
        service.obtenerUnidadEjecutoraPorNombre(undefined),
      ).toBeUndefined();
    });

    it('formatea el valor del registro presupuestal y acepta datos sin formulario', async () => {
      const data = {
        contrato: { plazo_ejecucion: 2 },
        supervisores: [],
        polizas: [],
        cdps: [],
      };
      expect((await service.obtenerDatosIniciales(data)).valor_registro).toBe(
        'XXXXXXX',
      );
      const datos = await service.obtenerDatosIniciales(data, {
        valor_registro: 54600000,
      });
      expect(datos.valor_registro.replace(/\s/g, ' ')).toBe('$ 54.600.000');
    });

    it('sin documento del contratista, documento del supervisor ni estado no los consulta', async () => {
      jest
        .spyOn(service, 'obtenerContratoGeneralMid')
        .mockResolvedValue({ unidad_ejecucion_id: 1 });
      jest.spyOn(service, 'obtenerDocumento').mockResolvedValue(null);
      jest.spyOn(service, 'obtenerActaInicio').mockResolvedValue(null);
      const contratista = jest.spyOn(service, 'obtenerContratista');
      jest
        .spyOn(service, 'consultar')
        .mockImplementation(async (_, ruta) =>
          ruta.startsWith('supervisores')
            ? [{ nombre_supervisor: 'Supervisor' }]
            : ruta.startsWith('estados-contrato')
              ? {}
              : null,
        );
      const informacion = await service.obtenerInformacion(1);
      expect(contratista).not.toHaveBeenCalled();
      expect(informacion).toEqual(
        expect.objectContaining({
          contratista: null,
          supervisorProveedor: null,
          estadoActual: null,
          unidadEjecucion: null,
        }),
      );
    });

    it('actualiza el acta existente y toma los datos de las variables del formulario', async () => {
      const enviar = jest.spyOn(service, 'enviar').mockResolvedValue({ id: 5 });
      await service.guardarActaInicio(
        1,
        { id: 5 },
        { numero_contrato: 'CPS-1' },
        {
          usuario_id: 1,
          usuario_rol: ROL,
          variables: {
            numero_acta: 'AI-01',
            nombre_interventor: 'Interventor',
          },
        },
      );
      const [metodo, , ruta, acta] = enviar.mock.calls[0];
      expect([metodo, ruta]).toEqual(['put', 'actas-inicio/5']);
      expect(acta).toEqual(
        expect.objectContaining({
          numero_acta: 'AI-01',
          nombre_interventor: 'Interventor',
          fecha_suscripcion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });

    it('reconoce los perfiles profesionales', () => {
      expect(service.esPerfilProfesional('Profesional especializado')).toBe(
        true,
      );
      expect(service.esPerfilProfesional('Técnico')).toBe(false);
      expect(service.esPerfilProfesional(undefined)).toBe(false);
    });

    it('las variables del formulario reemplazan las del contrato, menos las vacías', async () => {
      const datos = await service.obtenerDatosIniciales(
        {
          contrato: { numero_contrato: 'CPS-1', plazo_ejecucion: 2 },
          supervisores: [{ nombre_supervisor: 'Supervisor del CRUD' }],
          polizas: [],
          cdps: [],
        },
        {
          variables: {
            nombre_supervisor: 'Supervisor editado',
            numero_contrato: '',
          },
        },
      );
      expect(datos.nombre_supervisor).toBe('Supervisor editado');
      expect(datos.numero_contrato).toBe('CPS-1');
    });

    it('sin contrato en gestion_contractual_mid ni en el CRUD no hay información', async () => {
      jest.spyOn(service, 'obtenerContratoGeneralMid').mockResolvedValue(null);
      jest.spyOn(service, 'obtenerContratoGeneralCrud').mockResolvedValue(null);
      jest.spyOn(service, 'obtenerDocumento').mockResolvedValue(null);
      jest.spyOn(service, 'obtenerActaInicio').mockResolvedValue(null);
      jest.spyOn(service, 'consultar').mockResolvedValue(null);
      expect(await service.obtenerInformacion(1)).toBeNull();
    });

    it('sin documentos registrados el acta no tiene documento', async () => {
      jest.spyOn(service, 'obtenerActaInicio').mockResolvedValue({ id: 1 });
      jest.spyOn(service, 'obtenerTipoDocumentoActa').mockResolvedValue(9);
      jest.spyOn(service, 'consultar').mockResolvedValue(null);
      const respuesta: any = await service.obtenerActaPorContrato(1);
      expect(respuesta.Data.documento).toBeNull();
    });

    it('el documento del acta es el más reciente del tipo acta de inicio', async () => {
      jest.spyOn(service, 'obtenerActaInicio').mockResolvedValue({ id: 1 });
      jest.spyOn(service, 'obtenerTipoDocumentoActa').mockResolvedValue(9);
      jest.spyOn(service, 'consultar').mockResolvedValue([
        { id: 1, tipo_documento_id: 9 },
        { id: 2, tipo_documento_id: 9 },
        { id: 3, tipo_documento_id: 8 },
        { id: 4, tipo_documento_id: 9, activo: false },
      ]);
      const respuesta: any = await service.obtenerActaPorContrato(1);
      expect(respuesta.Data.documento.id).toBe(2);
    });
  });

  describe('vista previa y precarga', () => {
    it('responden 404 si el contrato no existe', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockResolvedValue(null);
      expect((await service.obtenerMinuta(1)).Status).toBe(404);
      expect((await service.obtenerPrecarga(1)).Status).toBe(404);
    });

    it('la vista previa responde 404 si no hay plantilla para el contrato', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockResolvedValue({
        contrato: {
          unidad_ejecutora_id: environment.UNIDADES_EJECUTORAS.IDEXUD,
          tipo_contrato_id: environment.TIPOS_DE_CONTRATO.OBRA,
        },
      });
      const respuesta = await service.obtenerMinuta(1);
      expect(respuesta).toEqual(
        expect.objectContaining({
          Status: 404,
          Message: 'Plantilla no encontrada',
        }),
      );
    });

    it('la vista previa responde 500 si no se pudo generar el PDF', async () => {
      jest
        .spyOn(service, 'obtenerInformacion')
        .mockResolvedValue({ contrato: {} });
      jest.spyOn(service, 'obtenerIdPlantilla').mockReturnValue('plantilla');
      jest.spyOn(service, 'obtenerDatosIniciales').mockResolvedValue({});
      jest.spyOn(service, 'renderizarHTML').mockResolvedValue(null);
      expect((await service.obtenerMinuta(1)).Status).toBe(500);
    });

    it('la precarga de un contrato sin plantilla no tiene campos faltantes', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockResolvedValue({
        contrato: {},
        supervisores: [],
        polizas: [],
        cdps: [],
        actaInicio: null,
      });
      jest.spyOn(service, 'obtenerIdPlantilla').mockReturnValue(undefined);
      jest.spyOn(service, 'obtenerDatosIniciales').mockResolvedValue({});
      const respuesta: any = await service.obtenerPrecarga(1);
      expect(respuesta.Data.plantilla_id).toBeNull();
      expect(respuesta.Data.campos_faltantes).toEqual([]);
    });

    it('la vista previa responde 500 si el error no trae estado ni mensaje', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockRejectedValue({});
      expect(await service.obtenerMinuta(1)).toEqual({
        Success: false,
        Status: 500,
        Message: 'Error al obtener acta de inicio',
      });
    });

    it('la vista previa devuelve el estado del error inesperado', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockRejectedValue(
        Object.assign(new Error('Falla del servicio'), {
          response: { status: 502 },
        }),
      );
      expect(await service.obtenerMinuta(1)).toEqual({
        Success: false,
        Status: 502,
        Message: 'Falla del servicio',
      });
    });
  });

  describe('generación del acta', () => {
    const entrada = { usuario_id: 1, usuario_rol: ROL };

    // Contrato que cumple los prerrequisitos y tiene todos los campos de la plantilla
    const contratoValido = () => {
      jest
        .spyOn(service, 'obtenerInformacion')
        .mockResolvedValue({ contrato: {}, actaInicio: null });
      jest.spyOn(service, 'obtenerIdPlantilla').mockReturnValue('plantilla');
      jest
        .spyOn(service, 'validarPrerrequisitos')
        .mockReturnValue({ puede_generar: true, prerrequisitos: [] });
      jest
        .spyOn(service, 'obtenerDatosIniciales')
        .mockResolvedValue({ numero_contrato: 'CPS-1' });
      jest.spyOn(service, 'camposFaltantes').mockReturnValue([]);
      jest.spyOn(service, 'renderizarHTML').mockResolvedValue('<html></html>');
      jest.spyOn(service, 'renderizarPDF').mockResolvedValue('pdf');
    };

    it('responde 404 si el contrato no existe', async () => {
      jest.spyOn(service, 'obtenerInformacion').mockResolvedValue(null);
      expect((await service.generarActaInicio(1, entrada)).Status).toBe(404);
    });

    it('responde 422 si faltan datos de la plantilla', async () => {
      contratoValido();
      jest
        .spyOn(service, 'camposFaltantes')
        .mockReturnValue(['valor_anticipo']);
      const respuesta: any = await service.generarActaInicio(1, entrada);
      expect(respuesta.Status).toBe(422);
      expect(respuesta.Data.campos_faltantes).toEqual(['valor_anticipo']);
    });

    it('responde 500 si no se pudo generar el HTML o el PDF', async () => {
      contratoValido();
      const pdf = jest.spyOn(service, 'renderizarPDF').mockResolvedValue(null);
      expect((await service.generarActaInicio(1, entrada)).Status).toBe(500);
      jest.spyOn(service, 'renderizarHTML').mockResolvedValue(null);
      pdf.mockClear();
      expect((await service.generarActaInicio(1, entrada)).Status).toBe(500);
      expect(pdf).not.toHaveBeenCalled();
    });

    it('responde 502 si el gestor documental no guardó el PDF', async () => {
      contratoValido();
      jest.spyOn(service, 'guardarEnGestorDocumental').mockResolvedValue(null);
      expect((await service.generarActaInicio(1, entrada)).Status).toBe(502);
    });

    it('no cambia el estado si no se pudo registrar el acta', async () => {
      contratoValido();
      jest
        .spyOn(service, 'guardarEnGestorDocumental')
        .mockResolvedValue({ Id: 1, Enlace: 'enlace' });
      jest
        .spyOn(service, 'registrarDocumentoContrato')
        .mockResolvedValue({ id: 1 });
      jest.spyOn(service, 'guardarActaInicio').mockResolvedValue(null);
      const estado = jest.spyOn(service, 'registrarEstado');
      const respuesta: any = await service.generarActaInicio(1, entrada);
      expect(respuesta.Status).toBe(500);
      expect(respuesta.Data.documento).toEqual({ Id: 1, Enlace: 'enlace' });
      expect(estado).not.toHaveBeenCalled();
    });
  });
});
