import { Test, TestingModule } from '@nestjs/testing';
import { ActaInicioService } from './acta_inicio.service';

describe('ActaInicioService', () => {
  let service: ActaInicioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActaInicioService],
    }).compile();

    service = module.get<ActaInicioService>(ActaInicioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
