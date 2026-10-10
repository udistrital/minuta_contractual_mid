import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ActaInicioService } from './acta_inicio.service';
import { environment } from 'src/environments/environment';
import { ServiciosMock, SERVICIOS_MOCK } from './mock/servicios-mock';
import { ESCENARIOS_MOCK } from './mock/datos-mock';
import { PLANTILLAS_ACTA } from './mock/plantillas-mock';

// Las consultas a los servicios externos (URL del .env) se responden con los
// escenarios simulados de mock/datos-mock.ts (contratos 9001, 9002, 9003 y 9005)

const esPdf = (base64: string) =>
  Buffer.from(base64, 'base64').subarray(0, 5).toString() === '%PDF-';

describe('ActaInicioService', () => {
  let service: ActaInicioService;
  const adaptadorOriginal = axios.defaults.adapter;
  let serviciosMock: ServiciosMock;

  beforeAll(async () => {
    const configuracion: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' })],
    }).compile();
    const configService = configuracion.get(ConfigService);
    serviciosMock = new ServiciosMock(
      Object.fromEntries(
        SERVICIOS_MOCK.map((servicio) => [
          servicio,
          configService.get<string>(servicio),
        ]),
      ),
    );
    axios.defaults.adapter = serviciosMock.crearAdaptador(
      axios.getAdapter(adaptadorOriginal),
    );
  });

  afterAll(() => {
    axios.defaults.adapter = adaptadorOriginal;
  });

  beforeEach(async () => {
    serviciosMock.reiniciar();
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env' })],
      providers: [ActaInicioService],
    }).compile();

    service = module.get<ActaInicioService>(ActaInicioService);
  });

  describe('obtenerIdPlantilla', () => {
    const { RECTORIA, IDEXUD } = environment.UNIDADES_EJECUTORAS;
    const { COMPRA_VENTA, OBRA, SUMINISTRO } = environment.TIPOS_DE_CONTRATO;

    it('elige la plantilla de Rectoría por tipo de contrato', () => {
      expect(
        service.obtenerIdPlantilla({
          unidad_ejecutora_id: RECTORIA,
          tipo_contrato_id: COMPRA_VENTA,
        }),
      ).toBe(PLANTILLAS_ACTA.COMPRAVENTA);
      expect(
        service.obtenerIdPlantilla({
          unidad_ejecutora_id: String(RECTORIA),
          tipo_contrato_id: String(OBRA),
        }),
      ).toBe(PLANTILLAS_ACTA.OBRA);
    });

    it('usa el nombre de la unidad si su id no está en environment', () => {
      expect(
        service.obtenerIdPlantilla({
          unidad_ejecutora_id: 99999,
          unidad_ejecutora: 'Rectoría',
          tipo_contrato_id: COMPRA_VENTA,
        }),
      ).toBe(PLANTILLAS_ACTA.COMPRAVENTA);
    });

    it('no hay plantilla para IDEXUD ni para tipos sin formato', () => {
      expect(
        service.obtenerIdPlantilla({
          unidad_ejecutora_id: IDEXUD,
          tipo_contrato_id: OBRA,
        }),
      ).toBeFalsy();
      expect(
        service.obtenerIdPlantilla({
          unidad_ejecutora_id: RECTORIA,
          tipo_contrato_id: SUMINISTRO,
        }),
      ).toBeFalsy();
    });
  });

  it.each([
    [9001, PLANTILLAS_ACTA.PRESTACION_SERVICIOS],
    [9002, PLANTILLAS_ACTA.OBRA],
    [9003, PLANTILLAS_ACTA.INTERADMINISTRATIVO],
    [9005, PLANTILLAS_ACTA.COMPRAVENTA],
  ])(
    'el contrato %i genera el PDF de la plantilla %s sin campos faltantes',
    async (id, plantilla) => {
      const respuesta: any = await service.obtenerMinuta(
        id,
        ESCENARIOS_MOCK[id].datosFormulario,
      );
      expect(respuesta.Success).toBe(true);
      expect(esPdf(respuesta.Data.pdf)).toBe(true);
      expect(respuesta.Data.campos_faltantes).toEqual([]);
      expect(service.obtenerIdPlantilla(ESCENARIOS_MOCK[id].contrato)).toBe(
        plantilla,
      );
    },
    20000,
  );

  it('arma las variables de compraventa desde el CRUD, proveedores y espacios físicos', async () => {
    const respuesta: any = await service.obtenerPrecarga(9005);
    // El anticipo no existe en ningún servicio: se diligencia en el formulario
    expect(respuesta.Data.campos_faltantes).toEqual(['valor_anticipo']);
    expect(respuesta.Data.datos).toEqual(
      expect.objectContaining({
        tipo_contrato: 'Compraventa',
        numero_contrato: 'CPV-042-2026',
        localizacion_proyecto: 'Laboratorios de la Facultad de Ingeniería',
        nombre_contratista: 'Tecnologías Científicas Avanzadas S.A.S.',
        plazo_vigencia: '6 meses',
        fecha_iniciacion: '2026-05-12',
        fecha_terminacion: '2026-11-12',
        nombre_facultad: 'Ingeniería',
        nombre_supervisor: 'Ing. Carlos Alberto Martínez',
        cedula_supervisor: '79.887.654',
        ciudad_expedicion_supervisor: 'Bogotá D.C.',
        cedula_contratista: '1.020.443.221',
        nombre_representante: 'Alejandro Restrepo Hoyos',
        nit_representante: '901.345.678-9',
        dia_conclusion: 'doce',
        dia_numero: '12',
        mes_conclusion: 'noviembre',
        year_conclusion: '2026',
      }),
    );
  });

  it('genera el acta, la guarda y deja el contrato en ejecución', async () => {
    const respuesta: any = await service.generarActaInicio(9003, {
      ...ESCENARIOS_MOCK[9003].datosFormulario,
      usuario_id: 1,
      usuario_rol: 'ABOGADO_CONTRATACION_RECTOR',
    });
    expect(respuesta.Status).toBe(201);
    expect(respuesta.Data.estado.estado_parametro_id).toBe(
      environment.ESTADOS_GENERALES.EN_EJECUCION,
    );

    const acta: any = await service.obtenerActaPorContrato(9003);
    expect(acta.Data.acta_inicio.contrato_general_id).toBe(9003);
    expect(acta.Data.documento.documento_enlace).toBe(
      respuesta.Data.documento.enlace,
    );

    // Ya en ejecución no se puede volver a generar
    const otra: any = await service.generarActaInicio(9003, {
      usuario_id: 1,
      usuario_rol: 'ABOGADO_CONTRATACION_RECTOR',
    });
    expect(otra.Status).toBe(422);
  }, 20000);

  it('bloquea el acta si no hay supervisor y la póliza no está aprobada', () => {
    // Mismos datos del contrato 9001, sin supervisor y con la póliza sin aprobar
    const { contrato, polizas, cdps, estadoActual } = ESCENARIOS_MOCK[9001];
    const validacion = service.validarPrerrequisitos(
      {
        contrato,
        supervisores: [],
        polizas: polizas.map((poliza) => ({
          ...poliza,
          fecha_aprobacion: null,
        })),
        cdps,
        estadoActual,
      },
      service.obtenerIdPlantilla(contrato),
    );
    expect(validacion.puede_generar).toBe(false);
    expect(
      validacion.prerrequisitos
        .filter((item) => !item.cumple)
        .map((item) => item.codigo),
    ).toEqual(['SUPERVISOR', 'POLIZA']);
  });

  it('solo los roles autorizados generan el acta', async () => {
    const respuesta: any = await service.generarActaInicio(9001, {
      ...ESCENARIOS_MOCK[9001].datosFormulario,
      usuario_id: 1,
      usuario_rol: 'ORDENADOR_DEL_GASTO',
    });
    expect(respuesta.Status).toBe(403);
  });

  it('responde 404 si el contrato no tiene acta de inicio', async () => {
    const respuesta: any = await service.obtenerActaPorContrato(9001);
    expect(respuesta.Status).toBe(404);
  });
});
