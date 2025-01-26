import { Test, TestingModule } from '@nestjs/testing';
import { ActaInicioController } from './acta_inicio.controller';
import { ActaInicioService } from './acta_inicio.service';

describe('ActaInicioController', () => {
  let controller: ActaInicioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActaInicioController],
      providers: [ActaInicioService],
    }).compile();

    controller = module.get<ActaInicioController>(ActaInicioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
