import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinutaController } from './minuta.controller';
import { MinutaService } from './minuta.service';
import { CreateMinutaDto } from './dto/create-minuta.dto';
import { UpdateMinutaDto } from './dto/update-minuta.dto';
import { Minuta } from './entities/minuta.entity';

describe('MinutaController', () => {
  let controller: MinutaController;
  let service: MinutaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinutaController],
      providers: [MinutaService, ConfigService],
    }).compile();

    controller = module.get<MinutaController>(MinutaController);
    service = module.get<MinutaService>(MinutaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each([
    [200, { Success: true, Status: 200, Message: 'ok', Data: 'UERG' }],
    [400, { Success: false, Status: 400, Message: 'id inválido' }],
    [404, { Success: false, Status: 404, Message: 'Plantilla no encontrada' }],
    [422, { Success: false, Status: 422, Message: 'Faltan datos: ordenador' }],
    [502, { Success: false, Status: 502, Message: 'Servicio no disponible' }],
    [500, { Success: false, Status: 500, Message: 'Error al generar' }],
  ])(
    'responde HTTP %i, igual al Status, con el mismo cuerpo del servicio',
    async (codigo, respuesta) => {
      jest.spyOn(service, 'obtenerMinuta').mockResolvedValue(respuesta);
      const res = { status: jest.fn() } as any;

      await expect(controller.obtenerMinuta('7', res)).resolves.toBe(respuesta);
      expect(service.obtenerMinuta).toHaveBeenCalledWith('7');
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(codigo);
    },
  );

  it('las clases de DTO y entidad de la minuta se pueden instanciar', () => {
    expect(new CreateMinutaDto()).toBeInstanceOf(CreateMinutaDto);
    expect(new UpdateMinutaDto()).toBeInstanceOf(UpdateMinutaDto);
    expect(new Minuta()).toBeInstanceOf(Minuta);
  });
});
