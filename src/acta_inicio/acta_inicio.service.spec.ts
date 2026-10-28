import { Test, TestingModule } from '@nestjs/testing';
import { ActaInicioService } from './acta_inicio.service';

import { ConfigService } from '@nestjs/config';

describe('ActaInicioService', () => {
  let service: ActaInicioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ActaInicioService>(ActaInicioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
