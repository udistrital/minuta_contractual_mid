import { Test } from '@nestjs/testing';

// AppModule decide al importarse si registra el modo simulado, por eso cada
// caso lo vuelve a importar con su valor de ACTA_INICIO_MOCK
describe('AppModule', () => {
  const mockOriginal = process.env.ACTA_INICIO_MOCK;

  afterEach(() => {
    process.env.ACTA_INICIO_MOCK = mockOriginal;
  });

  it.each([
    ['true', true],
    ['false', false],
  ])(
    'con ACTA_INICIO_MOCK=%s registra los módulos de la API',
    async (valor, conMock) => {
      process.env.ACTA_INICIO_MOCK = valor;
      jest.resetModules();
      const { AppModule } = await import('./app.module');
      const { AppController } = await import('./app.controller');
      const { MinutaController } = await import('./minuta/minuta.controller');
      const { ActaInicioController } = await import(
        './acta_inicio/acta_inicio.controller'
      );
      const { ActaInicioMockController } = await import(
        './acta_inicio/mock/acta_inicio_mock.controller'
      );
      const modulo = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      expect(modulo.get(AppController)).toBeDefined();
      expect(modulo.get(MinutaController)).toBeDefined();
      expect(modulo.get(ActaInicioController)).toBeDefined();
      if (conMock) {
        expect(modulo.get(ActaInicioMockController)).toBeDefined();
      } else {
        expect(() => modulo.get(ActaInicioMockController)).toThrow();
      }
      await modulo.close();
    },
  );
});
