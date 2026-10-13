import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import axios from 'axios';
import { ActaInicioMockModule } from './acta_inicio_mock.module';
import { ActaInicioMockController } from './acta_inicio_mock.controller';
import { ServiciosMock } from './servicios-mock';

// Módulo y endpoints del modo simulado (ACTA_INICIO_MOCK=true)
describe('ActaInicioMockModule', () => {
  const adaptadorOriginal = axios.defaults.adapter;
  let modulo: TestingModule;
  let controller: ActaInicioMockController;

  const respuestaHttp = () => {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.end = jest.fn(() => res);
    return res;
  };

  beforeAll(async () => {
    modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        ActaInicioMockModule,
      ],
    }).compile();
    await modulo.init();
    // Las pruebas no llaman al plantillas_mid real: el PDF sale del render local
    axios.defaults.adapter = modulo
      .get(ServiciosMock)
      .crearAdaptador(() =>
        Promise.reject(new Error('sin conexión en pruebas')),
      );
    controller = modulo.get(ActaInicioMockController);
  });

  afterAll(() => {
    axios.defaults.adapter = adaptadorOriginal;
  });

  it('devuelve el PDF del contrato simulado', async () => {
    const res = respuestaHttp();
    await controller.pdf(9001, res);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/pdf' }),
    );
    const archivo: Buffer = res.end.mock.calls[0][0];
    expect(archivo.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20000);

  it('responde el error si el contrato no está en el mock', async () => {
    const res = respuestaHttp();
    await controller.pdf(1234, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).not.toHaveBeenCalled();
  });

  it('reinicia los datos simulados', () => {
    expect(controller.reiniciar().Success).toBe(true);
  });

  it('al cerrar el módulo deja axios como estaba', async () => {
    await modulo.close();
    expect(axios.defaults.adapter).toBe(adaptadorOriginal);
  });
});
