import { AppService } from './app.service';

describe('AppService', () => {
  it('cuenta las consultas de salud', () => {
    const service = new AppService();
    expect(service.healthCheck()).toEqual({ Status: 'ok', checkCount: 0 });
    expect(service.healthCheck()).toEqual({ Status: 'ok', checkCount: 1 });
  });

  it('responde error si no puede contar la consulta', () => {
    const service = new AppService();
    Object.defineProperty(service, 'counter', {
      get: () => {
        throw new Error('contador no disponible');
      },
    });
    expect(service.healthCheck()).toEqual({
      Status: 'error',
      error: 'contador no disponible',
    });
  });
});
