import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plantillas } from './conf';
import { environment } from 'src/environments/environment';
import axios from 'axios';

@Injectable()
export class MinutaService {
  constructor(private configService: ConfigService) {}

  // Realiza una solicitud GET
  private async fetchData(url: string): Promise<any> {
    try {
      const { data } = await axios.get(url);
      if (!data.Success || data.Status !== 200) return null;
      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Enviar una solicitud POST
  private async postData(url: string, body: any): Promise<any> {
    try {
      const { data } = await axios.post(url, body);
      if (!data.Success || data.Status !== '200') return null;
      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Función general para el procesamiento de la minuta
  async obtenerMinuta(idContrato: number) {
    try {
      // Contrato general
      const contratoMid = await this.obtenerContratoGeneralMid(idContrato);
      if (!contratoMid) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Contrato general no encontrado`,
        };
      }

      // Plantilla
      const plantilla_id = this.obtenerIdPlantilla(contratoMid);
      if (!plantilla_id) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Plantilla no encontrada`,
        };
      }

      // Datos iniciales
      const [documentoProveedor, ordenadorArgoId, clausulas, especificaciones] =
        await Promise.all([
          this.obtenerDocumento(idContrato),
          this.obtenerOrdenadorArgoId(idContrato),
          this.obtenerPlantillaClausulas(9512),
          this.obtenerEspecificaciones(contratoMid),
        ]);
      const [contratista, ordenador] = await Promise.all([
        this.obtenerContratista(documentoProveedor),
        this.obtenerOrdenador(ordenadorArgoId),
      ]);
      const amparos = contratoMid.aplica_poliza ? this.obtenerAmparos() : null;
      const datosIniciales = await this.obtenerDatosIniciales({
        contratoMid,
        contratista,
        ordenador,
        especificaciones,
        amparos,
        clausulas,
      });

      console.log(datosIniciales);
      
      const html = await this.renderizarHTML(plantilla_id, datosIniciales);

      // Datos finales
      const pdf = await this.renderizarPDF({}, html);
      if (!pdf) {
        return {
          Success: false,
          Status: HttpStatus.INTERNAL_SERVER_ERROR,
          Message: `Error al obtener minuta`,
        };
      }

      return {
        Success: true,
        Status: HttpStatus.OK,
        Message: 'Minuta generada exitosamente',
        Data: pdf,
      };
    } catch (error) {
      return {
        Success: false,
        Status: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        Message: error.message || 'Error al obtener minuta',
      };
    }
  }

  // Asignación de datos iniciales
  private async obtenerDatosIniciales(data: any) {
    // Desestructuración
    const {
      vigencia,
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
      contrato_numero: 'XXXXXXX', // Valor faltante
      vigencia: vigencia || 'XXXXXXX',
      ordenador_nombre: nombre_ordenador || 'XXXXXXX',
      ordenador_cedula: documento || 'XXXXXXX',
      ordenador_lugar_exp: nombre_ciudad || 'XXXXXXX',
      ordenador_cargo: rol_nombre || 'XXXXXXX',
      ordenador_resolucion: info_resolucion || 'XXXXXXX',
      contratista_nombre: nombre_completo_proveedor || 'XXXXXXX',
      contratista_tipo_persona: tipo_persona || 'XXXXXXX',
      contratista_numero_documento: numero_documento || 'XXXXXXX',
      contratista_lugar_exp: ciudad_expedicion_documento || 'XXXXXXX',
      justificacion: 'XXXXXXX', // Valor faltante
      modalidad_seleccion_tipo: modalidad_seleccion || 'XXXXXXX',
      fecha_suscripcion_estudios: fecha_suscripcion_estudios || 'XXXXXXX',
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
  private formatearEspecificaciones(especificaciones: any) {
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
          .join(' ') || 'XXXXXXX', // Unir nombres y apellidos
      representante_numero_documento: numero_documento || 'XXXXXXX',
      representante_lugar_exp: ciudad_expedicion_documento || 'XXXXXXX',
    };
  }

  // Información de un contrato general por su id (id's y valores)
  private async obtenerContratoGeneralMid(idContrato: number): Promise<any> {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_MID')}contratos-generales/${idContrato}?ids=true`;    
    return this.fetchData(url);
  }

  // Número de documento del contratista asociado a un contrato general
  private async obtenerDocumento(idContrato: number): Promise<any> {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}contratistas/contrato/${idContrato}`;
    const data = await this.fetchData(url);
    return data?.numero_documento;
  }

  // Información del contratista (Persona natural) o contratista y representante (Persona juridica)
  private async obtenerContratista(documentoContratista: number) {
    const url = `${this.configService.get<string>('PROVEEDORES_MID')}contratistas?id=${documentoContratista}`;
    return this.fetchData(url);
  }

  // Id de argo del ordenador asociado a un contrato general
  private async obtenerOrdenadorArgoId(idContrato: number) {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}ordenador-contrato/contrato/${idContrato}`;
    const data = await this.fetchData(url);
    return data?.ordenador_argo_id;
  }

  // Información del ordenador (Argo)
  private async obtenerOrdenador(idArgo: number) {
    const url = `${this.configService.get<string>('ORDENADORES_SUPERVISORES_CONTRATACION_MID')}ordenadores/${idArgo}`;
    return this.fetchData(url);
  }

  // Clausulas asociadas al id de un contrato general (contiene variables {{}} a reemplazar)
  private async obtenerPlantillaClausulas(idContrato: number) {
    const url = `${this.configService.get<string>('CLAUSULAS_PARAGRAFOS_CRUD')}contratos/${idContrato}`;
    return this.fetchData(url);
  }

  // Lista de amparos
  // X -> Petición para obtener lista de amparos
  private obtenerAmparos() {
    return [];
  }

  // Lista de especificaciones técnicas asociadas al id de un contrato general
  private async obtenerEspecificacionesTecnicas(idContrato: number) {
    const url = `${this.configService.get<string>('GESTION_CONTRACTUAL_CRUD')}especificaciones-tecnicas`;
    const base = `limit=0&query={"activo":true,"contrato_general_id":${idContrato}}`;
    return this.fetchData(`${url}?${base}`);
  }

  // Generación de HTML con datos iniciales
  private async renderizarHTML(plantilla_id: string, datos: any) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-html`;
    return this.postData(url, { plantilla_id, datos });
  }

  // Generación de minuta con datos finales
  private async renderizarPDF(datos: any, html: string) {
    const url = `${this.configService.get<string>('PLANTILLAS_MID')}plantilla/renderizar-pdf`;
    return this.postData(url, { datos, html });
  }
}
