import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { ActaInicioModule } from './../src/acta_inicio/acta_inicio.module';
import { ActaInicioMockModule } from './../src/acta_inicio/mock/acta_inicio_mock.module';
import { ESCENARIOS_MOCK } from './../src/acta_inicio/mock/datos-mock';

// Flujo del acta de inicio por HTTP con los servicios simulados
describe('Acta de inicio con datos simulados (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        ActaInicioModule,
        ActaInicioMockModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([9001, 9002, 9003, 9005])(
    'GET /acta-inicio/mock/contratos/%i/pdf devuelve un PDF',
    (id) =>
      request(app.getHttpServer())
        .get(`/acta-inicio/mock/contratos/${id}/pdf`)
        .expect(200)
        .expect('Content-Type', 'application/pdf'),
  );

  it('POST /acta-inicio/contratos/9001 genera el acta y luego se encuentra por contrato', async () => {
    const servidor = app.getHttpServer();
    const generada = await request(servidor)
      .post('/acta-inicio/contratos/9001')
      .send({
        ...ESCENARIOS_MOCK[9001].datosFormulario,
        usuario_id: 1,
        usuario_rol: 'ABOGADO_CONTRATACION_RECTOR',
      })
      .expect(201);
    expect(generada.body.Success).toBe(true);

    await request(servidor)
      .get('/acta-inicio/9001')
      .expect(200)
      .expect((res) =>
        expect(res.body.Data.acta_inicio.contrato_general_id).toBe(9001),
      );

    await request(servidor).post('/acta-inicio/mock/reiniciar').expect(201);
    await request(servidor)
      .get('/acta-inicio/9001')
      .expect((res) => expect(res.body.Status).toBe(404));
  });
});
