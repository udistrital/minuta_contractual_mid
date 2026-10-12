import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActaInicioController } from './acta_inicio.controller';
import { ActaInicioService } from './acta_inicio.service';
import { ActaInicioModule } from './acta_inicio.module';

describe('ActaInicioController', () => {
  let controller: ActaInicioController;
  let service: ActaInicioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActaInicioController],
      providers: [ActaInicioService, ConfigService],
    }).compile();

    controller = module.get<ActaInicioController>(ActaInicioController);
    service = module.get<ActaInicioService>(ActaInicioService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('el módulo registra el controlador y el servicio', async () => {
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), ActaInicioModule],
    }).compile();
    expect(modulo.get(ActaInicioController)).toBeDefined();
    expect(modulo.get(ActaInicioService)).toBeDefined();
  });

  it('cada ruta responde lo que devuelve el servicio', async () => {
    const respuesta: any = { Success: true };
    const datos = { numero_acta: 'AI-01' };
    const generar = { ...datos, usuario_id: 1, usuario_rol: 'CONTRATISTA' };
    jest.spyOn(service, 'obtenerPrecarga').mockResolvedValue(respuesta);
    jest.spyOn(service, 'obtenerMinuta').mockResolvedValue(respuesta);
    jest.spyOn(service, 'generarActaInicio').mockResolvedValue(respuesta);
    jest.spyOn(service, 'obtenerActaPorContrato').mockResolvedValue(respuesta);

    expect(await controller.obtenerPrecarga(9001)).toBe(respuesta);
    expect(await controller.previsualizar(9001, datos)).toBe(respuesta);
    expect(await controller.generar(9001, generar)).toBe(respuesta);
    expect(await controller.obtenerActaPorContrato(9001)).toBe(respuesta);
    expect(service.obtenerMinuta).toHaveBeenCalledWith(9001, datos);
    expect(service.generarActaInicio).toHaveBeenCalledWith(9001, generar);
  });
});