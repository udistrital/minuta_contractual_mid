import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ActaPolizaController } from './acta_poliza.controller';
import { ActaPolizaService } from './acta_poliza.service';

describe('ActaPolizaController', () => {
  let controller: ActaPolizaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActaPolizaController],
      providers: [
        ActaPolizaService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ActaPolizaController>(ActaPolizaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
