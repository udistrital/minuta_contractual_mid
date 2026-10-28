import { Test, TestingModule } from '@nestjs/testing';
import { ActaInicioController } from './acta_inicio.controller';
import { ActaInicioService } from './acta_inicio.service';

import { ConfigService } from '@nestjs/config';

describe('ActaInicioController', () => {
  let controller: ActaInicioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActaInicioController],
      providers: [
        ActaInicioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActaInicioController>(ActaInicioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
