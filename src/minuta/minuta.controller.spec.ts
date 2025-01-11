import { Test, TestingModule } from '@nestjs/testing';
import { MinutaController } from './minuta.controller';
import { MinutaService } from './minuta.service';

describe('MinutaController', () => {
  let controller: MinutaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinutaController],
      providers: [MinutaService],
    }).compile();

    controller = module.get<MinutaController>(MinutaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
