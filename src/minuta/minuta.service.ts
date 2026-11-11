import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plantillas, RECURSOS_CRUD } from './conf';
import { environment } from 'src/environments/environment';
import axios from 'axios';
import { RespuestaMinutaDto } from './dto/respuesta-minuta.dto';
import { ServicioNoDisponibleError } from './servicio-no-disponible.error';

// Marcador de los datos que todavía no existen (por ejemplo, el número de
// contrato antes de quedar suscrito).
export const MARCADOR_FALTANTE = 'XXXXXXX';

// Datos sin los cuales no se genera la minuta: si falta alguno se responde 422
// sin documento. El representante no es obligatorio (persona natural). La
// plantilla no configurada responde antes con 404.
export const CAMPOS_OBLIGATORIOS_MINUTA = [
  'contratista',
  'ordenador',
  'vigencia',
  'clausulas',
  'plantilla',
] as const;

export type CampoObligatorioMinuta =
  (typeof CAMPOS_OBLIGATORIOS_MINUTA)[number];

// Nombres de los servicios que se reportan cuando uno no responde
export const SERVICIOS_MINUTA = {
  crud: 'gestion_contractual_crud',
  mid: 'gestion_contractual_mid',
  parametros: 'parametros_crud',
  proveedores: 'proveedores_mid',
  ordenadores: 'ordenador_supervisor_mid',
  clausulas: 'clausulas_paragrafos_crud',
  renderizadoHtml: 'plantillas_mid (paso 1: HTML)',
  renderizadoPdf: 'plantillas_mid (paso 2: PDF)',
} as const;

@Injectable()
export class MinutaService {
  constructor(private configService: ConfigService) {}

  // Realiza una solicitud GET. Devuelve null si el recurso no existe (404) y
  // lanza ServicioNoDisponibleError si el servicio falla, para no confundir
  // una dependencia caída con un dato vacío.
  private async fetchData(url: string, servicio: string): Promise<any> {
    try {
      const { data } = await axios.get(url);
      if (Number(data?.Status) === HttpStatus.NOT_FOUND) return null;
      if (!data?.Success || Number(data.Status) !== HttpStatus.OK) {
        throw new ServicioNoDisponibleError(servicio);
      }
      return data.Data;
    } catch (error: any) {
      if (error instanceof ServicioNoDisponibleError) throw error;
      if (error.response?.status === HttpStatus.NOT_FOUND) return null;
      throw new ServicioNoDisponibleError(servicio);
    }
  }

  // Envía una solicitud POST. Cualquier fallo es del servicio que la recibe.
  private async postData(
    url: string,
    body: any,
    servicio: string,
  ): Promise<any> {
    try {
      const { data } = await axios.post(url, body);
      if (
        !data?.Success ||
        Number(data.Status) !== HttpStatus.OK ||
        !data.Data
      ) {
        throw new ServicioNoDisponibleError(servicio);
      }
      return data.Data;
    } catch (error: any) {
      if (error instanceof ServicioNoDisponibleError) throw error;
      throw new ServicioNoDisponibleError(servicio);
    }
  }

  // Sobre de respuesta: Status lleva el resultado y Data solo va con el PDF
  private respuesta(
    Status: number,
    Message: string,
    Data?: string,
  ): RespuestaMinutaDto {
    const respuesta: RespuestaMinutaDto = {
      Success: Status === HttpStatus.OK,
      Status,
      Message,
    };
    if (Data !== undefined) respuesta.Data = Data;
    return respuesta;
  }

  // Id del contrato como entero positivo, o null si no lo es
  private idValido(id: unknown): number | null {
    const texto = String(id ?? '').trim();
    if (!/^\d+$/.test(texto)) return null;
    const numero = Number(texto);
    return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
  }

  // Campos obligatorios ausentes, en el orden de CAMPOS_OBLIGATORIOS_MINUTA
  private camposFaltantes(
    presentes: Record<CampoObligatorioMinuta, boolean>,
  ): CampoObligatorioMinuta[] {
    return CAMPOS_OBLIGATORIOS_MINUTA.filter((campo) => !presentes[campo]);
  }

  // Función general para el procesamiento de la minuta
  async obtenerMinuta(idContrato: unknown): Promise<RespuestaMinutaDto> {
    const id = this.idValido(idContrato);
    if (id === null) {
      return this.respuesta(
        HttpStatus.BAD_REQUEST,
        'El id del contrato debe ser un entero positivo',
      );
    }

    try {
      // Contrato general
      const contratoMid = await this.obtenerContratoGeneralMid(id);
      if (!contratoMid) {
        return this.respuesta(
          HttpStatus.NOT_FOUND,
          'Contrato general no encontrado',
        );
      }

      // Plantilla
      const plantilla_id = this.obtenerIdPlantilla(contratoMid);
      if (!plantilla_id) {
        return this.respuesta(HttpStatus.NOT_FOUND, 'Plantilla no encontrada');
      }

      // Datos iniciales
      const [
        vigencia,
        ordenadorArgoId,
        clausulas,
        especificaciones,
        contratista,
      ] = await Promise.all([
        this.obtenerVigencia(contratoMid.vigencia_id),
        this.obtenerOrdenadorArgoId(id),
        this.obtenerPlantillaClausulas(id),
        this.obtenerEspecificaciones(contratoMid),
        this.obtenerContratista(contratoMid.proveedor_numero_documento),
      ]);
      const ordenador = await this.obtenerOrdenador(ordenadorArgoId);

      const faltantes = this.camposFaltantes({
        contratista: Boolean(contratista?.proveedor),
        ordenador: Boolean(ordenador),
        vigencia: Boolean(vigencia),
        clausulas: Array.isArray(clausulas) && clausulas.length > 0,
        plantilla: Boolean(plantilla_id),
      });
      if (faltantes.length > 0) {
        return this.respuesta(
          HttpStatus.UNPROCESSABLE_ENTITY,
          `Faltan datos: ${faltantes.join(', ')}`,
        );
      }

      const amparos = contratoMid.aplica_poliza ? this.obtenerAmparos() : null;
      const datosIniciales = this.obtenerDatosIniciales({
        contratoMid,
        vigencia,
        contratista,
        ordenador,
        especificaciones,
        amparos,
        clausulas,
      });

      const html = await this.renderizarHTML(plantilla_id, datosIniciales);

      // Datos finales
      const pdf = await this.renderizarPDF(datosIniciales, html);

      return this.respuesta(HttpStatus.OK, 'Minuta generada exitosamente', pdf);
    } catch (error: any) {
      if (error instanceof ServicioNoDisponibleError) {
        return this.respuesta(HttpStatus.BAD_GATEWAY, error.message);
      }
      return this.respuesta(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error al generar la minuta',
      );
    }
  }

  // Asignación de datos iniciales
  private obtenerDatosIniciales(data: any) {
    // Desestructuración
    const {
      numero_contrato,
      justificacion,
      modalidad_seleccion,
      fecha_suscripcion_estudios,
      perfil_contratista,
    } = data.contratoMid || {};

    const { proveedor, representante } = data.contratista || {};
    const {
      nombre_completo_proveedor,
      tipo_persona,
      numero_documento,
      ciudad_expedicion_documento,
    } = proveedor || {};

    const {
      nombre_ordenador,
      documento,
      nombre_ciudad,
      rol_nombre,
      info_resolucion,
    } = data.ordenador || {};

    // Combinacion de los datos
    let datos: any = {
      contrato_numero: numero_contrato || MARCADOR_FALTANTE,
      vigencia: data.vigencia,
      ordenador_nombre: nombre_ordenador || MARCADOR_FALTANTE,
      ordenador_cedula: documento || MARCADOR_FALTANTE,
      ordenador_lugar_exp: nombre_ciudad || MARCADOR_FALTANTE,
      ordenador_cargo: rol_nombre || MARCADOR_FALTANTE,
      ordenador_resolucion: info_resolucion || MARCADOR_FALTANTE,
      contratista_nombre: nombre_completo_proveedor || MARCADOR_FALTANTE,
      contratista_tipo_persona: tipo_persona || MARCADOR_FALTANTE,
      contratista_numero_documento: numero_documento || MARCADOR_FALTANTE,
      contratista_lugar_exp: ciudad_expedicion_documento || MARCADOR_FALTANTE,
      justificacion: justificacion || MARCADOR_FALTANTE,
      modalidad_seleccion_tipo: modalidad_seleccion || MARCADOR_FALTANTE,
      fecha_suscripcion_estudios:
        fecha_suscripcion_estudios || MARCADOR_FALTANTE,
      perfil_profesional: this.esPerfilProfesional(perfil_contratista),
    };

    if (representante) {
      const datosRepresentante = this.obtenerRepresentante(representante);
      datos = { ...datos, ...datosRepresentante };
    }

    if (data.especificaciones) {
      datos.especificaciones = data.especificaciones;
    }

    if (data.amparos) {
      datos.amparos = data.amparos; // Falta
    }

    if (data.clausulas) {
      datos.clausulas = data.clausulas;
    }

    return datos;
  }

  // Plantilla por unidad ejecutora y tipo de contrato
  private obtenerIdPlantilla(contrato: any) {
    const { unidad_ejecutora_id, tipo_contrato_id } = contrato;
    return plantillas?.[unidad_ejecutora_id]?.[tipo_contrato_id];
  }

  // Identificar si un perfil es profesional o no
  private esPerfilProfesional(perfilContratista: string): boolean {
    const perfilesProfesionales = ['Profesional', 'Asesor'];
    if (perfilContratista) {
      return perfilesProfesionales.some((perfilProfesional) =>
        perfilContratista.includes(perfilProfesional),
      );
    }
    return false;
  }

  // Formatear número a moneda colombiana
  private formatearAPesosColombianos(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Especificaciones con valores formateados (si aplica)
  private async obtenerEspecificaciones(contrato: any) {
    const tiposContrato = [
      environment.TIPOS_DE_CONTRATO.ORDEN_DE_COMPRA,
      environment.TIPOS_DE_CONTRATO.ORDEN_DE_SERVICIO,
    ];
    if (tiposContrato.includes(contrato.tipo_contrato_id)) {
      const especificacionesTecnicas =
        await this.obtenerEspecificacionesTecnicas(contrato.id);
      return this.formatearEspecificaciones(especificacionesTecnicas);
    }
    return null;
  }

  // Formatear y obtener valores de reemplazo de las especificaciones
  // (sin especificaciones registradas devuelve una lista vacía)
  private formatearEspecificaciones(especificaciones: any) {
    if (!Array.isArray(especificaciones)) return [];
    return especificaciones.map((especificacion: any) => ({
      descripcion: especificacion.descripcion,
      cantidad: especificacion.cantidad,
      valor_unitario: this.formatearAPesosColombianos(
        especificacion.valor_unitario,
      ),
      valor_total: this.formatearAPesosColombianos(especificacion.valor_total),
    }));
  }

  // Información del representante
  private obtenerRepresentante(representante: any) {
    // Desestructuración
    const {
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
      numero_documento,
      ciudad_expedicion_documento,
    } = representante || {};

    return {
      representante_nombre:
        [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido]
          .filter(Boolean)
          .join(' ') || MARCADOR_FALTANTE, // Unir nombres y apellidos
      representante_numero_documento: numero_documento || MARCADOR_FALTANTE,
      representante_lugar_exp: ciudad_expedicion_documento || MARCADOR_FALTANTE,
    };
  }

  // Información de un contrato general por su id (id's y valores)
  private async obtenerContratoGeneralMid(idContrato: number): Promise<any> {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_MID')}contratos-generales/${idContrato}?ids=true`;
    return this.fetchData(url, SERVICIOS_MINUTA.mid);
  }

  // Año de la vigencia: el contrato guarda el Id del parámetro (tipo 121)
  private async obtenerVigencia(vigenciaId: number): Promise<string | null> {
    if (!vigenciaId) return null;
    const url = `${this.configService.get<string>('PARAMETROS_CRUD')}parametro/${vigenciaId}`;
    const data = await this.fetchData(url, SERVICIOS_MINUTA.parametros);
    return data?.Nombre ?? null;
  }

  // Información del contratista (Persona natural) o contratista y representante (Persona juridica)
  private async obtenerContratista(documentoContratista: string) {
    if (!documentoContratista) return null;
    const url = `${this.configService.get<string>('PROVEEDORES_MID')}contratistas?id=${documentoContratista}`;
    return this.fetchData(url, SERVICIOS_MINUTA.proveedores);
  }

  // Id de argo del ordenador asociado a un contrato general
  // (el registro activo más reciente; un arreglo vacío es que no hay ordenador)
  private async obtenerOrdenadorArgoId(idContrato: number) {
    const query = `query=contrato_general_id.id:${idContrato},activo:true&sortby=fecha_creacion,id&order=desc&limit=1`;
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}${RECURSOS_CRUD.ordenador}/?${query}`;
    const data = await this.fetchData(url, SERVICIOS_MINUTA.crud);
    return Array.isArray(data) ? data[0]?.ordenador_argo_id : undefined;
  }

  // Información del ordenador (Argo)
  private async obtenerOrdenador(idArgo: number) {
    if (!idArgo) return null;
    const url = `${this.configService.get<string>('ORDENADORES_SUPERVISORES_CONTRATACION_MID')}ordenadores/${idArgo}`;
    return this.fetchData(url, SERVICIOS_MINUTA.ordenadores);
  }

  // Clausulas asociadas al id de un contrato general (contiene variables {{}} a reemplazar)
  private async obtenerPlantillaClausulas(idContrato: number) {
    const url = `${this.configService.get<string>('CLAUSULAS_PARAGRAFOS_CRUD')}contratos/${idContrato}`;
    return this.fetchData(url, SERVICIOS_MINUTA.clausulas);
  }

  // Lista de amparos
  // X -> Petición para obtener lista de amparos
  private obtenerAmparos() {
    return [];
  }

  // Lista de especificaciones técnicas asociadas al id de un contrato general
  private async obtenerEspecificacionesTecnicas(idContrato: number) {
    const query = `query=contrato_general_id.id:${idContrato},activo:true&limit=0`;
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}${RECURSOS_CRUD.especificacionTecnica}/?${query}`;
    return this.fetchData(url, SERVICIOS_MINUTA.crud);
  }

  // Generación de HTML con datos iniciales
  private async renderizarHTML(plantilla_id: string, datos: any) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-html`;
    return this.postData(
      url,
      { plantilla_id, data: datos },
      SERVICIOS_MINUTA.renderizadoHtml,
    );
  }

  // Generación de minuta con datos finales
  private async renderizarPDF(datos: any, html: string) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-pdf`;
    return this.postData(
      url,
      { data: datos, html },
      SERVICIOS_MINUTA.renderizadoPdf,
    );
  }
}
