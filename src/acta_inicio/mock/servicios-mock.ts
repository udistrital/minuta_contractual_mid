import { Logger } from '@nestjs/common';
import axios, { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import {
  DEPENDENCIAS_MOCK,
  ESCENARIOS_MOCK,
  EscenarioMock,
  PARAMETROS_MOCK,
  PROVEEDORES_SUPERVISORES_MOCK,
} from './datos-mock';
import {
  definirDocumentoMock,
  generarPdfMock,
  obtenerPlantillaDeHtml,
  renderizarHtmlMock,
} from './plantillas-mock';

// Respuestas simuladas del CRUD, los MID, Parámetros, Plantillas y el Gestor
// Documental. Con ACTA_INICIO_MOCK=true se instalan como adaptador de axios, así
// el servicio del acta de inicio corre sin cambios. Lo que se genera (actas,
// documentos, estados y archivos) queda en memoria hasta reiniciar.
// Si PLANTILLAS_MID tiene una URL, el PDF se pide al plantillas_mid real; si no
// responde, se usa el render local.

export const SERVICIOS_MOCK = [
  'GESTION_CONTRACTUAL_CRUD',
  'GESTION_CONTRACTUAL_MID',
  'PROVEEDORES_MID',
  'PLANTILLAS_MID',
  'PARAMETROS_CRUD',
  'GESTOR_DOCUMENTAL_MID',
];

interface Ruta {
  servicio: string;
  partes: string[];
  query: URLSearchParams;
}

const estandar = (Data: any) => ({
  Success: true,
  Status: 200,
  Message: 'Mock',
  Data,
});

function errorHttp(status: number, mensaje: string) {
  const error: any = new Error(`Request failed with status code ${status}`);
  error.response = {
    status,
    data: { Success: false, Status: status, Message: mensaje },
  };
  return error;
}

export class ServiciosMock {
  private readonly logger = new Logger(ServiciosMock.name);
  private estados: Record<number, any>;
  private actas: any[];
  private documentos: any[];
  private archivos: Record<string, string>;
  private secuencia: number;

  // bases: URL base de cada servicio (clave de entorno -> URL)
  constructor(private readonly bases: Record<string, string>) {
    this.reiniciar();
  }

  reiniciar() {
    this.estados = Object.fromEntries(
      Object.entries(ESCENARIOS_MOCK).map(([id, escenario]) => [
        id,
        { ...escenario.estadoActual },
      ]),
    );
    this.actas = [];
    this.documentos = [];
    this.archivos = {};
    this.secuencia = 1000;
  }

  // Adaptador de axios que responde con los datos simulados
  crearAdaptador(adaptadorReal: AxiosAdapter): AxiosAdapter {
    return async (config: InternalAxiosRequestConfig) => {
      const url = axios.getUri(config);
      const metodo = (config.method ?? 'get').toLowerCase();
      const body =
        typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const plantillasReal = this.bases.PLANTILLAS_MID;

      if (plantillasReal && url.startsWith(plantillasReal)) {
        try {
          return await adaptadorReal({ ...config, timeout: 20000 });
        } catch (error) {
          this.logger.warn(
            `plantillas_mid no respondió (${error.message}); se usa el render local`,
          );
        }
      }

      const ruta = this.parsear(url);
      const data =
        metodo === 'get'
          ? this.resolverGet(ruta)
          : metodo === 'put'
            ? this.resolverPut(ruta, body)
            : await this.resolverPost(ruta, body);
      return { data, status: 200, statusText: 'OK', headers: {}, config };
    };
  }

  private parsear(url: string): Ruta {
    const servicio = Object.keys(this.bases).find(
      (clave) => this.bases[clave] && url.startsWith(this.bases[clave]),
    );
    if (!servicio) throw errorHttp(404, `URL fuera del mock: ${url}`);
    const [ruta, query] = url.substring(this.bases[servicio].length).split('?');
    return {
      servicio,
      partes: ruta.split('/').filter(Boolean),
      query: new URLSearchParams(query ?? ''),
    };
  }

  private escenario(id: number | string): EscenarioMock {
    const escenario = ESCENARIOS_MOCK[Number(id)];
    if (!escenario) throw errorHttp(404, `Contrato ${id} no existe en el mock`);
    return escenario;
  }

  private resolverGet({ servicio, partes, query }: Ruta): any {
    const [recurso, segundo, tercero, cuarto] = partes;

    switch (servicio) {
      case 'GESTION_CONTRACTUAL_MID':
        if (recurso === 'contratos-generales' && segundo) {
          return estandar(this.escenario(segundo).contrato);
        }
        if (recurso === 'supervisores' && segundo === 'contrato') {
          const supervisores = this.escenario(tercero).supervisoresDetalle;
          if (!supervisores.length) throw errorHttp(404, 'Sin supervisores');
          return estandar(supervisores);
        }
        if (recurso === 'espacios-fisicos' && segundo === 'dependencias-sede') {
          return estandar(DEPENDENCIAS_MOCK[+tercero] ?? []);
        }
        if (recurso === 'polizas') {
          const filtro = JSON.parse(query.get('query') ?? '{}');
          return estandar(this.escenario(filtro.contrato_general_id).polizas);
        }
        break;

      case 'GESTION_CONTRACTUAL_CRUD':
        if (recurso === 'contratos-generales' && segundo) {
          return estandar(this.escenario(segundo).contrato);
        }
        if (recurso === 'actas-inicio' && !segundo) {
          return this.actas;
        }
        if (segundo === 'contrato' && tercero) {
          return this.consultaPorContrato(recurso, +tercero, cuarto);
        }
        break;

      case 'PROVEEDORES_MID':
        if (recurso === 'contratistas') {
          const documento = query.get('id');
          const supervisor = PROVEEDORES_SUPERVISORES_MOCK[documento];
          if (supervisor) {
            return estandar({
              proveedor: { numero_documento: documento, ...supervisor },
            });
          }
          const escenario = Object.values(ESCENARIOS_MOCK).find(
            (item) => item.contratista.numero_documento === documento,
          );
          if (!escenario) throw errorHttp(404, 'Proveedor no encontrado');
          const { proveedor, representante } = escenario.contratista;
          return estandar({ proveedor, representante: representante ?? null });
        }
        break;

      case 'PARAMETROS_CRUD':
        if (recurso === 'parametro' && segundo) {
          const parametro = PARAMETROS_MOCK[+segundo];
          if (!parametro) throw errorHttp(404, 'Parámetro no encontrado');
          return estandar(parametro);
        }
        if (recurso === 'parametro') {
          const consulta = (query.get('query') ?? '').toLowerCase();
          const nombre = /nombre__icontains:([^,]+)/.exec(consulta)?.[1];
          return estandar(
            Object.values(PARAMETROS_MOCK).filter(
              (parametro) =>
                !nombre || parametro.Nombre.toLowerCase().includes(nombre),
            ),
          );
        }
        break;
    }
    throw errorHttp(
      404,
      `Ruta mock no definida: GET ${servicio}/${partes.join('/')}`,
    );
  }

  private consultaPorContrato(recurso: string, id: number, extra?: string) {
    const escenario = this.escenario(id);
    switch (recurso) {
      case 'contratistas':
        return estandar({
          contrato_general_id: id,
          numero_documento: escenario.contratista.numero_documento,
        });
      case 'disponibilidad_presupuestal':
        return estandar(escenario.cdps);
      case 'lugares-ejecucion':
        return escenario.lugaresEjecucion[0] ?? null;
      case 'estados-contrato':
        if (extra === 'actual') return this.estados[id];
        break;
      case 'documentos-contratos':
        return this.documentos.filter(
          (documento) => documento.contrato_general_id === id,
        );
    }
    throw errorHttp(
      404,
      `Ruta mock no definida: GET ${recurso}/contrato/${id}`,
    );
  }

  private resolverPut({ servicio, partes }: Ruta, body: any) {
    if (
      servicio === 'GESTION_CONTRACTUAL_CRUD' &&
      partes[0] === 'actas-inicio'
    ) {
      const acta = this.actas.find((item) => item.id === +partes[1]);
      if (!acta) throw errorHttp(404, 'Acta de inicio no encontrada');
      return Object.assign(acta, body, { fecha_modificacion: new Date() });
    }
    throw errorHttp(404, `Ruta mock no definida: PUT ${partes.join('/')}`);
  }

  private async resolverPost({ servicio, partes }: Ruta, body: any) {
    const ruta = partes.join('/');

    if (servicio === 'PLANTILLAS_MID' && ruta === 'plantilla/renderizar-html') {
      return estandar(renderizarHtmlMock(body.plantilla_id, body.data));
    }
    if (servicio === 'PLANTILLAS_MID' && ruta === 'plantilla/renderizar-pdf') {
      const plantillaId = obtenerPlantillaDeHtml(body.html);
      return estandar(
        await generarPdfMock(definirDocumentoMock(plantillaId, body.data)),
      );
    }

    if (servicio === 'GESTOR_DOCUMENTAL_MID' && ruta === 'document/upload') {
      const id = this.secuencia++;
      const enlace = `mock-${id}`;
      this.archivos[enlace] = body[0].file;
      return { Status: '200', res: { Id: id, Enlace: enlace } };
    }

    if (servicio === 'GESTION_CONTRACTUAL_CRUD') {
      const ahora = new Date();
      const registro = {
        ...body,
        id: this.secuencia++,
        activo: true,
        fecha_creacion: ahora,
        fecha_modificacion: ahora,
      };
      switch (ruta) {
        case 'documentos-contratos':
          this.documentos.push(registro);
          return registro;
        case 'actas-inicio':
          this.actas.push(registro);
          return registro;
        case 'estados-contrato':
          this.estados[body.contrato_general_id] = {
            ...registro,
            actual: true,
          };
          return registro;
      }
    }
    throw errorHttp(404, `Ruta mock no definida: POST ${servicio}/${ruta}`);
  }
}
