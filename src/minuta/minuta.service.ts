import { Injectable, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plantillas } from './conf';
import { environment } from 'src/environments/environment';
import axios from 'axios';

@Injectable()
export class MinutaService {
  constructor(private configService: ConfigService) {}

  // Función general para el procesamiento de la minuta
  async obtenerMinuta(idContrato: number) {
    try {
      // Contrato general
      const [contratoCrud, contratoMid] = await Promise.all([
        this.obtenerContratoGeneralCrud(idContrato),
        this.obtenerContratoGeneralMid(idContrato),
      ]);
      if (!contratoCrud || !contratoMid) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Contrato general no encontrado`,
        };
      }

      // Plantilla
      const plantilla_id = this.obtenerIdPlantilla(contratoCrud);
      if (!plantilla_id) {
        return {
          Success: false,
          Status: HttpStatus.NOT_FOUND,
          Message: `Plantilla no encontrada`,
        };
      }

      // Datos iniciales
      const [documentoProveedor, ordenadorArgoId, clausulas] =
        await Promise.all([
          this.obtenerDocumento(idContrato),
          this.obtenerOrdenadorArgoId(idContrato),
          this.obtenerPlantillaClausulas(idContrato),
        ]);
      const contratista = await this.obtenerContratista(documentoProveedor);
      const ordenador = await this.obtenerOrdenador(ordenadorArgoId);
      const amparos = contratoMid.aplica_poliza ? this.obtenerAmparos() : null;
      const especificaciones = await this.obtenerEspecificaciones(contratoCrud);
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
  async obtenerDatosIniciales(data: any) {
    // Desestructuración
    const {
      vigencia,
      modalidad_seleccion_id,
      fecha_suscripcion_estudios,
      perfil_contratista_id,
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
      modalidad_seleccion_tipo: modalidad_seleccion_id || 'XXXXXXX',
      fecha_suscripcion_estudios: fecha_suscripcion_estudios || 'XXXXXXX',
      perfil_profesional: this.esPerfilProfesional(perfil_contratista_id),
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
  obtenerIdPlantilla(contrato: any) {
    const unidadEjecutoraId = contrato.unidad_ejecutora_id;
    const tipoContratoId = contrato.tipo_contrato_id;
    return plantillas?.[unidadEjecutoraId]?.[tipoContratoId];
  }

  // Identificar si un perfil es profesional o no
  esPerfilProfesional(perfilContratista: string): boolean {
    const perfilesProfesionales = ['Profesional', 'Asesor'];
    if (perfilContratista) {
      return perfilesProfesionales.some((perfilProfesional) =>
        perfilContratista.includes(perfilProfesional),
      );
    } else {
      return false;
    }
  }

  // Formatear número a moneda colombiana
  formatearAPesosColombianos(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Formatear y obtener valores de reemplazo de las especificaciones
  formatearEspecificaciones(especificaciones: any) {
    return especificaciones.map((especificacion) => ({
      descripcion: especificacion.descripcion,
      cantidad: especificacion.cantidad,
      valor_unitario: this.formatearAPesosColombianos(
        especificacion.valor_unitario,
      ),
      valor_total: this.formatearAPesosColombianos(especificacion.valor_total),
    }));
  }

  // Información del representante
  obtenerRepresentante(representante: any) {
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

  // Información de un contrato general por su id (strings)
  async obtenerContratoGeneralCrud(idContrato: number): Promise<any> {
    try {
      const urlGestionContractualCrud: string = this.configService.get<string>(
        'GESTION_CONTRACTUAL_CRUD',
      );

      const url = `${urlGestionContractualCrud}/contratos-generales/${idContrato}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Información de un contrato general por su id (id's)
  async obtenerContratoGeneralMid(idContrato: number): Promise<any> {
    try {
      const urlGestionContractualMid: string = this.configService.get<string>(
        'GESTION_CONTRACTUAL_MID',
      );

      const url = `${urlGestionContractualMid}/contratos-generales/${idContrato}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Número de documento del contratista asociado a un contrato general
  async obtenerDocumento(idContrato: number): Promise<any> {
    try {
      const urlGestionContractualCrud: string = this.configService.get<string>(
        'GESTION_CONTRACTUAL_CRUD',
      );

      const url = `${urlGestionContractualCrud}/contratistas/contrato/${idContrato}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data?.numero_documento;
    } catch (error) {
      return null;
    }
  }

  // Información del contratista (Persona natural) o contratista y representante (Persona juridica)
  async obtenerContratista(documentoContratista: number) {
    try {
      const urlProveedoresMid: string =
        this.configService.get<string>('PROVEEDORES_MID');

      const url = `${urlProveedoresMid}/contratistas?id=${documentoContratista}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Id de argo del ordenador asociado a un contrato general
  async obtenerOrdenadorArgoId(idContrato: number) {
    try {
      const urlGestionContractualCrud: string = this.configService.get<string>(
        'GESTION_CONTRACTUAL_CRUD',
      );

      const url = `${urlGestionContractualCrud}/ordenador-contrato/contrato/${idContrato}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data?.ordenador_argo_id;
    } catch (error) {
      return null;
    }
  }

  // Información del ordenador (Argo)
  async obtenerOrdenador(idArgo: number) {
    try {
      const urlOrdenadoresSupervisoresMId: string =
        this.configService.get<string>(
          'ORDENADORES_SUPERVISORES_CONTRATACION_MID',
        );

      const url = `${urlOrdenadoresSupervisoresMId}/ordenadores/${idArgo}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Clausulas asociadas al id de un contrato general (contiene variables {{}} a reemplazar)
  async obtenerPlantillaClausulas(idContrato: number) {
    try {
      const urlClausulasParagrafosCrud: string = this.configService.get<string>(
        'CLAUSULAS_PARAGRAFOS_CRUD',
      );

      const url = `${urlClausulasParagrafosCrud}/contratos/${idContrato}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Lista de amparos
  // X -> Petición para obtener lista de amparos
  obtenerAmparos() {
    return [];
  }

  // Especificaciones con valores formateados (si aplica)
  async obtenerEspecificaciones(contrato: any) {
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

  // Lista de especificaciones técnicas asociadas al id de un contrato general
  async obtenerEspecificacionesTecnicas(idContrato: number) {
    try {
      const urlGestionContractualCrud: string = this.configService.get<string>(
        'GESTION_CONTRACTUAL_CRUD',
      );

      const url = `${urlGestionContractualCrud}/especificaciones-tecnicas?limit=0&query={"activo":true,"contrato_general_id":${idContrato}}`;
      const { data } = await axios.get<any>(url);

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Generación de HTML con datos iniciales
  async renderizarHTML(plantilla_id: string, datos: any) {
    try {
      const urlPlantillasMid: string =
        this.configService.get<string>('PLANTILLAS_MID');
      const url = `${urlPlantillasMid}/plantilla/renderizar-html`;
      const { data } = await axios.post<any>(url, { plantilla_id, datos });

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }

  // Generación de minuta con datos finales
  async renderizarPDF(datos: any, html: string) {
    try {
      const urlPlantillasMid: string =
        this.configService.get<string>('PLANTILLAS_MID');

      const url = `${urlPlantillasMid}/plantilla/renderizar-pdf`;
      const { data } = await axios.post<any>(url, { datos, html });

      if (!data.Success || data.Status != '200') {
        return null;
      }

      return data.Data;
    } catch (error) {
      return null;
    }
  }
}
