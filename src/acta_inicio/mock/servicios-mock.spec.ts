import axios, { AxiosAdapter } from 'axios';
import { ServiciosMock } from './servicios-mock';
import { ESCENARIOS_MOCK } from './datos-mock';

// Rutas del adaptador simulado que el flujo del acta no usa
describe('ServiciosMock', () => {
  const bases = {
    GESTION_CONTRACTUAL_CRUD: 'http://crud/',
    GESTION_CONTRACTUAL_MID: 'http://mid/',
    PROVEEDORES_MID: 'http://proveedores/',
    PLANTILLAS_MID: 'http://plantillas/',
    PARAMETROS_CRUD: 'http://parametros/',
    GESTOR_DOCUMENTAL_MID: 'http://gestor/',
  };
  let adapter: AxiosAdapter;

  beforeEach(() => {
    adapter = new ServiciosMock(bases).crearAdaptador(() =>
      Promise.reject(new Error('sin conexión en pruebas')),
    );
  });

  const estado = (promesa: Promise<any>) =>
    promesa.then(
      (respuesta) => respuesta.status,
      (error) => error.response?.status,
    );

  it('usa la respuesta del plantillas_mid real cuando responde', async () => {
    const real = new ServiciosMock(bases).crearAdaptador(async (config) => ({
      data: 'respuesta real',
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const { data } = await axios.post(
      'http://plantillas/plantilla/renderizar-html',
      {},
      { adapter: real },
    );
    expect(data).toBe('respuesta real');
  });

  it('responde el contrato desde el CRUD', async () => {
    const { data } = await axios.get('http://crud/contratos-generales/9001', {
      adapter,
    });
    expect(data.Data.id).toBe(9001);
  });

  it.each([
    'http://otro-servicio/ruta',
    'http://crud/contratos-generales/1234',
    'http://mid/otra-ruta',
    'http://crud/otra-ruta',
    'http://crud/otra-ruta/contrato/9001',
    'http://crud/estados-contrato/contrato/9001',
    'http://proveedores/otra-ruta',
    'http://parametros/otra-ruta',
  ])('GET %s responde 404', async (url) => {
    expect(await estado(axios.get(url, { adapter }))).toBe(404);
  });

  it('responde por GET si la petición no trae método', async () => {
    const { data } = await adapter({
      url: 'http://crud/contratos-generales/9001',
      headers: {},
    } as any);
    expect(data.Data.id).toBe(9001);
  });

  it('responde listas vacías o 404 cuando faltan datos', async () => {
    const { data } = await axios.get(
      'http://mid/espacios-fisicos/dependencias-sede/99999',
      { adapter },
    );
    expect(data.Data).toEqual([]);
    const { data: parametros } = await axios.get(
      'http://parametros/parametro',
      {
        adapter,
      },
    );
    expect(parametros.Data.length).toBeGreaterThan(0);
    for (const url of [
      'http://mid/polizas',
      'http://proveedores/contratistas?id=1',
      'http://parametros/parametro/1',
    ]) {
      expect(await estado(axios.get(url, { adapter }))).toBe(404);
    }
  });

  it('responde 404 si el contrato no tiene supervisores', async () => {
    ESCENARIOS_MOCK[7777] = {
      ...ESCENARIOS_MOCK[9001],
      supervisoresDetalle: [],
    };
    try {
      expect(
        await estado(
          axios.get('http://mid/supervisores/contrato/7777', { adapter }),
        ),
      ).toBe(404);
    } finally {
      delete ESCENARIOS_MOCK[7777];
    }
  });

  it('actualiza un acta registrada y responde 404 en otras rutas PUT y POST', async () => {
    const { data: acta } = await axios.post(
      'http://crud/actas-inicio',
      { descripcion: 'Acta' },
      { adapter },
    );
    const { data: actualizada } = await axios.put(
      `http://crud/actas-inicio/${acta.id}`,
      { descripcion: 'Acta actualizada' },
      { adapter },
    );
    expect(actualizada.descripcion).toBe('Acta actualizada');
    expect(
      await estado(axios.put('http://crud/actas-inicio/1', {}, { adapter })),
    ).toBe(404);
    expect(
      await estado(axios.put('http://crud/otra-ruta/1', {}, { adapter })),
    ).toBe(404);
    expect(
      await estado(axios.post('http://crud/otra-ruta', {}, { adapter })),
    ).toBe(404);
  });
});
