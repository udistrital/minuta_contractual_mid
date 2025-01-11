import { Test, TestingModule } from '@nestjs/testing';
import { MinutaService } from './minuta.service';

describe('MinutaService', () => {
  let service: MinutaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MinutaService],
    }).compile();

    service = module.get<MinutaService>(MinutaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
