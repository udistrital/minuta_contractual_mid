import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import axios from 'axios';
import { ActaInicioController } from './../src/acta_inicio/acta_inicio.controller';
import { ActaInicioService } from './../src/acta_inicio/acta_inicio.service';
import { ActaInicioModule } from './../src/acta_inicio/acta_inicio.module';
import { ActaPolizaController } from './../src/acta_poliza/acta_poliza.controller';
import { ActaPolizaService } from './../src/acta_poliza/acta_poliza.service';
import { ESCENARIOS_MOCK } from './../src/acta_inicio/mock/datos-mock';
import {
  SERVICIOS_MOCK,
  ServiciosMock,
} from './../src/acta_inicio/mock/servicios-mock';

// Rutas del acta de inicio y del acta de póliza con contrato-id en la consulta
// (udistrital/argo_documentacion#414).

const CONTRATO_ID_INVALIDO = {
  Success: false,
  Status: 400,
  Message:
    "El parámetro de consulta 'contrato-id' es obligatorio y debe ser un entero entre 1 y 2147483647",
};
const ID_RUTA_INVALIDO = {
  Success: false,
  Status: 400,
  Message: "El parámetro de ruta 'id' debe ser un entero entre 1 y 2147483647",
};
const INVALIDOS = [
  '',
  'abc',
  '1.5',
  '0x10',
  '1e3',
  '%201',
  '0',
  '-1',
  '2147483648',
  '1&contrato-id=2',
];
const usuario = { usuario_id: 1, usuario_rol: 'ABOGADO_CONTRATACION_RECTOR' };
const amparos = [
  {
    id: 1,
    valor: 5000000,
    fecha_inicio: '2024-01-15',
    fecha_fin: '2025-01-15',
  },
];

describe('Rutas de actas con contrato-id (servicios simulados)', () => {
  let app: INestApplication;
  const respuestaPrevia = {
    Success: true,
    Status: 200,
    Data: { pdf: 'JVBER' },
  };
  const respuestaGenerada = {
    Success: true,
    Status: 201,
    Data: { pdf: 'JVBER' },
  };
  const respuestaBorrador = { Success: true, Status: 200, Data: 'JVBER' };
  const actaInicio = {
    obtenerMinuta: jest.fn(),
    generarActaInicio: jest.fn(),
    obtenerPrecarga: jest.fn(),
    obtenerActaPorContrato: jest.fn(),
  };
  const actaPoliza = { obtenerActaPoliza: jest.fn() };
  const servicios = () => [
    ...Object.values(actaInicio),
    ...Object.values(actaPoliza),
  ];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [ActaInicioController, ActaPolizaController],
      providers: [
        { provide: ActaInicioService, useValue: actaInicio },
        { provide: ActaPolizaService, useValue: actaPoliza },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    actaInicio.obtenerMinuta.mockResolvedValue(respuestaPrevia);
    actaInicio.generarActaInicio.mockResolvedValue(respuestaGenerada);
    actaPoliza.obtenerActaPoliza.mockResolvedValue(respuestaBorrador);
  });

  afterAll(() => app.close());

  describe('POST /acta-inicio/contratos/previsualizacion', () => {
    it('201: genera la vista previa del contrato de contrato-id', async () => {
      const res = await request(app.getHttpServer())
        .post('/acta-inicio/contratos/previsualizacion?contrato-id=9001')
        .send({ objeto: 'Objeto de prueba' })
        .expect(201);

      expect(res.body).toEqual(respuestaPrevia);
      expect(actaInicio.obtenerMinuta).toHaveBeenCalledWith(9001, {
        objeto: 'Objeto de prueba',
      });
    });

    // Falla si 'contratos/previsualizacion' se declara después de 'contratos/:id'
    it('no cae en la generación del acta aunque el cuerpo traiga usuario y rol', async () => {
      await request(app.getHttpServer())
        .post('/acta-inicio/contratos/previsualizacion?contrato-id=1')
        .send(usuario)
        .expect(201);

      expect(actaInicio.generarActaInicio).not.toHaveBeenCalled();
      expect(actaInicio.obtenerMinuta).toHaveBeenCalledWith(1, usuario);
    });

    it('400: sin contrato-id no ejecuta nada, ni la generación', async () => {
      const res = await request(app.getHttpServer())
        .post('/acta-inicio/contratos/previsualizacion')
        .send(usuario)
        .expect(400);

      expect(res.body).toEqual(CONTRATO_ID_INVALIDO);
      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });

    it.each(INVALIDOS)('400: contrato-id %p no es válido', async (valor) => {
      const res = await request(app.getHttpServer())
        .post(`/acta-inicio/contratos/previsualizacion?contrato-id=${valor}`)
        .send({})
        .expect(400);

      expect(res.body).toEqual(CONTRATO_ID_INVALIDO);
      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });

    it('404: la ruta anterior con el id en el path ya no existe', async () => {
      await request(app.getHttpServer())
        .post('/acta-inicio/contratos/9001/previsualizacion')
        .send({})
        .expect(404);

      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });
  });

  describe('POST /acta-inicio/contratos/:id (generar)', () => {
    it('201: un id válido genera el acta como antes', async () => {
      const res = await request(app.getHttpServer())
        .post('/acta-inicio/contratos/9001')
        .send(usuario)
        .expect(201);

      expect(res.body).toEqual(respuestaGenerada);
      expect(actaInicio.generarActaInicio).toHaveBeenCalledWith(9001, usuario);
    });

    it.each(['texto', 'abc', '1.5', '0'])(
      '400: el id %p no ejecuta nada',
      async (id) => {
        const res = await request(app.getHttpServer())
          .post(`/acta-inicio/contratos/${id}`)
          .send(usuario)
          .expect(400);

        expect(res.body).toEqual(ID_RUTA_INVALIDO);
        servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
      },
    );
  });

  describe('POST /acta-poliza/contratos/borrador', () => {
    it('201: genera el borrador con las filas enviadas', async () => {
      const res = await request(app.getHttpServer())
        .post('/acta-poliza/contratos/borrador?contrato-id=9001')
        .send({ amparos })
        .expect(201);

      expect(res.body).toEqual(respuestaBorrador);
      expect(actaPoliza.obtenerActaPoliza).toHaveBeenCalledWith(9001, amparos);
    });

    it('201: sin amparos en el cuerpo envía una lista vacía, como antes', async () => {
      await request(app.getHttpServer())
        .post('/acta-poliza/contratos/borrador?contrato-id=9001')
        .send({})
        .expect(201);

      expect(actaPoliza.obtenerActaPoliza).toHaveBeenCalledWith(9001, []);
    });

    it('400: sin contrato-id no ejecuta nada', async () => {
      const res = await request(app.getHttpServer())
        .post('/acta-poliza/contratos/borrador')
        .send({ amparos })
        .expect(400);

      expect(res.body).toEqual(CONTRATO_ID_INVALIDO);
      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });

    it.each(INVALIDOS)('400: contrato-id %p no es válido', async (valor) => {
      const res = await request(app.getHttpServer())
        .post(`/acta-poliza/contratos/borrador?contrato-id=${valor}`)
        .send({ amparos })
        .expect(400);

      expect(res.body).toEqual(CONTRATO_ID_INVALIDO);
      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });

    it('404: la ruta anterior con el id en el path ya no existe', async () => {
      await request(app.getHttpServer())
        .post('/acta-poliza/contratos/9001/borrador')
        .send({ amparos })
        .expect(404);

      servicios().forEach((fn) => expect(fn).not.toHaveBeenCalled());
    });
  });
});

// Generación real del acta con los servicios externos simulados por el adaptador
// de axios del modo mock: mismo cuerpo y mismas llamadas salientes que antes.
describe('Generación del acta de inicio con dependencias simuladas', () => {
  let app: INestApplication;
  let llamadas: [string, string, any][];
  const adaptadorOriginal = axios.defaults.adapter;

  beforeAll(async () => {
    SERVICIOS_MOCK.forEach(
      (servicio) =>
        (process.env[servicio] = `http://${servicio.toLowerCase()}/`),
    );
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ActaInicioModule,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(() => {
    llamadas = [];
    const simulados = new ServiciosMock(
      Object.fromEntries(
        SERVICIOS_MOCK.map((servicio) => [servicio, process.env[servicio]]),
      ),
    ).crearAdaptador(() =>
      Promise.reject(new Error('sin conexión en pruebas')),
    );
    axios.defaults.adapter = (config) => {
      llamadas.push([
        config.method,
        axios.getUri(config),
        config.data ? JSON.parse(config.data) : null,
      ]);
      return simulados(config);
    };
  });

  afterAll(async () => {
    axios.defaults.adapter = adaptadorOriginal;
    await app.close();
  });

  it('201: el contrato 9001 se genera con las mismas llamadas de antes', async () => {
    const res = await request(app.getHttpServer())
      .post('/acta-inicio/contratos/9001')
      .send({ ...ESCENARIOS_MOCK[9001].datosFormulario, ...usuario })
      .expect(201);

    expect(res.body).toMatchObject({
      Success: true,
      Status: 201,
      Message: 'Acta de inicio generada exitosamente',
    });
    expect(Object.keys(res.body.Data).sort()).toEqual([
      'acta_inicio',
      'estado',
      'pdf',
    ]);
    expect(llamadas.map(([metodo, url]) => `${metodo} ${url}`).sort()).toEqual([
      'get http://gestion_contractual_crud/actas-inicio',
      'get http://gestion_contractual_crud/contratistas/contrato/9001',
      'get http://gestion_contractual_crud/disponibilidad_presupuestal/contrato/9001',
      'get http://gestion_contractual_crud/estados-contrato/contrato/9001/actual',
      'get http://gestion_contractual_crud/lugares-ejecucion/contrato/9001',
      'get http://gestion_contractual_mid/contratos-generales/9001?ids=true',
      'get http://gestion_contractual_mid/polizas?query=%7B%22contrato_general_id%22%3A9001%2C%22activo%22%3Atrue%7D&limit=0',
      'get http://gestion_contractual_mid/supervisores/contrato/9001',
      'get http://parametros_crud/parametro/211',
      'get http://proveedores_mid/contratistas?id=1032456789',
      'get http://proveedores_mid/contratistas?id=79845123',
      'post http://gestion_contractual_crud/actas-inicio',
      'post http://gestion_contractual_crud/estados-contrato',
      'post http://plantillas_mid/plantilla/renderizar-html',
      'post http://plantillas_mid/plantilla/renderizar-pdf',
    ]);
    const escrituras = llamadas.filter(([, url]) =>
      url.startsWith('http://gestion_contractual_crud/'),
    );
    escrituras
      .filter(([metodo]) => metodo === 'post')
      .forEach(([, , cuerpo]) => expect(cuerpo.contrato_general_id).toBe(9001));
  });

  it.each(['texto', 'abc'])(
    '400: con el id %p no hace ninguna llamada saliente',
    async (id) => {
      const res = await request(app.getHttpServer())
        .post(`/acta-inicio/contratos/${id}`)
        .send({ ...ESCENARIOS_MOCK[9001].datosFormulario, ...usuario })
        .expect(400);

      expect(res.body).toEqual(ID_RUTA_INVALIDO);
      expect(llamadas).toEqual([]);
    },
  );
});
