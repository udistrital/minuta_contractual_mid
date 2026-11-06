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

  it('responde la minuta que genera el servicio', async () => {
    const respuesta: any = { Success: true, Data: 'pdf-base64' };
    jest.spyOn(service, 'obtenerMinuta').mockResolvedValue(respuesta);
    expect(await controller.obtenerMinuta(1)).toBe(respuesta);
    expect(service.obtenerMinuta).toHaveBeenCalledWith(1);
  });

  it('las clases de DTO y entidad de la minuta se pueden instanciar', () => {
    expect(new CreateMinutaDto()).toBeInstanceOf(CreateMinutaDto);
    expect(new UpdateMinutaDto()).toBeInstanceOf(UpdateMinutaDto);
    expect(new Minuta()).toBeInstanceOf(Minuta);
  });
});
