// main.ts arranca la API al importarlo: se simulan Nest, Swagger y la escritura
// de los archivos de swagger para no levantar un servidor ni tocar el disco
jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));
jest.mock('@nestjs/core', () => ({ NestFactory: { create: jest.fn() } }));
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('main', () => {
  const puertoOriginal = process.env.PORT;

  afterEach(() => {
    process.env.PORT = puertoOriginal;
  });

  const arrancar = async (puerto?: string) => {
    jest.resetModules();
    if (puerto === undefined) delete process.env.PORT;
    else process.env.PORT = puerto;

    const { NestFactory } = await import('@nestjs/core');
    const { SwaggerModule } = await import('@nestjs/swagger');
    const fs = await import('fs');
    const app = {
      useGlobalPipes: jest.fn(),
      enableCors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as jest.Mock).mockResolvedValue(app);
    jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({ openapi: '3.0.0' } as any);
    jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);

    await import('./main');
    await new Promise((resolver) => setImmediate(resolver));
    return { app, fs, SwaggerModule };
  };

  it('arranca con Swagger, validación y CORS en el puerto del .env', async () => {
    const { app, fs, SwaggerModule } = await arrancar('3001');
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'swagger',
      app,
      expect.anything(),
    );
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    expect(app.useGlobalPipes).toHaveBeenCalled();
    expect(app.enableCors).toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith(3001);
  });

  it('sin PORT usa el puerto 8080', async () => {
    const { app } = await arrancar();
    expect(app.listen).toHaveBeenCalledWith(8080);
  });
});
