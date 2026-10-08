import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ActaPolizaService } from './acta_poliza.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const ok = (Data: any) => ({ data: { Success: true, Status: 200, Data } });

const contrato = {
  id: 10,
  objeto: 'Objeto',
  valor_pesos: 1000000,
  plazo_ejecucion: 6,
  unidad_ejecucion_id: 180,
  unidad_ejecutora_id: 6818,
  tipo_contrato_id: 6537,
};
const polizaOk = {
  id: 5,
  numero_poliza: 'P-1',
  entidad_aseguradora_id: 1,
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
  fecha_expedicion: '2026-01-02',
};
const amparoOk = {
  id: 7,
  poliza_id: 5,
  amparo: 'Cumplimiento',
  valor: 100,
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
};

// Enruta cada GET según la URL; los POST devuelven html y luego pdf
// `opciones.caidos`: fragmentos de URL cuyo servicio simula estar caído
// `opciones.sinDocumento`: el contrato no tiene contratista registrado
// `opciones.proveedor`: respuesta de proveedores_mid (por defecto, un contratista)
function mockServicios(
  poliza: any,
  amparos: any[],
  opciones: { caidos?: string[]; sinDocumento?: boolean; proveedor?: any } = {},
) {
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (opciones.caidos?.some((fragmento) => url.includes(fragmento)))
      throw new Error('ECONNREFUSED');
    if (url.includes('contratos-generales/')) return ok(contrato);
    if (url.includes('contratistas/contrato/'))
      return opciones.sinDocumento
        ? { data: { Success: false, Status: 404, Message: 'no encontrado' } }
        : ok({ numero_documento: 123 });
    if (url.includes('parametro/'))
      return {
        data: { Success: true, Status: '200', Data: { Nombre: 'MESES' } },
      };
    if (url.includes('polizas?query')) return ok(poliza ? [poliza] : []);
    if (url.includes('amparos-contratos/')) return ok(amparos);
    if (url.includes('contratistas?id='))
      return ok(
        'proveedor' in opciones
          ? opciones.proveedor
          : { proveedor: { nombre_completo_proveedor: 'Contratista' } },
      );
    throw new Error(`URL no mockeada: ${url}`);
  });
  mockedAxios.post
    .mockResolvedValueOnce(ok('<html></html>'))
    .mockResolvedValueOnce(ok('PDF_BASE64'));
}

describe('ActaPolizaService', () => {
  let service: ActaPolizaService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActaPolizaService,
        {
          provide: ConfigService,
          useValue: { get: (k: string) => `http://${k}/` },
        },
      ],
    }).compile();

    service = module.get<ActaPolizaService>(ActaPolizaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('genera el PDF con póliza y amparos consistentes', async () => {
    mockServicios(polizaOk, [amparoOk]);
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.OK);
    expect((res as any).Data).toBe('PDF_BASE64');
    const bodyHtml = mockedAxios.post.mock.calls[0][1] as any;
    expect(bodyHtml.data.entidad_aseguradora).toBe('Seguros del Estado');
    expect(bodyHtml.data.amparos).toHaveLength(1);
    expect(bodyHtml.data.plazo_ejecucion).toBe('6 Mes(es)');
  });

  it('incluye contratista y objeto del contrato en los datos de la plantilla', async () => {
    mockServicios(polizaOk, [amparoOk]);
    await service.obtenerActaPoliza(10);
    const bodyHtml = mockedAxios.post.mock.calls[0][1] as any;
    expect(bodyHtml.data.nombre_contratista).toBe('Contratista');
    expect(bodyHtml.data.objeto_contrato).toBe('Objeto');
  });

  it('consulta la póliza a través del MID, no del CRUD', async () => {
    mockServicios(polizaOk, [amparoOk]);
    await service.obtenerActaPoliza(10);
    const urls = mockedAxios.get.mock.calls.map((c) => c[0] as string);
    const urlPoliza = urls.find((u) => u.includes('polizas?query'));
    expect(urlPoliza).toContain('GESTION_CONTRACTUAL_MID');
  });

  it('404 si el contrato no tiene contratista', async () => {
    mockServicios(polizaOk, [amparoOk], { sinDocumento: true });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.NOT_FOUND);
    expect(res.Message).toContain('Contratista no encontrado');
    expect(mockedAxios.get).not.toHaveBeenCalledWith(
      expect.stringContaining('contratistas?id='),
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('404 si proveedores no tiene datos del contratista', async () => {
    mockServicios(polizaOk, [amparoOk], { proveedor: {} });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.NOT_FOUND);
    expect(res.Message).toContain('Contratista no encontrado');
  });

  it('502 si el MID de amparos está caído, no "sin amparos vinculados"', async () => {
    mockServicios(polizaOk, [amparoOk], { caidos: ['amparos-contratos/'] });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_GATEWAY);
    expect(res.Message).toContain('amparos');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('502 si parámetros está caído, no genera plazo sin unidad', async () => {
    mockServicios(polizaOk, [amparoOk], { caidos: ['parametro/'] });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_GATEWAY);
    expect(res.Message).toContain('parametros_crud');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('502 si proveedores está caído', async () => {
    mockServicios(polizaOk, [amparoOk], { caidos: ['contratistas?id='] });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_GATEWAY);
    expect(res.Message).toContain('proveedores_mid');
  });

  it('502 si el MID de pólizas está caído, no "póliza no encontrada"', async () => {
    mockServicios(polizaOk, [amparoOk], { caidos: ['polizas?query'] });
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('404 si el contrato no tiene póliza', async () => {
    mockServicios(null, []);
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.NOT_FOUND);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('400 si no hay amparos vinculados a la póliza', async () => {
    mockServicios(polizaOk, [{ ...amparoOk, poliza_id: 99 }]);
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.Message).toContain('sin amparos vinculados');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('400 si la vigencia de la póliza es inválida', async () => {
    mockServicios({ ...polizaOk, fecha_fin: '2025-01-01' }, [amparoOk]);
    const res = await service.obtenerActaPoliza(10);
    expect(res.Status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.Message).toContain('vigencia inválida');
  });

  it('borrador: usa las filas enviadas aunque no estén vinculadas a la póliza', async () => {
    mockServicios(polizaOk, [{ ...amparoOk, poliza_id: null }]);
    const res = await service.obtenerActaPoliza(10, [{ id: 7, valor: 250 }]);
    expect(res.Status).toBe(HttpStatus.OK);
    const bodyHtml = mockedAxios.post.mock.calls[0][1] as any;
    expect(bodyHtml.data.amparos).toHaveLength(1);
    expect(bodyHtml.data.amparos[0].valor_asegurado).toContain('250');
  });

  it('borrador: 400 si no se envía ninguna fila de amparo', async () => {
    mockServicios(polizaOk, [{ ...amparoOk, poliza_id: null }]);
    const res = await service.obtenerActaPoliza(10, []);
    expect(res.Status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.Message).toContain('sin amparos vinculados');
  });
});
